// سيد الحقيقة — Socket.io client wrapper
// Connects to the Socket.io mini-service on port 3003 via gateway.
// Frontend must use: io('/?XTransformPort=3003') per environment rules.

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/",
      transports: ["websocket", "polling"],
      query: { XTransformPort: "3003" },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
