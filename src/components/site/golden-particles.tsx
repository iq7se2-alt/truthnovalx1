"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Golden particles floating slowly upward — ambient cinematic background
 * for the reader. Only rendered in dark / cinematic themes. Canvas is fixed,
 * full-viewport, non-interactive (pointer-events: none) and sits behind all
 * other content (z-index 0).
 *
 * Performance:
 *   - 40 particles max (within the 30–50 spec)
 *   - Single requestAnimationFrame loop, throttled by the browser when the
 *     tab is hidden (we also short-circuit the draw call on document.hidden)
 *   - Respects prefers-reduced-motion: draws a single static frame and never
 *     schedules another RAF tick
 *
 * Hydration-safe via useSyncExternalStore: server snapshot is `false`, so the
 * canvas is not rendered during SSR. The client snapshot reads the live
 * documentElement.className and re-renders whenever the theme changes
 * (MutationObserver on the class attribute).
 */

const PARTICLE_COUNT = 40;
const GOLD_COLORS = ["#d4b05e", "#e8a317", "#f0d98a", "#b8941f"];

type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number; // upward pixels per frame
  swayAmplitude: number;
  swayPhase: number;
  swaySpeed: number;
  color: string;
  opacity: number;
};

function makeParticle(w: number, h: number, randomY: boolean): Particle {
  return {
    x: Math.random() * w,
    y: randomY ? Math.random() * h : h + 10,
    size: 1 + Math.random() * 2, // 1–3px
    speed: 0.15 + Math.random() * 0.3,
    swayAmplitude: 5 + Math.random() * 15,
    swayPhase: Math.random() * Math.PI * 2,
    swaySpeed: 0.005 + Math.random() * 0.01,
    color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
    opacity: 0.2 + Math.random() * 0.4,
  };
}

// ===== Theme subscription (hydration-safe) =====

function subscribeTheme(cb: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getThemeSnapshot(): boolean {
  if (typeof document === "undefined") return false;
  const cls = document.documentElement.className;
  return cls.includes("dark") || cls.includes("cinematic");
}

function getThemeServerSnapshot(): boolean {
  return false;
}

// ===== Component =====

export function GoldenParticles() {
  const visible = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle animation loop
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let particles: Particle[] = [];
    let raf = 0;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initParticles() {
      if (!canvas) return;
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(makeParticle(canvas.width, canvas.height, true));
      }
    }

    function drawFrame() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        const swayX = Math.sin(p.swayPhase) * p.swayAmplitude;
        ctx.beginPath();
        ctx.arc(p.x + swayX, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        if (!prefersReduced) {
          p.y -= p.speed;
          p.swayPhase += p.swaySpeed;
          if (p.y < -10) {
            // Reset to bottom
            p.x = Math.random() * canvas.width;
            p.y = canvas.height + 10;
            p.swayPhase = Math.random() * Math.PI * 2;
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function tick() {
      // Tab hidden — skip drawing (RAF is auto-throttled by browser anyway)
      if (!document.hidden) {
        drawFrame();
      }
      if (!prefersReduced) {
        raf = requestAnimationFrame(tick);
      }
    }

    function onResize() {
      resize();
      initParticles();
      drawFrame();
    }

    resize();
    initParticles();
    // Draw one frame immediately (covers both reduced-motion and the first
    // visible frame), then start the loop if motion is allowed.
    drawFrame();
    if (!prefersReduced) {
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="golden-particles-canvas"
      aria-hidden="true"
    />
  );
}
