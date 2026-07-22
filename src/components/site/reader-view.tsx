"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Type, MessageSquare, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatArabicDate,
  toArabicDigits,
} from "@/lib/format";
import {
  processContentWithCharacters,
  detectDialogueColor,
  getMentionedCharacters,
  type Character,
  type CharacterSegment,
} from "@/lib/characters";
import { highlightSearchTerm, findSearchPositions } from "@/lib/search-utils";
import { CommentsSection } from "@/components/site/comments-section";
import { ChapterCharactersStrip } from "@/components/site/chapter-characters-strip";
import { markChapterRead, addReadingTime } from "@/components/site/reading-stats";
import { useTypingEffect, TypingText } from "@/components/site/typing-effect";
import { saveScrollPosition, getScrollPosition } from "@/components/site/scroll-memory";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════

export type ReaderChapter = {
  id: number;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  views: number;
  createdAt: string;
  coverImageUrl?: string | null;
};

export type ChapterLink = { number: number; title: string } | null;

// ═══════════════════════════════════════════════════════════
//  FONT STORES (hydration-safe, no setState in effect)
// ═══════════════════════════════════════════════════════════

export const FONT_SIZES = {
  sm: { size: "18px", line: "2.2" },
  md: { size: "20px", line: "2.5" },
  lg: { size: "24px", line: "2.7" },
} as const;

export type FontSizeKey = keyof typeof FONT_SIZES;

// Use the unified font system from src/lib/fonts.ts
import { FONTS, DEFAULT_FONT, FONT_KEY_STORAGE, FONT_SIZE_STORAGE, isValidFont, getFontCssVar, type FontKey } from "@/lib/fonts";

const SIZE_KEY = FONT_SIZE_STORAGE;
const FAMILY_KEY = FONT_KEY_STORAGE;

const sizeListeners = new Set<() => void>();
export function subscribeSize(cb: () => void) {
  sizeListeners.add(cb);
  // Also listen to localStorage events from other components (ScrollSettingsBar)
  const handler = (e: StorageEvent) => { if (e.key === SIZE_KEY) sizeListeners.forEach(l => l()); };
  window.addEventListener("storage", handler);
  return () => { sizeListeners.delete(cb); window.removeEventListener("storage", handler); };
}
export function getSizeSnapshot(): FontSizeKey {
  if (typeof window === "undefined") return "md";
  const v = localStorage.getItem(SIZE_KEY);
  // ScrollSettingsBar stores a number (e.g. "18"), reader-view stores "sm"/"md"/"lg"
  // Map numeric sizes to the closest key
  if (v) {
    if (v in FONT_SIZES) return v as FontSizeKey;
    const num = Number(v);
    if (!isNaN(num)) {
      if (num <= 19) return "sm";
      if (num <= 22) return "md";
      return "lg";
    }
  }
  return "md";
}
export function getSizeServerSnapshot(): FontSizeKey { return "md"; }

const familyListeners = new Set<() => void>();
export function subscribeFamily(cb: () => void) {
  familyListeners.add(cb);
  // Listen to localStorage events so ScrollSettingsBar changes are reflected
  const handler = (e: StorageEvent) => { if (e.key === FAMILY_KEY) familyListeners.forEach(l => l()); };
  window.addEventListener("storage", handler);
  return () => { familyListeners.delete(cb); window.removeEventListener("storage", handler); };
}
export function getFamilySnapshot(): FontKey {
  if (typeof window === "undefined") return DEFAULT_FONT;
  const v = localStorage.getItem(FAMILY_KEY);
  return (v && isValidFont(v)) ? v as FontKey : DEFAULT_FONT;
}
export function getFamilyServerSnapshot(): FontKey { return DEFAULT_FONT; }

