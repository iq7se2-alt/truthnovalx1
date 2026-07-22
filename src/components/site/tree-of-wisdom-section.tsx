"use client";

import { useState, useEffect } from "react";
import { TreeOfWisdom } from "./tree-of-wisdom";
import { Sparkles } from "lucide-react";

/**
 * Client wrapper for the Tree of Wisdom on the home page.
 * Reads reading progress from localStorage and passes to the 3D tree.
 */
export function TreeOfWisdomSection() {
  const [readCount, setReadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("lord-of-truth-stats");
      if (raw) {
        const stats = JSON.parse(raw);
        if (Array.isArray(stats.readChapters)) {
          setReadCount(stats.readChapters.length);
        }
      }
    } catch {
      // ignore
    }

    // Listen for storage changes (in case reading progress updates in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "lord-of-truth-stats" && e.newValue) {
        try {
          const stats = JSON.parse(e.newValue);
          if (Array.isArray(stats.readChapters)) {
            setReadCount(stats.readChapters.length);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <section className="border-y border-gold/15 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
            <Sparkles className="h-3.5 w-3.5" />
            شجرة الحكمة
          </div>
          <h2 className="font-naskh text-3xl font-bold text-gold-gradient sm:text-4xl">
            ازرع شجرتك بالقراءة
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            كل فصل تقرأه يتركب قطعة ذهبية في شجرتك. كلما قرأت أكثر، نبت الجذع،
            تفرعت الأغصان، وتفتحت ثمار الحكمة.
          </p>
        </div>

        {mounted ? (
          <TreeOfWisdom readCount={readCount} />
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-xl border border-gold/20 bg-muted">
            <div className="animate-pulse text-gold/50">يحمّل...</div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="rounded-lg border border-gold/15 bg-muted/50 p-3">
            <div className="font-bold text-gold">{readCount < 50 ? "بذرة" : readCount < 200 ? "جذع" : readCount < 500 ? "أوراق" : "ثمار"}</div>
            <div className="text-[10px] text-muted-foreground">المرحلة الحالية</div>
          </div>
          <div className="rounded-lg border border-gold/15 bg-muted/50 p-3">
            <div className="font-bold text-gold">{readCount}</div>
            <div className="text-[10px] text-muted-foreground">فصل مقروء</div>
          </div>
          <div className="rounded-lg border border-gold/15 bg-muted/50 p-3">
            <div className="font-bold text-gold">{Math.floor(readCount / 100)}</div>
            <div className="text-[10px] text-muted-foreground">ثمرة حكمة</div>
          </div>
          <div className="rounded-lg border border-gold/15 bg-muted/50 p-3">
            <div className="font-bold text-gold">{2340 - readCount}</div>
            <div className="text-[10px] text-muted-foreground">فصل متبقٍ</div>
          </div>
        </div>
      </div>
    </section>
  );
}
