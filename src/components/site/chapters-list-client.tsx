"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Hash, Download, X, Sparkles, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatArabicDate, toArabicDigits } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

type ChapterListItem = {
  id: number;
  number: number;
  title: string;
  wordCount: number;
  views: number;
  createdAt: string;
};

/**
 * Client-side chapter list with instant search (no refetch).
 * All chapters are passed in from the server component.
 */
export function ChaptersListClient({
  chapters,
}: {
  chapters: ChapterListItem[];
}) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [desc, setDesc] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  // Filter + sort client-side (instant, no API call)
  const filtered = useMemo(() => {
    let result = chapters;
    const query = q.trim();
    if (query) {
      result = result.filter((ch) => {
        // Match title (case-insensitive)
        if (ch.title.includes(query)) return true;
        // Match number (exact or prefix)
        const numStr = String(ch.number);
        if (numStr.startsWith(query)) return true;
        return false;
      });
    }
    // Sort
    result = [...result].sort((a, b) =>
      desc ? b.number - a.number : a.number - b.number
    );
    return result;
  }, [chapters, q, desc]);

  const isFiller = (num: number) => num !== Math.floor(num);

  function downloadSingle(num: number) {
    setDownloading(num);
    window.open(`/print/${num}`, "_blank");
    toast({
      title: "فتح صفحة الطباعة",
      description: `اضغط زر «طباعة / حفظ PDF» لحفظ الفصل ${toArabicDigits(num)}`,
    });
    setTimeout(() => setDownloading(null), 1000);
  }

  return (
    <>
      {/* Search + Reverse toggle */}
      <div className="mb-8 flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برقم الفصل أو عنوانه..."
            className="border-gold/25 bg-muted pr-10 font-naskh transition-all duration-200 focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-gold"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setDesc((d) => !d)}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-gold/25 px-4 text-sm text-gold/80 transition-colors hover:border-gold/50 hover:text-gold"
          title={desc ? "عرض تصاعدي (1 → الأعلى)" : "عرض تنازلي (الأعلى → 1)"}
        >
          {desc ? "تنازلي" : "تصاعدي"}
        </button>
      </div>

      {q.trim() && (
        <div className="mb-4 text-center text-sm text-muted-foreground">
          نتائج البحث عن «<span className="font-bold text-gold">{q.trim()}</span>»:{" "}
          <span className="font-bold text-gold">{toArabicDigits(filtered.length)}</span> فصل
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="gold-card animate-float-in rounded-lg p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gold/30" />
          <p className="font-naskh text-lg text-muted-foreground">
            لا توجد نتائج مطابقة
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ch) => {
            const filler = isFiller(ch.number);
            return (
              <div
                key={ch.id}
                className={`gold-card group flex items-center gap-3 rounded-lg p-4 transition-all ${
                  filler ? "border-purple/20" : ""
                }`}
              >
                <Link
                  href={`/chapters/${ch.number}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  {/* Chapter number box — responsive for decimals */}
                  <div
                    className={`flex shrink-0 flex-col items-center justify-center rounded-md border bg-muted px-2 py-1 ${
                      filler
                        ? "border-purple/40 min-w-[3.5rem]"
                        : "border-gold/30 h-14 w-14"
                    }`}
                  >
                    <span
                      className={`uppercase tracking-wider text-gold/50 ${
                        filler ? "text-[7px]" : "text-[9px]"
                      }`}
                    >
                      {filler ? "فلر" : "فصل"}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        filler ? "text-sm text-purple" : "text-lg text-gold"
                      }`}
                    >
                      {toArabicDigits(ch.number)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-naskh text-lg font-bold text-foreground transition-colors group-hover:text-gold">
                      {ch.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {toArabicDigits(ch.wordCount)} كلمة
                      </span>
                      <span>{formatArabicDate(ch.createdAt)}</span>
                    </div>
                  </div>
                </Link>

                <button
                  onClick={() => downloadSingle(ch.number)}
                  disabled={downloading === ch.number}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gold/25 text-gold/70 transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold disabled:opacity-50"
                  title="تحميل هذا الفصل PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!q.trim() && (
        <div className="mt-8 py-4 text-center text-xs text-muted-foreground">
          ✦ {toArabicDigits(filtered.length)} فصل — كل الفصول محملة ✦
        </div>
      )}
    </>
  );
}
