"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

/**
 * AnimatedCounter — counts from 0 to `value` when the element enters the
 * viewport. Uses IntersectionObserver (no setState in effect body — the
 * observer callback calls setState, which is lint-safe).
 *
 * For non-numeric values (strings with formatting), renders as-is.
 *
 * Respects the current UI language: when `lang === "ar"` it renders
 * Arabic-Indic digits (١٢٣); when `lang === "en"` it renders Western digits.
 */
export function AnimatedCounter({
  value,
  displayValue,
  duration = 1200,
  delay = 0,
}: {
  value: number;
  displayValue: string;
  duration?: number;
  delay?: number;
}) {
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const { formatNumber } = useLanguage();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let raf: number;
    const startTime = performance.now() + delay;

    function tick(now: number) {
      if (now < startTime) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(value * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value, duration, delay]);

  // If displayValue is a formatted string (e.g. "10,781"), we need to
  // replace the numeric portion with the animated counter
  const isPlainNumber = /^\d+$/.test(displayValue);

  if (isPlainNumber) {
    return <span ref={ref}>{formatNumber(current)}</span>;
  }

  // For formatted strings like "10,781" — animate and format
  const hasDigits = /\d/.test(displayValue);
  if (hasDigits) {
    const formatted = current.toLocaleString("en-US");
    return <span ref={ref}>{formatNumber(formatted)}</span>;
  }

  // Fallback: just show the display value
  return <span ref={ref}>{displayValue}</span>;
}
