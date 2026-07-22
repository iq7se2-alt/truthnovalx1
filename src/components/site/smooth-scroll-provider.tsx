"use client";

import { useEffect, ReactNode } from "react";
import Lenis from "lenis";

/**
 * SmoothScrollProvider — wraps the app with Lenis smooth scrolling.
 * 
 * Lenis provides butter-smooth scrolling. Cursor trail effect REMOVED
 * per user request (was laggy, user wants normal mouse).
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // ─── Lenis smooth scroll ───
    const lenis = new Lenis({
      duration: 1.0, // slightly faster than 1.2
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <>{children}</>;
}
