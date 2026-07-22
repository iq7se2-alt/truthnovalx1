"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronUp, ListOrdered, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, readMore } from "@/lib/utils";
import {
  formatArabicDate,
  toArabicDigits,
} from "@/lib/format";
import {
  processContentWithCharacters,
  detectDialogueColor,
  getMentionedCharacters,
  type Character,
} from "@/lib/characters";
import { highlightSearchTerm } from "@/lib/search-utils";
import { CommentsSection } from "@/components/site/comments-section";
import { ChapterCharactersStrip } from "@/components/site/chapter-characters-strip";
import { markChapterRead, addReadingTime } from "@/components/site/reading-stats";

type ReaderChapter = {
  id: number;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  views: number;
  createdAt: string;
  coverImageUrl?: string | null;
};

type ChapterLink = { number: number; title: string } | null;

export function CinematicMode({
  chapter,
  prev,
  next,
  fontFamily,
  fontSize,
  lineHeight,
  characters = [],
  searchQuery = "",
}: {
  chapter: ReaderChapter;
  prev: ChapterLink;
  next: ChapterLink;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  characters?: Character[];
  searchQuery?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [visibleWords, setVisibleWords] = useState(0);
  const [fadeComplete, setFadeComplete] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  const paragraphs = chapter.content
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const mentionedCharacters = getMentionedCharacters(chapter.content, characters);
  const totalWords = paragraphs.join(" ").split(/\s+/).length;

  // Track reading
  useEffect(() => {
    markChapterRead(chapter.number);
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(() => {
        if (!document.hidden) addReadingTime(10);
      }, 10000);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    start();
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [chapter.number]);

  // Cinematic word reveal — progressively show words
  useEffect(() => {
    setVisibleWords(0);
    setFadeComplete(false);
    const totalWordsArr = chapter.content.split(/\s+/);
    const total = totalWordsArr.length;
    let current = 0;
    // Reveal in batches for performance
    const batch = Math.max(5, Math.floor(total / 100));
    const interval = setInterval(() => {
      current += batch;
      if (current >= total) {
        current = total;
        clearInterval(interval);
        setFadeComplete(true);
      }
      setVisibleWords(current);
    }, 30); // 30ms per batch ≈ smooth reveal
    return () => clearInterval(interval);
  }, [chapter.content]);

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(100, Math.max(0, (scrollTop / max) * 100)) : 0;
      setProgress(pct);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Build the cinematic content — progressively revealed
  let wordCounter = 0;
  const renderedParagraphs = paragraphs.map((p, paraIdx) => {
    const words = p.split(/(\s+)/);
    const renderedWords = words.map((word, i) => {
      if (/^\s+$/.test(word) || word === "") {
        return <span key={i}>{word}</span>;
      }
      const isVisible = wordCounter < visibleWords;
      wordCounter++;
      return (
        <span
          key={i}
          className={cn(
            "transition-all duration-500",
            isVisible ? "opacity-100 blur-0" : "opacity-0 blur-sm"
          )}
        >
          {word}
        </span>
      );
    });

    return (
      <p key={paraIdx}>
        {renderedWords}
      </p>
    );
  });

  return (
    <div className="relative">
      {/* Cinematic overlay — dim background during reveal */}
      {!fadeComplete && (
        <div className="fixed inset-0 z-30 bg-black/40 transition-opacity duration-1000 pointer-events-none" />
      )}

      {/* Chapter header — cinematic style */}
      <div className="mx-auto max-w-3xl px-4 pt-14 pb-4 text-center sm:px-6">
        <div
          className={cn(
            "transition-all duration-1000",
            fadeComplete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <div className="mb-2 inline-flex items-center gap-2 text-xs text-gold/70">
            <span className="h-px w-8 bg-gold/40" />
            الفصل {toArabicDigits(chapter.number)}
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1
            className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl"
            style={{ fontFamily, textShadow: "0 0 20px rgba(212,176,94,0.3)" }}
          >
            {chapter.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{formatArabicDate(chapter.createdAt)}</span>
            <span className="text-gold/30">•</span>
            <span>{toArabicDigits(chapter.wordCount)} كلمة</span>
            <span className="text-gold/30">•</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {toArabicDigits(chapter.views)}
            </span>
          </div>
          <div className="gold-divider mt-8" />
        </div>
      </div>

      {/* Character portraits */}
      {fadeComplete && mentionedCharacters.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <ChapterCharactersStrip characters={mentionedCharacters} />
        </div>
      )}

      {/* Cinematic article — word-by-word reveal */}
      <article ref={articleRef} className="mx-auto max-w-3xl px-4 pt-8 pb-10 sm:px-6">
        <div
          className="reader-prose cinematic-prose"
          style={{ fontFamily, fontSize, lineHeight }}
        >
          {renderedParagraphs}
        </div>

        {/* End ornament — cinematic fade */}
        {fadeComplete && (
          <div
            className="my-14 text-center"
            style={{ animation: "float-in 1s ease forwards" }}
          >
            <div className="gold-divider mb-6" />
            <p className="font-naskh text-sm text-gold/60">انتهى الفصل</p>
            <div className="mt-4 flex items-center justify-center gap-3 text-gold/40">
              <span className="h-px w-16 bg-gold/30" />
              <span className="text-xl">❖</span>
              <span className="h-px w-16 bg-gold/30" />
            </div>
          </div>
        )}

        {/* Loading indicator during reveal */}
        {!fadeComplete && (
          <div className="my-14 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
            <p className="mt-3 font-naskh text-sm text-gold/50">
              جارٍ العرض...
            </p>
          </div>
        )}

        {/* Bottom navigation */}
        {fadeComplete && (
          <nav className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <CinematicNavCard dir="prev" link={prev} />
            <CinematicNavCard dir="next" link={next} />
          </nav>
        )}

        {/* Utility links */}
        {fadeComplete && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollTop}
              className="border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold"
            >
              <ChevronUp className="ml-1.5 h-4 w-4" />
              للأعلى
            </Button>
            <Link href="/chapters">
              <Button
                variant="outline"
                size="sm"
                className="border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold"
              >
                <ListOrdered className="ml-1.5 h-4 w-4" />
                الفهرس
              </Button>
            </Link>
          </div>
        )}
      </article>

      {/* Comments */}
      {fadeComplete && (
        <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <div className="gold-divider mb-10" />
          <CommentsSection chapterNumber={chapter.number} />
        </div>
      )}

      {/* Cinematic progress bar — at bottom */}
      <div className="fixed bottom-0 right-0 left-0 z-40 h-1 bg-black/50">
        <div
          className="h-full transition-[width] duration-150"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--gold), var(--purple), var(--gold))",
            backgroundSize: "200% 100%",
            animation: "shimmer 3s linear infinite",
          }}
        />
      </div>
    </div>
  );
}

// ─── Cinematic Nav Card ─────────────────────────────────────

function CinematicNavCard({ dir, link }: { dir: "prev" | "next"; link: ChapterLink }) {
  const isPrev = dir === "prev";
  const Icon = isPrev ? ChevronRight : ChevronLeft;
  const label = isPrev ? "الفصل السابق" : "الفصل التالي";

  if (!link) {
    return (
      <div className="gold-card flex-1 rounded-lg p-4 opacity-40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <p className="mt-1 font-naskh text-sm text-muted-foreground">
          لا يوجد فصل {isPrev ? "سابق" : "تالي"}
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/chapters/${link.number}`}
      className={cn(
        "gold-card group flex-1 rounded-lg p-4",
        isPrev ? "text-right" : "text-left"
      )}
    >
      <div className="flex items-center gap-2 text-xs text-gold/70">
        {!isPrev && <span className="mr-auto" />}
        <Icon className="h-4 w-4" />
        {label}
        {isPrev && <span className="ml-auto" />}
      </div>
      <p className="mt-1 font-naskh text-base font-bold text-foreground transition-colors group-hover:text-gold">
        {readMore(link.title, 40)}
      </p>
    </Link>
  );
}
