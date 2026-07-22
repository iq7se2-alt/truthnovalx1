// سيد الحقيقة — Socket.io mini-service for Interactive Mode
// Listens on port 3003 (hardcoded). Frontend connects via gateway:
//   io("/?XTransformPort=3003")
//
// NOTE on routing: Socket.io is configured with path: "/" (required by the
// gateway/Caddy routing rule and by the frontend socket-client.ts).
// Engine.IO with path "/" would intercept ALL HTTP requests, which would
// prevent our /broadcast and /health endpoints from working. To support
// both Socket.io traffic AND plain HTTP endpoints on the same port, we
// install a request dispatcher after the Socket.io server attaches:
//   - requests with `?EIO=` or `?transport=` query params → Engine.IO
//   - everything else → our HTTP handler (/health, /broadcast, 404)
// WebSocket upgrade requests are handled by Engine.IO directly via the
// `upgrade` event and are not affected by the `request` dispatcher.

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { Server, type Socket } from "socket.io";

// ---------- Types ----------
interface ActiveUser {
  chapterId: string;
  userId: string;
  nickname: string;
}

interface JoinChapterPayload {
  chapterId: string;
  userId: string;
  nickname: string;
}

interface LeaveChapterPayload {
  chapterId: string;
}

interface WordClaimedPayload {
  chapterId: string;
  wordIndex: number;
  wordText: string;
  tier: string;
  color: string;
  styleId: string;
  nickname: string;
  userId: string;
}

interface WordReleasedPayload {
  chapterId: string;
  wordIndex: number;
}

interface BroadcastPayload {
  room: string;
  event: string;
  data?: unknown;
}

// ---------- State ----------
// Tracks active users per socket: socketId -> { chapterId, userId, nickname }
const activeUsers = new Map<string, ActiveUser>();

const roomName = (chapterId: string) => `chapter-${chapterId}`;

/**
 * Count readers currently in a chapter room, based on activeUsers map.
 * (Sockets only appear in activeUsers if they have joined a chapter.)
 */
function countReadersInChapter(chapterId: string): number {
  let count = 0;
  for (const user of activeUsers.values()) {
    if (user.chapterId === chapterId) count++;
  }
  return count;
}

/** Broadcast the current reader count for a chapter to its room. */
function broadcastReaderCount(io: Server, chapterId: string): void {
  const count = countReadersInChapter(chapterId);
  io.to(roomName(chapterId)).emit("reader-count", { chapterId, count });
}

// ---------- HTTP request handler (for /health and /broadcast) ----------
async function handleHttpRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // GET /health — simple liveness probe
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "socket-server",
        port: PORT,
        activeUsers: activeUsers.size,
      })
    );
    return;
  }

  // POST /broadcast — lets Next.js API routes trigger room broadcasts
  // after they perform DB writes.
  if (req.method === "POST" && req.url === "/broadcast") {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      let body: BroadcastPayload;
      try {
        body = JSON.parse(raw) as BroadcastPayload;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }

      if (!body || !body.room || !body.event) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ ok: false, error: "Missing 'room' or 'event'" })
        );
        return;
      }

      io.to(body.room).emit(body.event, body.data ?? null);

      console.log(
        `[broadcast] room=${body.room} event=${body.event} data=${JSON.stringify(
          body.data
        )}`
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error("[broadcast] error:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
      }
    }
    return;
  }

  // Default: 404 — but respond so callers know the server is alive.
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: false,
      error: "Not found",
      endpoints: ["GET /health", "POST /broadcast"],
    })
  );
}

// ---------- HTTP server (placeholder handler; will be overridden below) ----------
const httpServer = createServer((req, res) => {
  // This initial handler is replaced by the dispatcher after Socket.io attaches.
  void handleHttpRequest(req, res);
});

