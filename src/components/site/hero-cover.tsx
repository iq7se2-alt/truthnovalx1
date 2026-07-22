"use client";

import { useRef, useState } from "react";

/**
 * HeroCover — displays the novel cover with a subtle 3D perspective tilt
 * that follows the mouse. Client component (needs mouse events).
 */
export function HeroCover({ coverUrl, alt }: { coverUrl: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    // Max ±8 degrees
    const rotateY = (dx / (rect.width / 2)) * 8;
    const rotateX = -(dy / (rect.height / 2)) * 8;
    setTilt({ x: rotateX, y: rotateY });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div className="order-1 flex justify-center md:justify-start">
      <div className="relative">
        {/* glow */}
        <div className="absolute -inset-4 rounded-lg bg-gradient-to-b from-gold/20 via-purple/10 to-transparent blur-2xl" />
        <div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="gold-card relative aspect-[3/4] w-64 overflow-hidden rounded-md sm:w-72 md:w-80"
          style={{
            transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 0.15s ease-out",
          }}
        >
          <img
            src={coverUrl}
            alt={alt}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 right-0 left-0 p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">
              Lord of the Truth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
