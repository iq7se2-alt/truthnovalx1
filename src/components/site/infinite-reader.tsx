"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  formatArabicDate,
  toArabicDigits,
} from "@/lib/format";
import type { Character } from "@/lib/characters";
import { getMentionedCharacters } from "@/lib/characters";
import { ChapterCharactersStrip } from "@/components/site/chapter-characters-strip";
import { CommentsSection } from "@/components/site/comments-section";
import { saveScrollPosition } from "@/components/site/scroll-memory";
import {
  ReaderView,
  type ReaderChapter,
  type ChapterLink,
  FONT_SIZES,
  FONT_FAMILIES,
  subscribeSize, getSizeSnapshot, getSizeServerSnapshot,
  subscribeFamily, getFamilySnapshot, getFamilyServerSnapshot,
  ProcessedParagraph,
} from "@/components/site/reader-view";
import { MessageSquare, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════

type ChapterData = ReaderChapter & {
  nextLink: ChapterLink;
  prevLink: ChapterLink;
};

// ═══════════════════════════════════════════════════════════
//  MAIN INFINITE READER
// ═══════════════════════════════════════════════════════════

export function InfiniteReader({
  initialChapter,
  initialNext,
  characters = [],
  searchQuery = "",
}: {
  initialChapter: ReaderChapter;
  initialNext: ChapterLink;
  characters?: Character[];
  searchQuery?: string;
}) {
  // ── Loaded chapters: prevChapters (reversed) + initial + nextChapters ──
  const [nextChapters, setNextChapters] = useState<ChapterData[]>([]);
  const [prevChapters, setPrevChapters] = useState<ChapterData[]>([]);
  const [activeChapter, setActiveChapter] = useState(initialChapter.number);

  // ── Links ──
  const nextLinkRef = useRef<ChapterLink>(initialNext);
  const prevLinkRef = useRef<ChapterLink>(null);
  const isLoadingNextRef = useRef(false);
  const isLoadingPrevRef = useRef(false);
  const [loadingNext, setLoadingNext] = useState(false);

  // ── Refs for scroll management ──
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  // ═══ FETCH NEXT ═══
  const loadNext = useCallback(async () => {
    if (isLoadingNextRef.current) return;
    const link = nextLinkRef.current;
    if (!link) return;
    isLoadingNextRef.current = true;
    setLoadingNext(true);
    try {
      const res = await fetch(`/api/chapters/${link.number}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const ch: ChapterData = {
        ...data.chapter,
        coverImageUrl: data.chapter.coverImageUrl ?? null,
        nextLink: data.next ?? null,
        prevLink: data.prev ?? null,
      };
      setNextChapters(prev => {
        if (prev.some(c => c.number === ch.number)) return prev;
        return [...prev, ch];
      });
      nextLinkRef.current = data.next ?? null;

      // Cleanup: remove chapters more than 2 away from active
      setTimeout(() => cleanupFarChapters(ch.number), 500);
    } catch { /* ignore */ }
    finally { isLoadingNextRef.current = false; setLoadingNext(false); }
  }, []);

  // ═══ FETCH PREV ═══
  const loadPrev = useCallback(async () => {
    if (isLoadingPrevRef.current) return;
    const link = prevLinkRef.current;
    if (!link) return;
    // Don't load if it's the initial chapter (already in the DOM)
    if (link.number === initialChapter.number) {
      prevLinkRef.current = null;
      return;
    }
    // Don't load if already in prevChapters
    if (prevChapters.some(c => c.number === link.number)) return;
    isLoadingPrevRef.current = true;
    const oldScrollY = window.scrollY;
    const oldHeight = document.documentElement.scrollHeight;
    try {
      const res = await fetch(`/api/chapters/${link.number}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const ch: ChapterData = {
        ...data.chapter,
        coverImageUrl: data.chapter.coverImageUrl ?? null,
        nextLink: data.next ?? null,
        prevLink: data.prev ?? null,
      };
      // Double-check after fetch (race condition guard)
      if (ch.number === initialChapter.number) {
        prevLinkRef.current = null;
        return;
      }
      setPrevChapters(prev => {
        if (prev.some(c => c.number === ch.number)) return prev;
        return [ch, ...prev];
      });
      prevLinkRef.current = data.prev ?? null;

      // Restore scroll position
      requestAnimationFrame(() => {
        const newHeight = document.documentElement.scrollHeight;
        window.scrollTo(0, oldScrollY + (newHeight - oldHeight));
      });

      setTimeout(() => cleanupFarChapters(ch.number), 500);
    } catch { /* ignore */ }
    finally { isLoadingPrevRef.current = false; }
  }, [initialChapter.number, prevChapters]);

  // ═══ CLEANUP: keep only ±2 chapters from active ═══
  function cleanupFarChapters(activeNum: number) {
    setNextChapters(prev => prev.filter(c => c.number <= activeNum + 2));
    setPrevChapters(prev => prev.filter(c => c.number >= activeNum - 2));
    // Clean refs
    sectionRefs.current.forEach((_, num) => {
      if (Math.abs(num - activeNum) > 3) sectionRefs.current.delete(num);
    });
  }

  // ═══ FETCH PREV LINK ON MOUNT ═══
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/chapters/${initialChapter.number}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          prevLinkRef.current = data.prev ?? null;
        }
      } catch { /* */ }
    })();
  }, [initialChapter.number]);

  // ═══ INTERSECTION OBSERVERS ═══
  useEffect(() => {
    const bottomObs = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadNext(); },
      { rootMargin: "200px" }
    );
    if (bottomSentinelRef.current) bottomObs.observe(bottomSentinelRef.current);

    const topObs = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadPrev(); },
      { rootMargin: "200px" }
    );
    if (topSentinelRef.current) topObs.observe(topSentinelRef.current);

    return () => { bottomObs.disconnect(); topObs.disconnect(); };
  }, [loadNext, loadPrev]);

  // ═══ ACTIVE CHAPTER DETECTION ═══
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        let best: number | null = null;
        let bestDistance = Infinity;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const num = Number(entry.target.getAttribute("data-chapter-number"));
          const rect = entry.boundingClientRect;
          const elementCenter = rect.top + rect.height / 2;
          const distance = Math.abs(elementCenter - window.innerHeight / 2);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = num;
          }
        }
        if (best !== null && best !== activeChapter) {
          setActiveChapter(best);
          try { window.history.replaceState({}, "", `/chapters/${best}`); } catch {}
          saveScrollPosition(best, window.scrollY);
          document.title = "سيد الحقيقة";
        }
      },
      { threshold: [0, 0.2, 0.5, 0.8, 1] }
    );
    // Observe all chapter sections
    sectionRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [activeChapter, nextChapters.length, prevChapters.length]);

  // ═══ PERIODIC SCROLL SAVE ═══
  useEffect(() => {
    const interval = setInterval(() => {
      saveScrollPosition(activeChapter, window.scrollY);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeChapter]);

  const setSectionRef = useCallback((num: number) => (el: HTMLDivElement | null) => {
    if (el) sectionRefs.current.set(num, el);
    else sectionRefs.current.delete(num);
  }, []);

  // ═══ RENDER ═══
  return (
    <div className="relative">
      {/* Top sentinel (invisible) */}
      <div ref={topSentinelRef} className="h-1" />

      {/* Previous chapters (above initial, oldest first) */}
      {prevChapters.map(ch => (
        <ChapterBlock
          key={ch.number}
          chapter={ch}
          characters={characters}
          searchQuery={searchQuery}
          sectionRef={setSectionRef(ch.number)}
        />
      ))}

      {/* Initial chapter — full ReaderView */}
      <div ref={setSectionRef(initialChapter.number)} data-chapter-number={initialChapter.number}>
        <ReaderView
          chapter={initialChapter}
          prev={null}
          next={null}
          characters={characters}
          searchQuery={searchQuery}
        />
        <ChapterSeparator chapter={initialChapter} />
      </div>

      {/* Next chapters */}
      {nextChapters.map(ch => (
        <div key={ch.number} ref={setSectionRef(ch.number)} data-chapter-number={ch.number}>
          <NextChapterTitle chapter={ch} />
          <ChapterBlock
            chapter={ch}
            characters={characters}
            searchQuery={searchQuery}
            sectionRef={() => {}}
          />
          <ChapterSeparator chapter={ch} />
        </div>
      ))}

      {/* Bottom sentinel (invisible) */}
      <div ref={bottomSentinelRef} className="h-1" />
      {loadingNext && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  CHAPTER BLOCK — content for appended/prepended chapters
// ═══════════════════════════════════════════════════════════

function ChapterBlock({
  chapter,
  characters,
  searchQuery,
  sectionRef,
}: {
  chapter: ChapterData;
  characters: Character[];
  searchQuery: string;
  sectionRef: (el: HTMLDivElement | null) => void;
}) {
  const fontSize = useSyncExternalStore(subscribeSize, getSizeSnapshot, getSizeServerSnapshot);
  const fontFamily = useSyncExternalStore(subscribeFamily, getFamilySnapshot, getFamilyServerSnapshot);
  const fs = FONT_SIZES[fontSize];
  const ff = FONT_FAMILIES[fontFamily];

  const paragraphs = useMemo(
    () => chapter.content.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean),
    [chapter.content]
  );
  const mentionedCharacters = useMemo(
    () => getMentionedCharacters(chapter.content, characters),
    [chapter.content, characters]
  );

  return (
    <section ref={sectionRef} data-chapter-number={chapter.number} className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
      <ChapterCharactersStrip characters={mentionedCharacters} />
      <div className="reader-prose" style={{ fontSize: fs.size, lineHeight: fs.line, fontFamily: ff }}>
        {paragraphs.map((p, i) => (
          <ProcessedParagraph key={i} text={p} index={i} characters={characters} searchQuery={searchQuery} isFirst={i === 0} />
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  NEXT CHAPTER TITLE — appears before the chapter content
// ═══════════════════════════════════════════════════════════

function NextChapterTitle({ chapter }: { chapter: ChapterData }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-2 text-center sm:px-6">
      <div className="mb-2 inline-flex items-center gap-2 text-xs text-gold/60">
        <span className="h-px w-8 bg-gold/30" />
        الفصل {toArabicDigits(chapter.number)}
        <span className="h-px w-8 bg-gold/30" />
      </div>
      <h2 data-chapter-title className="font-naskh text-3xl font-bold text-gold-gradient sm:text-4xl" style={{ fontFamily: "var(--font-naskh), serif" }}>
        {chapter.title}
      </h2>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  CHAPTER SEPARATOR — thin line + comments button
//  Shows 5 comments, click for 10 more
// ═══════════════════════════════════════════════════════════

function ChapterSeparator({ chapter }: { chapter: ReaderChapter | ChapterData }) {
  const [showComments, setShowComments] = useState(false);
  const [commentLimit, setCommentLimit] = useState(5);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
      {/* thin line */}
      <div className="mx-auto mb-4 h-px w-24 bg-gold/20" />

      {/* comments button */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-xs font-medium transition-all",
            showComments ? "border-gold/60 bg-gold/15 text-gold" : "border-gold/25 text-gold/70 hover:border-gold/50 hover:bg-gold/10 hover:text-gold"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {showComments ? "إخفاء التعليقات" : "💬 التعليقات"}
        </button>

        {showComments && (
          <div className="w-full">
            <LimitedComments chapterNumber={chapter.number} limit={commentLimit} />
            <div className="mt-3 text-center">
              <button
                onClick={() => setCommentLimit(commentLimit + 10)}
                className="inline-flex items-center gap-1 text-xs text-gold/60 hover:text-gold"
              >
                عرض المزيد
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* thin line */}
      <div className="mx-auto mt-4 h-px w-24 bg-gold/20" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  LIMITED COMMENTS — shows N comments
// ═══════════════════════════════════════════════════════════

function LimitedComments({ chapterNumber, limit }: { chapterNumber: number; limit: number }) {
  return <CommentsSection chapterNumber={chapterNumber} limit={limit} />;
}