// Keep FONT_FAMILIES for backward compat (other components may import it)
export const FONT_FAMILIES = Object.fromEntries(FONTS.map(f => [f.key, f.cssVar])) as Record<FontKey, string>;
export type FontFamilyKey = FontKey;

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function ReaderView({
  chapter,
  prev,
  next,
  characters = [],
  searchQuery = "",
}: {
  chapter: ReaderChapter;
  prev: ChapterLink;
  next: ChapterLink;
  characters?: Character[];
  searchQuery?: string;
}) {
  // ── Font state ──
  const fontSize = useSyncExternalStore(subscribeSize, getSizeSnapshot, getSizeServerSnapshot);
  const fontFamily = useSyncExternalStore(subscribeFamily, getFamilySnapshot, getFamilyServerSnapshot);
  const fs = FONT_SIZES[fontSize];
  const ff = getFontCssVar(fontFamily);

  function changeSize(s: FontSizeKey) {
    localStorage.setItem(SIZE_KEY, s);
    sizeListeners.forEach(l => l());
  }
  function changeFamily(f: FontFamilyKey) {
    localStorage.setItem(FAMILY_KEY, f);
    familyListeners.forEach(l => l());
  }

  // ── Typing mode ──
  const [typingMode, setTypingMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("typing-mode") === "true";
  });
  function toggleTyping() {
    const n = !typingMode;
    setTypingMode(n);
    localStorage.setItem("typing-mode", String(n));
  }

  // ── Auto-scroll ──
  const [autoScroll, setAutoScroll] = useState(false);
  const autoScrollSpeedRef = useRef(0.8);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<0.3 | 0.8 | 1.5>(0.8);
  useEffect(() => { autoScrollSpeedRef.current = autoScrollSpeed; }, [autoScrollSpeed]);

  useEffect(() => {
    if (!autoScroll) return;
    let raf = 0;
    const tick = () => {
      window.scrollBy(0, autoScrollSpeedRef.current * 3);
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
        setAutoScroll(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoScroll]);

  // ── Auto-hide UI ──
  const [uiHidden, setUiHidden] = useState(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 50) { setUiHidden(false); lastScrollY.current = y; return; }
      if (y > lastScrollY.current + 5) setUiHidden(true);
      else if (y < lastScrollY.current - 5) setUiHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Reading tracking ──
  useEffect(() => {
    markChapterRead(chapter.number);
    const interval = setInterval(() => {
      if (!document.hidden) addReadingTime(10);
    }, 10000);
    return () => clearInterval(interval);
  }, [chapter.number]);

  // ── Scroll memory ──
  useEffect(() => {
    const saved = getScrollPosition(chapter.number);
    if (saved) {
      setTimeout(() => {
        window.scrollTo({ top: saved, behavior: "smooth" });
      }, 500);
    }
    const saveInterval = setInterval(() => {
      saveScrollPosition(chapter.number, window.scrollY);
    }, 3000);
    const onHide = () => saveScrollPosition(chapter.number, window.scrollY);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(saveInterval);
      window.removeEventListener("pagehide", onHide);
    };
  }, [chapter.number]);

  // ── Search scroll ──
  useEffect(() => {
    if (!searchQuery) return;
    const positions = findSearchPositions(chapter.content, searchQuery);
    if (positions.length === 0) return;
    const target = document.getElementById(`para-${positions[0].paragraphIndex}`);
    if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  }, [searchQuery, chapter.content]);

  // ── Hash scroll (e.g. #para-5 for character links, #char-flash for character name) ──
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    // Handle #char-flash — find and flash the character's name in the chapter
    if (hash === "#char-flash") {
      const params = new URLSearchParams(window.location.search);
      const charId = params.get("char");
      if (!charId) return;
      // Find the character name
      const char = characters.find((c) => String(c.id) === charId);
      if (!char) return;

      const tryFlash = () => {
        // Look for mark.char-name elements (character highlights)
        const marks = document.querySelectorAll("mark.char-name");
        if (marks.length > 0) {
          // Find the first mark that matches the character name
          let target: Element | null = null;
          for (const m of marks) {
            if (m.textContent?.includes(char.name) || char.name.includes(m.textContent || "")) {
              target = m;
              break;
            }
          }
          if (!target) target = marks[0]; // fallback to first

          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.classList.add("char-flash");
          setTimeout(() => target.classList.remove("char-flash"), 3000);
        } else {
          // No character highlights — try to find the name in text
          const prose = document.querySelector(".reader-prose");
          if (prose) {
            const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);
            let node: Node | null;
            while ((node = walker.nextNode())) {
              if (node.textContent?.includes(char.name)) {
                const range = document.createRange();
                const idx = node.textContent.indexOf(char.name);
                range.setStart(node, idx);
                range.setEnd(node, idx + char.name.length);
                const span = document.createElement("span");
                span.className = "char-flash-inline";
                range.surroundContents(span);
                span.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                  const parent = span.parentNode;
                  if (parent) {
                    while (span.firstChild) parent.insertBefore(span.firstChild, span);
                    parent.removeChild(span);
                  }
                }, 3000);
                break;
              }
            }
          }
        }
      };
      setTimeout(tryFlash, 800);
      return;
    }

    // Handle #para-N
    const match = hash.match(/^#para-(\d+)$/);
    if (!match) return;
    const paraId = match[1];
    const tryScroll = () => {
      const target = document.getElementById(`para-${paraId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("ring-2", "ring-gold/50", "rounded");
        setTimeout(() => target.classList.remove("ring-2", "ring-gold/50", "rounded"), 3000);
      } else {
        setTimeout(tryScroll, 200);
      }
    };
    setTimeout(tryScroll, 500);
  }, [chapter.number, characters]);

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft" && next) window.location.href = `/chapters/${next.number}`;
      if (e.key === "ArrowRight" && prev) window.location.href = `/chapters/${prev.number}`;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  // ── Typing effect ──
  const allText = `${chapter.title} ${formatArabicDate(chapter.createdAt)} ${toArabicDigits(chapter.wordCount)} كلمة ${toArabicDigits(chapter.views)} مشاهدة ${chapter.content}`;
  const totalWords = allText.split(/\s+/).filter(Boolean).length;
  const visibleWords = useTypingEffect(totalWords, typingMode, 260);
  const headerText = `${chapter.title} ${formatArabicDate(chapter.createdAt)} ${toArabicDigits(chapter.wordCount)} كلمة ${toArabicDigits(chapter.views)} مشاهدة`;
  const headerWordCount = headerText.split(/\s+/).filter(Boolean).length;
  const contentVisibleWords = Math.max(0, visibleWords - headerWordCount);

  // ── Content ──
  const paragraphs = useMemo(
    () => chapter.content.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean),
    [chapter.content]
  );
  const mentionedCharacters = useMemo(
    () => getMentionedCharacters(chapter.content, characters),
    [chapter.content, characters]
  );

  return (
    <div className="relative">
      {/* ═══ FIXED TOOLBAR ═══ */}
      <div
        className="fixed top-16 right-0 left-0 z-40 border-b border-gold/15 bg-background shadow-lg transition-transform duration-300"
        style={{
          willChange: "transform",
          transform: uiHidden ? "translateY(-100%)" : "translateY(0)",
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5">
          {/* prev */}
          {prev && (
            <Link
              href={`/chapters/${prev.number}`}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-gold/30 px-3 text-xs text-gold/80 transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="hidden sm:inline">السابق</span>
            </Link>
          )}

          {/* center */}
          <div className="min-w-0 flex-1 text-center">
            <span className="font-naskh text-sm font-bold text-gold-gradient">سيد الحقيقة</span>
          </div>

          {/* right controls */}
          <div className="flex items-center gap-1.5">
            {!typingMode && (
              <>
                {/* Font controls moved to ScrollSettingsBar (top center) */}
              </>
            )}
            {/* typing */}
            <button
              onClick={toggleTyping}
              className={cn("inline-flex h-9 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors",
                typingMode ? "border-gold/60 bg-gold/15 text-gold" : "border-gold/25 text-gold/60 hover:border-gold/50 hover:text-gold")}
            >
              <Type className="h-3.5 w-3.5" />
              {typingMode ? "إيقاف" : "كتابة"}
            </button>
            {/* auto-scroll */}
            <button
              onClick={() => { setAutoScroll(!autoScroll); if (!autoScroll) setAutoScrollSpeed(0.8); }}
              onDoubleClick={(e) => { e.stopPropagation(); const speeds: (0.3|0.8|1.5)[] = [0.3,0.8,1.5]; const idx = speeds.indexOf(autoScrollSpeed); setAutoScrollSpeed(speeds[(idx+1)%3]); }}
              className={cn("inline-flex h-9 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors",
                autoScroll ? "border-gold/60 bg-gold/15 text-gold" : "border-gold/25 text-gold/60 hover:border-gold/50 hover:text-gold")}
              title="تمرير تلقائي (اضغط مرتين لتغيير السرعة)"
            >
              {autoScroll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{autoScroll ? "إيقاف" : "تمرير"}</span>
            </button>
            {/* next */}
            {next && (
              <Link
                href={`/chapters/${next.number}`}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-gold/30 px-3 text-xs text-gold/80 transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold"
              >
                <span className="hidden sm:inline">التالي</span>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
        {/* progress bar */}
        <div className="h-0.5 w-full bg-gold/10">
          <ProgressTracker chapterNumber={chapter.number} />
        </div>
      </div>

      {/* ═══ ARTICLE ═══ */}
      <article className="mx-auto max-w-3xl px-4 pt-14 pb-10 sm:px-6">
        {/* header */}
        <header className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2 text-xs text-gold/70">
            <span className="h-px w-8 bg-gold/40" />
            الفصل {toArabicDigits(chapter.number)}
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl" style={{ fontFamily: ff }}>
            {typingMode ? (
              <TypingText text={chapter.title} visibleWords={visibleWords} totalWords={headerWordCount} />
            ) : chapter.title}
          </h1>
        </header>

        {/* character portraits */}
        {!typingMode && mentionedCharacters.length > 0 && (
          <ChapterCharactersStrip characters={mentionedCharacters} />
        )}

        {/* content */}
        <div className="reader-prose" style={{ fontSize: fs.size, lineHeight: fs.line, fontFamily: ff }}>
          {typingMode ? (
            <CinematicContent paragraphs={paragraphs} visibleWords={contentVisibleWords} />
          ) : (
              paragraphs.map((p, i) => (
                <ProcessedParagraph key={i} text={p} index={i} characters={characters} searchQuery={searchQuery} isFirst={i === 0} />
              ))
          )}
        </div>
      </article>

      {/* click-to-pause auto-scroll */}
      {autoScroll && (
        <div className="fixed inset-0 z-30 cursor-pointer" onClick={() => setAutoScroll(false)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PROGRESS TRACKER
// ═══════════════════════════════════════════════════════════

function ProgressTracker({ chapterNumber }: { chapterNumber: number }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="h-full transition-[width] duration-150"
      style={{
        width: `${progress}%`,
        background: "linear-gradient(90deg, var(--gold), var(--purple), var(--gold))",
        backgroundSize: "200% 100%",
        animation: "shimmer 3s linear infinite",
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════
//  FONT CONTROL POPOVER
// ═══════════════════════════════════════════════════════════

// FontControl component removed — font controls now live in ScrollSettingsBar (top center)


// ═══════════════════════════════════════════════════════════
//  PROCESSED PARAGRAPH (character mentions + dialogue + search)
// ═══════════════════════════════════════════════════════════

export function ProcessedParagraph({
  text, index, characters, searchQuery, isFirst = false,
}: {
  text: string; index: number; characters: Character[]; searchQuery: string; isFirst?: boolean;
}) {
  const segments = useMemo(() => processContentWithCharacters(text, characters), [text, characters]);
  const dialogueColor = useMemo(() => detectDialogueColor(text, characters), [text, characters]);

  return (
    <p id={`para-${index}`}>
      {segments.map((seg, i) => {
        if (seg.type === "character") {
          const char = characters.find(c => c.name === seg.name);
          return <CharacterMention key={i} character={char} name={seg.name} />;
        }
        return (
          <TextWithHighlights key={i} text={seg.value} dialogueColor={dialogueColor} searchQuery={searchQuery} isFirstWord={isFirst && i === 0} />
        );
      })}
    </p>
  );
}

function TextWithHighlights({ text, dialogueColor, searchQuery, isFirstWord = false }: { text: string; dialogueColor: string | null; searchQuery: string; isFirstWord?: boolean }) {
  const formatted = parseFormatMarkers(text);
  const firstWordDone = useRef(false);
  if (isFirstWord) firstWordDone.current = false;

  return (
    <>
      {formatted.map((seg, i) => {
        if (seg.type === "char-link") {
          return (
            <span key={i} className="font-semibold text-gold underline decoration-gold/30 decoration-dotted underline-offset-4" title={`شخصية: ${seg.charName}`}>
              {renderWithSearch(seg.text, searchQuery)}
            </span>
          );
        }
        if (seg.type === "colored") {
          return <span key={i} style={{ color: seg.color, fontWeight: 600 }}>{renderWithSearch(seg.text, searchQuery)}</span>;
        }
        if (seg.type === "bold") return <strong key={i}>{renderWithSearch(seg.text, searchQuery)}</strong>;
        if (seg.type === "italic") return <em key={i}>{renderWithSearch(seg.text, searchQuery)}</em>;
        const parts = splitByDialogue(seg.text);
        return (
          <span key={i}>
            {parts.map((part, j) => {
              const rendered = renderWithSearch(part.text, searchQuery);
              if (part.isDialogue && dialogueColor) return <span key={j} style={{ color: dialogueColor }}>{rendered}</span>;
              if (isFirstWord && !firstWordDone.current) {
                firstWordDone.current = true;
                const words = part.text.split(/(\s+)/);
                return (
                  <span key={j}>
                    {words.map((w, k) => {
                      if (k === 0 && w.trim()) return <span key={k} className="cinematic-first-word">{w}</span>;
                      return <span key={k}>{w}</span>;
                    })}
                  </span>
                );
              }
              return <span key={j}>{rendered}</span>;
            })}
          </span>
        );
      })}
    </>
  );
}

function renderWithSearch(text: string, searchQuery: string) {
  if (!searchQuery) return text;
  return highlightSearchTerm(text, searchQuery).map((s, j) =>
    s.type === "mark" ? <mark key={j} className="rounded bg-gold/30 px-0.5 text-gold">{s.value}</mark> : <span key={j}>{s.value}</span>
  );
}

function splitByDialogue(text: string) {
  const parts: Array<{ text: string; isDialogue: boolean }> = [];
  const re = /[""«][^""»]*[""»]/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), isDialogue: false });
    parts.push({ text: m[0], isDialogue: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), isDialogue: false });
  return parts.length > 0 ? parts : [{ text, isDialogue: false }];
}

type FormattedSegment =
  | { type: "text"; text: string }
  | { type: "colored"; text: string; color: string }
  | { type: "char-link"; text: string; charName: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string };

function parseFormatMarkers(text: string): FormattedSegment[] {
  const segments: FormattedSegment[] = [];
  const re = /\[color:([#a-fA-F0-9]+)\]([\s\S]*?)\[\/color\]|\[char:([^\]]+)\]([\s\S]*?)\[\/char\]|\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0; let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    if (match[1] !== undefined) segments.push({ type: "colored", color: match[1], text: match[2] });
    else if (match[3] !== undefined) segments.push({ type: "char-link", charName: match[3], text: match[4] });
    else if (match[5] !== undefined) segments.push({ type: "bold", text: match[5] });
    else if (match[6] !== undefined) segments.push({ type: "italic", text: match[6] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ type: "text", text: text.slice(lastIndex) });
  return segments.length > 0 ? segments : [{ type: "text", text }];
}

// ═══════════════════════════════════════════════════════════
//  CHARACTER MENTION
// ═══════════════════════════════════════════════════════════

function CharacterMention({ character, name }: { character: Character | undefined; name: string }) {
  if (!character) return <span className="font-semibold text-gold">{name}</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex cursor-pointer font-semibold text-gold underline decoration-gold/30 decoration-dotted underline-offset-4 transition-colors hover:decoration-gold">
          {name}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 border-gold/25 bg-popover p-0" align="center">
        {character.imageUrl ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-t-md">
            <img src={character.imageUrl} alt={character.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-t-md bg-accent">
            <span className="font-naskh text-4xl font-bold text-gold/40">{character.name.charAt(0)}</span>
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-2">
            <h3 className="font-naskh text-lg font-bold text-foreground">{character.name}</h3>
            {character.isMain && <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">رئيسي</span>}
          </div>
          {character.nameEn && <p className="text-xs text-muted-foreground">{character.nameEn}</p>}
          {character.description && <p className="mt-2 text-sm leading-relaxed text-foreground/80">{character.description}</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════
//  CINEMATIC CONTENT (typing mode)
// ═══════════════════════════════════════════════════════════

function CinematicContent({ paragraphs, visibleWords }: { paragraphs: string[]; visibleWords: number }) {
  let budget = visibleWords;
  return (
    <>
      {paragraphs.map((p, paraIdx) => {
        if (budget <= 0) return <p key={paraIdx} style={{ opacity: 0 }}>{p}</p>;
        const words = p.split(/(\s+)/);
        let count = 0;
        const parts = words.map((word, i) => {
          if (/^\s+$/.test(word) || word === "") return <span key={i}>{word}</span>;
          const visible = count < budget;
          count++;
          return <span key={i} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease" }}>{word}</span>;
        });
        budget -= count;
        return <p key={paraIdx}>{parts}</p>;
      })}
    </>
  );
}
