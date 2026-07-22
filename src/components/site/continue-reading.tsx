"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { getLastReadChapter } from "@/components/site/scroll-memory";
import { toArabicDigits } from "@/lib/format";

// Hydration-safe store for the last-read chapter number from localStorage.
const listeners = new Set<() => void>();
function subscribeLastRead(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getLastReadSnapshot(): number | null {
  return getLastReadChapter();
}
function getLastReadServerSnapshot(): number | null {
  return null;
}

/**
 * "Where did I stop?" widget — shows the last-read chapter number near the top
 * of the home page so the reader can jump back in with one click.
 */
export function ContinueReading() {
  const chapterNumber = useSyncExternalStore(
    subscribeLastRead,
    getLastReadSnapshot,
    getLastReadServerSnapshot
  );

  if (chapterNumber === null || chapterNumber <= 0) {
    return null;
  }

  return (
    <Link
      href={`/chapters/${chapterNumber}`}
      className="gold-card group mb-6 flex items-center justify-between gap-4 rounded-lg p-5 transition-transform hover:scale-[1.01]"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
          <BookOpen className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wider text-gold/60">
            أين توقفت؟
          </p>
          <p className="mt-0.5 font-naskh text-lg font-bold text-foreground transition-colors group-hover:text-gold">
            تابع قراءة الفصل {toArabicDigits(chapterNumber)}
          </p>
        </div>
      </div>
      <span className="flex items-center gap-1.5 rounded-md border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors group-hover:bg-gold/20">
        متابعة
        <ArrowLeft className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