// ---------- Socket.io server ----------
const io = new Server(httpServer, {
  // DO NOT change the path — gateway (Caddy) uses it to route traffic by
  // ?XTransformPort query param, and the frontend socket-client.ts uses path: "/".
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ---------- Request dispatcher ----------
// Engine.IO with path: "/" intercepts every HTTP request. We replace its
// listener with our own router that forwards Engine.IO traffic (requests
// containing the EIO or transport query params) to the original listener,
// and handles everything else as a plain HTTP request.
const engineRequestListeners = httpServer.listeners("request").slice(0) as Array<
  (req: IncomingMessage, res: ServerResponse) => void
>;
httpServer.removeAllListeners("request");
httpServer.on("request", (req: IncomingMessage, res: ServerResponse) => {
  try {
    const urlStr = req.url || "/";
    // Quick check without full URL parse for performance.
    const isEngineIO =
      urlStr.includes("EIO=") || urlStr.includes("transport=");

    if (isEngineIO) {
      for (const listener of engineRequestListeners) {
        listener.call(httpServer, req, res);
      }
      return;
    }

    // Plain HTTP endpoint.
    void handleHttpRequest(req, res);
  } catch (err) {
    console.error("[http] dispatcher error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
    }
  }
});

// ---------- Socket.io event handlers ----------
io.on("connection", (socket: Socket) => {
  console.log(`[socket] connected id=${socket.id}`);

  // a) join-chapter
  socket.on("join-chapter", (payload: JoinChapterPayload) => {
    try {
      if (!payload || !payload.chapterId) {
        socket.emit("error", { message: "join-chapter requires chapterId" });
        return;
      }
      const { chapterId, userId, nickname } = payload;
      const room = roomName(chapterId);

      // Leave previous chapter if the socket had joined one
      const prev = activeUsers.get(socket.id);
      if (prev && prev.chapterId !== chapterId) {
        socket.leave(roomName(prev.chapterId));
        activeUsers.delete(socket.id);
        broadcastReaderCount(io, prev.chapterId);
      }

      socket.join(room);
      activeUsers.set(socket.id, {
        chapterId,
        userId: userId ?? "anonymous",
        nickname: nickname ?? "قارئ مجهول",
      });

      console.log(
        `[socket] join-chapter id=${socket.id} chapterId=${chapterId} nickname=${nickname}`
      );

      broadcastReaderCount(io, chapterId);
    } catch (err) {
      console.error("[socket] join-chapter error:", err);
      socket.emit("error", { message: (err as Error).message });
    }
  });

  // b) leave-chapter
  socket.on("leave-chapter", (payload: LeaveChapterPayload) => {
    try {
      if (!payload || !payload.chapterId) {
        socket.emit("error", { message: "leave-chapter requires chapterId" });
        return;
      }
      const { chapterId } = payload;
      const room = roomName(chapterId);

      socket.leave(room);

      const prev = activeUsers.get(socket.id);
      if (prev && prev.chapterId === chapterId) {
        activeUsers.delete(socket.id);
      }

      console.log(
        `[socket] leave-chapter id=${socket.id} chapterId=${chapterId}`
      );
      broadcastReaderCount(io, chapterId);
    } catch (err) {
      console.error("[socket] leave-chapter error:", err);
      socket.emit("error", { message: (err as Error).message });
    }
  });

  // c) word-claimed — re-broadcast as "word-update" to the chapter room
  socket.on("word-claimed", (payload: WordClaimedPayload) => {
    try {
      if (!payload || !payload.chapterId) {
        socket.emit("error", { message: "word-claimed requires chapterId" });
        return;
      }
      const room = roomName(payload.chapterId);
      console.log(
        `[socket] word-claimed id=${socket.id} chapterId=${
          payload.chapterId
        } wordIndex=${payload.wordIndex} tier=${payload.tier} nickname=${
          payload.nickname
        }`
      );
      // Emit to everyone in the room (including sender) for consistent state.
      io.to(room).emit("word-update", payload);
    } catch (err) {
      console.error("[socket] word-claimed error:", err);
      socket.emit("error", { message: (err as Error).message });
    }
  });

  // d) word-released — re-broadcast as "word-removed" to the chapter room
  socket.on("word-released", (payload: WordReleasedPayload) => {
    try {
      if (!payload || !payload.chapterId) {
        socket.emit("error", { message: "word-released requires chapterId" });
        return;
      }
      const room = roomName(payload.chapterId);
      console.log(
        `[socket] word-released id=${socket.id} chapterId=${payload.chapterId} wordIndex=${payload.wordIndex}`
      );
      io.to(room).emit("word-removed", payload);
    } catch (err) {
      console.error("[socket] word-released error:", err);
      socket.emit("error", { message: (err as Error).message });
    }
  });

  socket.on("error", (err: Error) => {
    console.error(`[socket] socket error id=${socket.id}:`, err);
  });

  // disconnect — clean up tracking and broadcast updated reader count
  socket.on("disconnect", (reason: string) => {
    const prev = activeUsers.get(socket.id);
    if (prev) {
      activeUsers.delete(socket.id);
      console.log(
        `[socket] disconnected id=${socket.id} chapterId=${prev.chapterId} nickname=${prev.nickname} reason=${reason}`
      );
      broadcastReaderCount(io, prev.chapterId);
    } else {
      console.log(`[socket] disconnected id=${socket.id} reason=${reason}`);
    }
  });
});

// ---------- Start ----------
const PORT = 3003; // hardcoded — DO NOT read from env
httpServer.listen(PORT, () => {
  console.log(`[socket-server] listening on port ${PORT}`);
  console.log(`[socket-server] HTTP endpoints:`);
  console.log(`[socket-server]   GET  /health`);
  console.log(`[socket-server]   POST /broadcast { room, event, data }`);
  console.log(`[socket-server] socket.io events (path: "/"):`);
  console.log(`[socket-server]   join-chapter   -> reader-count`);
  console.log(`[socket-server]   leave-chapter  -> reader-count`);
  console.log(`[socket-server]   word-claimed   -> word-update`);
  console.log(`[socket-server]   word-released  -> word-removed`);
});

// ---------- Graceful shutdown ----------
function shutdown(signal: string): void {
  console.log(`[socket-server] received ${signal}, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[socket-server] closed");
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
