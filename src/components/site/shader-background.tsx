"use client";

import { useEffect, useRef } from "react";

/**
 * ShaderBackground — animated fluid gradient background.
 * 
 * Uses canvas 2D to draw a flowing, organic gradient that shifts
 * colors slowly over time. Inspired by to-portfolio.com's shader
 * backgrounds but lightweight (no WebGL needed).
 * 
 * Renders as a fixed full-screen layer behind all content (z-index: -1).
 * Colors shift between gold, purple, and deep blue — matching the
 * novel's cosmic theme.
 */
export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    // Color blobs that drift around
    const blobs = [
      { x: 0.2, y: 0.3, r: 0.4, color: [212, 176, 94], speed: 0.0003, phase: 0 }, // gold
      { x: 0.8, y: 0.7, r: 0.35, color: [100, 50, 200], speed: 0.0004, phase: 2 }, // purple
      { x: 0.5, y: 0.5, r: 0.3, color: [30, 60, 120], speed: 0.0002, phase: 4 }, // deep blue
      { x: 0.3, y: 0.8, r: 0.25, color: [180, 100, 50], speed: 0.0005, phase: 1 }, // warm
    ];

    let frame = 0;
    const animate = () => {
      frame++;
      const time = frame * 0.01;

      // Dark base
      ctx.fillStyle = "#0a0608";
      ctx.fillRect(0, 0, width, height);

      // Draw blobs with radial gradients
      for (const blob of blobs) {
        const cx = (blob.x + Math.sin(time * blob.speed * 1000 + blob.phase) * 0.15) * width;
        const cy = (blob.y + Math.cos(time * blob.speed * 1000 + blob.phase * 1.3) * 0.12) * height;
        const radius = blob.r * Math.min(width, height);

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const [r, g, b] = blob.color;
        gradient.addColorStop(0, `rgba(${r},${g},${b},0.15)`);
        gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.05)`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Subtle noise overlay (very light)
      if (frame % 3 === 0) {
        const noiseOpacity = 0.015;
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          ctx.fillStyle = `rgba(255,255,255,${noiseOpacity})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 h-full w-full"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
