"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Crystal Ball (كرة البلورة التفاعلية)
 *
 * A floating crystal ball in the bottom-left corner. Click to open a chat
 * interface with "the Sage" — an AI character from the novel who answers
 * questions from inside the crystal ball.
 *
 * Connects to mini-service on port 3003 via WebSocket.
 * URL: io("/?XTransformPort=3003") (Caddy forwards via query param).
 */

type Message = {
  role: "user" | "sage";
  text: string;
  streaming?: boolean;
};

export function CrystalBall() {
  const [open, setOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "sage",
      text: "أرى في البلورة... مسافراً يطلب الحقيقة. اسأل، يا ابن القانون.",
    },
  ]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Connect to WebSocket
  useEffect(() => {
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("thinking", (data: { state: boolean }) => {
      setThinking(data.state);
    });

    socket.on("response-chunk", (data: { chunk: string; full: string }) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "sage" && last.streaming) {
          return [...prev.slice(0, -1), { ...last, text: data.full }];
        }
        return [...prev, { role: "sage", text: data.full, streaming: true }];
      });
    });

    socket.on("response", (data: { text: string; done?: boolean; error?: boolean }) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "sage" && last.streaming) {
          return [...prev.slice(0, -1), { role: "sage", text: data.text }];
        }
        return [...prev, { role: "sage", text: data.text }];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const send = () => {
    const q = input.trim();
    if (!q || thinking) return;
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    socketRef.current?.emit("ask", { question: q });
  };

  return (
    <>
      {/* Floating crystal ball button */}
      <div
        className={cn(
          "crystal-ball-container",
          thinking && "thinking"
        )}
        onClick={() => setOpen((o) => !o)}
        title="كرة البلورة — اسأل الحكيم"
      >
        <div className="crystal-ball">
          <div className="crystal-ball-smoke" />
        </div>
        {!open && (
          <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-[10px] text-gold animate-pulse">
            <Sparkles className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-32 left-6 z-50 w-[min(22rem,calc(100vw-3rem))] animate-float-in">
          <div className="overflow-hidden rounded-2xl border border-gold/30 bg-background/95 shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gold/20 bg-gradient-to-r from-purple/10 to-gold/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="crystal-ball" style={{ width: "1.5rem", height: "1.5rem", animation: "none" }} />
                <div>
                  <h3 className="font-naskh text-sm font-bold text-gold">الحكيم</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {thinking ? "يكشف الغبار الذهبي..." : "كرة البلورة نشطة"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-gold"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="max-h-[20rem] min-h-[12rem] overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm font-naskh",
                      msg.role === "user"
                        ? "bg-muted text-foreground rounded-bl-sm"
                        : "bg-gradient-to-br from-purple/20 to-gold/20 border border-gold/20 text-foreground rounded-br-sm"
                    )}
                    dir="rtl"
                  >
                    {msg.text}
                    {msg.streaming && (
                      <span className="mr-1 inline-block h-3 w-1 animate-pulse bg-gold align-middle" />
                    )}
                  </div>
                </div>
              ))}
              {thinking && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm border border-gold/20 bg-gradient-to-br from-purple/20 to-gold/20 px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/60" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/60" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/60" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gold/20 p-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="اسأل الحكيم..."
                  disabled={thinking}
                  className="flex-1 rounded-lg border border-gold/20 bg-background px-3 py-2 text-sm font-naskh focus:border-gold/50 focus:outline-none disabled:opacity-50"
                  dir="rtl"
                />
                <button
                  onClick={send}
                  disabled={thinking || !input.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-[#1a0a00] transition-colors hover:bg-gold-soft disabled:opacity-50"
                >
                  <Send className="h-4 w-4 rotate-180" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                تجيب كرة البلورة بحكمة من عالم الرواية
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
