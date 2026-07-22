"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useTypingEffect — reveals text word-by-word at 0.2s intervals.
 * Only activates when the cinematic theme is active.
 * Returns the number of words to show (0 = nothing yet).
 */
export function useTypingEffect(
  totalWords: number,
  enabled: boolean,
  speedMs: number = 200
): number {
  const [visibleCount, setVisibleCount] = useState(enabled ? 0 : totalWords);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setVisibleCount(totalWords);
      return;
    }

    setVisibleCount(0);
    let current = 0;

    const tick = () => {
      current++;
      setVisibleCount(current);
      if (current < totalWords) {
        rafRef.current = setTimeout(tick, speedMs);
      }
    };

    // Small initial delay so the page renders first
    rafRef.current = setTimeout(tick, 300);

    return () => {
      if (rafRef.current) {
        clearTimeout(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, totalWords, speedMs]);

  return visibleCount;
}

/**
 * TypingText — renders text with word-by-word typing effect.
 * Splits text into words, shows only the first `visibleWords` words.
 * The remaining words are hidden (opacity 0) to preserve layout.
 */
export function TypingText({
  text,
  visibleWords,
  totalWords,
  className,
  style,
}: {
  text: string;
  visibleWords: number;
  totalWords: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Split into words preserving spaces
  const parts = text.split(/(\s+)/);
  let wordCount = 0;
  const rendered = parts.map((part, i) => {
    if (/^\s+$/.test(part) || part === "") {
      return <span key={i}>{part}</span>;
    }
    const isVisible = wordCount < visibleWords;
    wordCount++;
    return (
      <span
        key={i}
        style={{
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.15s ease",
        }}
      >
        {part}
      </span>
    );
  });

  return (
    <span className={className} style={style}>
      {rendered}
    </span>
  );
}
