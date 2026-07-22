"use client";

import { useCallback, useMemo, useState } from "react";
import {
  FileDown,
  Loader2,
  Files,
  FileText,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { toArabicDigits } from "@/lib/format";

type ChapterLite = { number: number; title: string };

type Mode = "combined" | "separate";

type DownloadLink = {
  number: number;
  title: string;
  url: string;
};

/**
 * PdfDownloadBar — sticky bottom bar for downloading selected chapters as PDF.
 *
 * Props:
 *   chapters   — the chapters currently selected on the chapters list page
 *   allChapters — ALL available chapters (for "select all" toggle)
 *   selected   — Set of selected chapter numbers (controlled by parent)
 *   onToggleAll — called when user clicks "select all"; parent updates selection
 */
export function PdfDownloadBar({
  chapters,
  allChapters,
  selected,
  onToggleAll,
}: {
  chapters: ChapterLite[];
  allChapters: ChapterLite[];
  selected: Set<number>;
  onToggleAll: (selectAll: boolean) => void;
}) {
  const { toast } = useToast();

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.number - b.number),
    [chapters]
  );

  const [mode, setMode] = useState<Mode>("combined");
  const [generating, setGenerating] = useState(false);

  const selectedCount = sortedChapters.length;
  const selectedSorted = useMemo(
    () => sortedChapters.map((c) => c.number).sort((a, b) => a - b),
    [sortedChapters]
  );

  const allSelected = selectedCount === allChapters.length && allChapters.length > 0;
  const canDownload = selectedCount > 0 && !generating;

  const handleToggleAll = useCallback(() => {
    onToggleAll(!allSelected);
  }, [allSelected, onToggleAll]);

  // --- trigger download via print-friendly page ---
  // We use the /print/[ids] route which opens a clean, printable HTML page.
  // The user clicks the "طباعة / حفظ PDF" button on that page to save as PDF
  // using the browser's native print-to-PDF. This is 100% reliable (no
  // Playwright dependency, no timeouts, works through any gateway).
  const handleDownload = useCallback(async () => {
    if (!canDownload) return;
    const nums = selectedSorted;
    if (nums.length === 0) return;

    setGenerating(true);
    try {
      if (mode === "combined") {
        // Combined: open print page with all chapters, user clicks print
        const url = `/print/${nums.join(",")}`;
        toast({
          title: "فتح صفحة الطباعة",
          description: `اضغط زر «طباعة / حفظ PDF» في الصفحة الجديدة`,
        });
        window.open(url, "_blank");
        await new Promise((r) => setTimeout(r, 500));
      } else {
        // Separate: open a print page for each chapter
        toast({
          title: "فتح صفحات الطباعة",
          description: `سيتم فتح ${toArabicDigits(nums.length)} صفحات طباعة`,
        });
        for (let i = 0; i < nums.length; i++) {
          window.open(`/print/${nums[i]}`, "_blank");
          if (i < nums.length - 1) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطأ غير معروف";
      toast({
        title: "تعذّر التحميل",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }, [canDownload, mode, selectedSorted, toast]);

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "gold-card sticky bottom-3 z-30 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-lg p-3 sm:p-4",
        "shadow-[0_10px_40px_-12px_rgba(201,168,76,0.35)]"
      )}
    >
      {/* Select all toggle */}
      <Button
        variant="outline"
        onClick={handleToggleAll}
        className="border-gold/25 bg-muted font-naskh text-gold/90 hover:border-gold/55 hover:bg-gold/10 hover:text-gold"
      >
        {allSelected ? (
          <>
            <CheckSquare className="ml-2 h-4 w-4 text-gold" />
            إلغاء الكل
          </>
        ) : (
          <>
            <Square className="ml-2 h-4 w-4" />
            تحديد الكل
          </>
        )}
      </Button>

      {/* Mode toggle */}
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(v) => {
          if (v) setMode(v as Mode);
        }}
        className="rounded-md border border-gold/25 bg-muted"
      >
        <ToggleGroupItem
          value="combined"
          aria-label="ملف واحد"
          className="gap-1.5 px-3 py-1.5 font-naskh text-xs text-gold/80 data-[state=on]:bg-gold data-[state=on]:text-[#1a0a00] data-[state=on]:hover:bg-gold-soft hover:text-gold"
        >
          <FileText className="h-3.5 w-3.5" />
          ملف واحد
        </ToggleGroupItem>
        <ToggleGroupItem
          value="separate"
          aria-label="ملفات منفصلة"
          className="gap-1.5 px-3 py-1.5 font-naskh text-xs text-gold/80 data-[state=on]:bg-gold data-[state=on]:text-[#1a0a00] data-[state=on]:hover:bg-gold-soft hover:text-gold"
        >
          <Files className="h-3.5 w-3.5" />
          ملفات منفصلة
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Count + download */}
      <div className="ml-auto flex items-center gap-2">
        <Badge
          variant="outline"
          className="hidden border-gold/30 bg-gold/10 text-gold sm:inline-flex"
        >
          {toArabicDigits(selectedCount)} فصل
        </Badge>
        <Button
          onClick={handleDownload}
          disabled={!canDownload}
          className="bg-gold text-[#1a0a00] hover:bg-gold-soft"
        >
          {generating ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="ml-2 h-4 w-4" />
          )}
          تحميل PDF
        </Button>
      </div>
    </div>
  );
}
