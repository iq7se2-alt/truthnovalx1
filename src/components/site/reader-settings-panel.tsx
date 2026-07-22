"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Type, Palette, Gauge, BookText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutoScrollSpeed } from "@/components/site/auto-scroll-control";

export type FontFamilyKey = "naskh" | "cairo" | "amiri";
export type FontSizeKey = "sm" | "md" | "lg";

const FONT_FAMILIES: Record<FontFamilyKey, string> = {
  naskh: "var(--font-naskh), serif",
  cairo: "var(--font-cairo), sans-serif",
  amiri: "var(--font-amiri), serif",
};

const FONT_FAMILY_LABELS: Record<FontFamilyKey, string> = {
  naskh: "نسخ",
  cairo: "القاهرة",
  amiri: "أميري",
};

const FONT_SIZE_LABELS: Record<FontSizeKey, string> = {
  sm: "صغير",
  md: "متوسط",
  lg: "كبير",
};

const SPEED_LABELS: Record<AutoScrollSpeed, string> = {
  0.3: "بطيء",
  0.8: "متوسط",
  1.5: "سريع",
};

/**
 * Slide-in settings panel for the reader. Lets the user pick font family,
 * font size, and auto-scroll speed — all applied live.
 * (Typing mode toggle lives in the toolbar, not here.)
 */
export function ReaderSettingsPanel({
  open,
  onOpenChange,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  autoScrollSpeed,
  onAutoScrollSpeedChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fontFamily: FontFamilyKey;
  onFontFamilyChange: (f: FontFamilyKey) => void;
  fontSize: FontSizeKey;
  onFontSizeChange: (s: FontSizeKey) => void;
  autoScrollSpeed: AutoScrollSpeed;
  onAutoScrollSpeedChange: (s: AutoScrollSpeed) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-80 overflow-y-auto border-gold/25 bg-background p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-gold/15 px-5 pb-4">
          <SheetTitle className="flex items-center gap-2 font-naskh text-lg text-gold">
            <Sparkles className="h-4 w-4" />
            إعدادات القراءة
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            عدّل الإعدادات وشاهد التغييرات مباشرةً
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-5">
          {/* Font family */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold/70">
              <BookText className="h-3.5 w-3.5" />
              نوع الخط
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(FONT_FAMILIES) as FontFamilyKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => onFontFamilyChange(k)}
                  className={cn(
                    "rounded-md border px-2 py-2.5 text-sm font-medium transition-colors",
                    fontFamily === k
                      ? "border-gold/60 bg-gold/15 text-gold"
                      : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                  )}
                  style={{ fontFamily: FONT_FAMILIES[k] }}
                >
                  {FONT_FAMILY_LABELS[k]}
                </button>
              ))}
            </div>
          </section>

          {/* Font size */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold/70">
              <Type className="h-3.5 w-3.5" />
              حجم الخط
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(["sm", "md", "lg"] as FontSizeKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => onFontSizeChange(k)}
                  className={cn(
                    "rounded-md border px-2 py-2.5 text-sm font-medium transition-colors",
                    fontSize === k
                      ? "border-gold/60 bg-gold/15 text-gold"
                      : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                  )}
                >
                  <span
                    style={{
                      fontSize: k === "sm" ? "12px" : k === "md" ? "15px" : "18px",
                    }}
                  >
                    {FONT_SIZE_LABELS[k]}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Auto-scroll speed */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold/70">
              <Gauge className="h-3.5 w-3.5" />
              سرعة التمرير التلقائي
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {([0.3, 0.8, 1.5] as AutoScrollSpeed[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onAutoScrollSpeedChange(s)}
                  className={cn(
                    "rounded-md border px-2 py-2.5 text-sm font-medium transition-colors",
                    autoScrollSpeed === s
                      ? "border-gold/60 bg-gold/15 text-gold"
                      : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                  )}
                >
                  {SPEED_LABELS[s]}
                </button>
              ))}
            </div>
          </section>

          {/* Theme hint */}
          <section className="rounded-md border border-gold/15 bg-muted/40 p-3 text-center text-xs text-muted-foreground">
            <Palette className="mx-auto mb-1 h-3.5 w-3.5 text-gold/50" />
            غيّر الثيم من الأعلى (زر تبديل الثيم في الشريط العلوي)
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
