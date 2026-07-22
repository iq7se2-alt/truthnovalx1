"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Type,
  Plus,
  Minus,
  Gauge,
  Users,
  Settings2,
  Play,
  Pause,
  X,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AmbientSounds } from "./ambient-sounds";
import { FONTS, DEFAULT_FONT, FONT_KEY_STORAGE, FONT_SIZE_STORAGE, isValidFont, type FontKey } from "@/lib/fonts";

/**
 * ScrollSettingsBar — slim progress bar + organized top settings bar.
 *
 * Design (per user request): organized and smooth.
 * - Slim progress bar at top: always visible, auto-hides after 0.5s idle
 * - Top action bar: a single pill containing [gear] [audio] — compact, clean
 * - Settings dropdown: organized into sections with dividers:
 *   1. الخط (Font): family + size in one row
 *   2. القراءة (Reading): auto-scroll + speed
 *   3. الشخصيات (Characters): highlight toggle + details toggle
 * - Smooth animations, consistent spacing
 */
export function ScrollSettingsBar({
  chapterContentSelector = ".reader-prose, .chapter-content, .prose, article",
}: {
  chapterContentSelector?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [barVisible, setBarVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings state
  const [fontFamily, setFontFamilyState] = useState<FontKey>(() => {
    if (typeof window === "undefined") return DEFAULT_FONT;
    const v = localStorage.getItem(FONT_KEY_STORAGE);
    return (v && isValidFont(v)) ? v as FontKey : DEFAULT_FONT;
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window === "undefined") return 18;
    return Number(localStorage.getItem(FONT_SIZE_STORAGE)) || 18;
  });
  const [autoScroll, setAutoScroll] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(1);
  const [highlightChars, setHighlightChars] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("reader-highlight-chars") === "true";
  });
  const [showCharDetails, setShowCharDetails] = useState(false);

  const hideTimerRef = useRef<number | null>(null);
  const autoScrollRef = useRef<number | null>(null);

  // ─── Scroll tracking ───
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (currentY / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
      setBarVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        setBarVisible(false);
      }, 500);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // ─── Apply font family + size ───
  useEffect(() => {
    const els = document.querySelectorAll(chapterContentSelector);
    const fontCss = FONTS.find((f) => f.key === fontFamily)?.cssVar || "";
    els.forEach((el) => {
      (el as HTMLElement).style.fontFamily = fontCss;
      (el as HTMLElement).style.fontSize = `${fontSize}px`;
      (el as HTMLElement).style.lineHeight = "1.9";
    });
    localStorage.setItem(FONT_KEY_STORAGE, fontFamily);
    localStorage.setItem(FONT_SIZE_STORAGE, String(fontSize));
    // Dispatch storage events so reader-view's useSyncExternalStore picks up the change
    window.dispatchEvent(new StorageEvent("storage", { key: FONT_KEY_STORAGE, newValue: fontFamily }));
    window.dispatchEvent(new StorageEvent("storage", { key: FONT_SIZE_STORAGE, newValue: String(fontSize) }));
  }, [fontFamily, fontSize, chapterContentSelector]);

  // Wrapper to also trigger re-render in reader-view
  const setFontFamily = useCallback((key: FontKey) => {
    setFontFamilyState(key);
  }, []);

  // ─── Apply character highlighting ───
  useEffect(() => {
    const els = document.querySelectorAll(chapterContentSelector);
    if (highlightChars) {
      els.forEach((el) => el.classList.add("highlight-characters"));
    } else {
      els.forEach((el) => el.classList.remove("highlight-characters"));
    }
    localStorage.setItem("reader-highlight-chars", String(highlightChars));
  }, [highlightChars, chapterContentSelector]);

  // ─── Auto-scroll ───
  useEffect(() => {
    if (autoScroll) {
      autoScrollRef.current = window.setInterval(() => {
        window.scrollBy(0, autoScrollSpeed);
      }, 30);
    } else {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    }
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [autoScroll, autoScrollSpeed]);

  useEffect(() => {
    if (!autoScroll) return;
    const stop = () => setAutoScroll(false);
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    window.addEventListener("keydown", stop, { once: true });
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [autoScroll]);

  const toggleFont = useCallback((dir: 1 | -1) => {
    setFontSize((prev) => Math.max(12, Math.min(32, prev + dir * 2)));
  }, []);

  const [fontSearch, setFontSearch] = useState("");

  const filteredFonts = FONTS.filter(f =>
    !fontSearch.trim() || f.label.includes(fontSearch.trim()) || f.key.toLowerCase().includes(fontSearch.trim().toLowerCase())
  );

  return (
    <>
      {/* ═══ Slim progress bar (auto-hide after 0.5s idle) ═══ */}
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-50 h-1 transition-opacity duration-300",
          barVisible ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!barVisible}
      >
        <div className="absolute inset-0 bg-gold/10" />
        <div
          className="h-full bg-gradient-to-r from-gold/60 via-gold to-gold-soft transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
        {barVisible && progress > 1 && (
          <div className="absolute left-1/2 top-1 -translate-x-1/2 rounded-b bg-background/80 px-2 py-0.5 text-[9px] font-mono text-gold/70 backdrop-blur-sm">
            {Math.round(progress)}%
          </div>
        )}
      </div>

      {/* ═══ Top action bar — single organized pill ═══ */}
      <div className="fixed left-1/2 top-3 z-40 -translate-x-1/2">
        <div className="flex items-center gap-0.5 rounded-full border border-gold/20 bg-background/85 p-1 shadow-lg backdrop-blur-md">
          {/* Settings gear */}
          <button
            onClick={() => setSettingsOpen((s) => !s)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-all",
              settingsOpen
                ? "bg-gold/15 text-gold"
                : "text-gold/60 hover:bg-gold/10 hover:text-gold"
            )}
            title="إعدادات القراءة"
            aria-label="إعدادات القراءة"
          >
            <Settings2 className="h-4 w-4" />
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-gold/15" />

          {/* Audio (ambient sounds compact) */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gold/10">
            <AmbientSounds compact />
          </div>
        </div>
      </div>

      {/* ═══ Settings dropdown — organized sections ═══ */}
      {settingsOpen && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSettingsOpen(false)}
          />

          <div className="fixed left-1/2 top-14 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 animate-float-in">
            <div className="overflow-hidden rounded-2xl border border-gold/25 bg-background/95 shadow-2xl backdrop-blur-md">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gold/15 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5 text-gold" />
                  <h3 className="font-naskh text-sm font-bold text-gold">
                    إعدادات القراءة
                  </h3>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-gold"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Body — organized sections */}
              <div className="divide-y divide-gold/10">
                {/* ─── Section 1: الخط (Font) ─── */}
                <div className="px-4 py-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold/50">
                    <Type className="h-3 w-3" />
                    الخط
                    <span className="mr-auto text-[9px] text-muted-foreground/60">
                      {filteredFonts.length} نوع
                    </span>
                  </div>
                  {/* Font search */}
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gold/40" />
                    <input
                      type="text"
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      placeholder="ابحث عن خط..."
                      className="w-full rounded-md border border-gold/20 bg-muted/40 py-1 pr-7 pl-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-gold/40 focus:outline-none"
                    />
                  </div>
                  {/* Font family grid — scrollable, all 22 fonts */}
                  <div className="mb-2 max-h-48 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                    <div className="grid grid-cols-3 gap-1.5">
                      {filteredFonts.map((font) => (
                        <button
                          key={font.key}
                          onClick={() => setFontFamily(font.key)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 transition-all",
                            fontFamily === font.key
                              ? "border-gold/60 bg-gold/15 text-gold ring-1 ring-gold/30"
                              : "border-gold/15 text-muted-foreground hover:border-gold/30 hover:text-gold/80"
                          )}
                          title={`${font.label} (${font.category})`}
                        >
                          <span
                            className="text-lg leading-none"
                            style={{ fontFamily: font.cssVar }}
                          >
                            أبجد
                          </span>
                          <span className="text-[9px] font-bold">{font.label}</span>
                          <span className="text-[7px] text-muted-foreground/60">{font.category}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Font size */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">الحجم</span>
                    <div className="flex flex-1 items-center gap-1 rounded-lg border border-gold/20 bg-muted/40 px-1.5 py-1">
                      <button
                        onClick={() => toggleFont(-1)}
                        className="flex h-6 w-6 items-center justify-center rounded text-gold/70 transition-colors hover:bg-gold/10 hover:text-gold"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="flex-1 text-center text-xs font-mono font-bold text-gold">
                        {fontSize}px
                      </span>
                      <button
                        onClick={() => toggleFont(1)}
                        className="flex h-6 w-6 items-center justify-center rounded text-gold/70 transition-colors hover:bg-gold/10 hover:text-gold"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── Section 2: القراءة (Reading) ─── */}
                <div className="px-4 py-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold/50">
                    <Gauge className="h-3 w-3" />
                    القراءة
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAutoScroll((a) => !a)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all",
                        autoScroll
                          ? "border-gold/50 bg-gold/15 text-gold"
                          : "border-gold/20 text-muted-foreground hover:border-gold/30 hover:text-gold/80"
                      )}
                    >
                      {autoScroll ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      <span>سكرول تلقائي</span>
                    </button>
                    {autoScroll && (
                      <div className="flex flex-1 items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          السرعة
                        </span>
                        <input
                          type="range"
                          min="0.5"
                          max="4"
                          step="0.5"
                          value={autoScrollSpeed}
                          onChange={(e) =>
                            setAutoScrollSpeed(Number(e.target.value))
                          }
                          className="flex-1 accent-gold"
                        />
                        <span className="w-6 text-center text-[10px] font-mono text-gold">
                          {autoScrollSpeed}×
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── Section 3: الشخصيات (Characters) ─── */}
                <div className="px-4 py-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold/50">
                    <Users className="h-3 w-3" />
                    الشخصيات
                  </div>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setHighlightChars((h) => !h)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all",
                        highlightChars
                          ? "border-gold/50 bg-gold/15 text-gold"
                          : "border-gold/20 text-muted-foreground hover:border-gold/30 hover:text-gold/80"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {highlightChars ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        إظهار أسماء الشخصيات
                      </span>
                      <span
                        className={cn(
                          "h-4 w-7 rounded-full transition-colors",
                          highlightChars ? "bg-gold/40" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                            highlightChars ? "translate-x-3" : "translate-x-0.5"
                          )}
                          style={{
                            transform: highlightChars
                              ? "translateX(-12px)"
                              : "translateX(2px)",
                            marginTop: "1px",
                          }}
                        />
                      </span>
                    </button>
                    <button
                      onClick={() => setShowCharDetails((s) => !s)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all",
                        showCharDetails
                          ? "border-purple/50 bg-purple/15 text-purple"
                          : "border-gold/20 text-muted-foreground hover:border-gold/30 hover:text-gold/80"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        تفاصيل الشخصيات
                      </span>
                      <span
                        className={cn(
                          "h-4 w-7 rounded-full transition-colors",
                          showCharDetails ? "bg-purple/40" : "bg-muted"
                        )}
                      >
                        <span
                          className="block h-3.5 w-3.5 rounded-full bg-white shadow"
                          style={{
                            transform: showCharDetails
                              ? "translateX(-12px)"
                              : "translateX(2px)",
                            marginTop: "1px",
                          }}
                        />
                      </span>
                    </button>
                  </div>
                </div>

                {/* ─── Footer: progress info ─── */}
                <div className="flex items-center justify-between px-4 py-2 text-[10px] text-muted-foreground">
                  <span>التقدم: {Math.round(progress)}%</span>
                  <span className="text-gold/40">
                    يختفي الشريط تلقائياً بعد التوقف
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
