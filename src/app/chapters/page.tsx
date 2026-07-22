import { db } from "@/lib/db";
import Link from "next/link";
import { Search, BookOpen, Hash, Download, Sparkles } from "lucide-react";
import { formatArabicDate, toArabicDigits } from "@/lib/format";
import { ChaptersListClient } from "@/components/site/chapters-list-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "قائمة الفصول | سيد الحقيقة",
  description: "فهرس جميع فصول رواية سيد الحقيقة",
};

export default async function ChaptersPage() {
  // Fetch ALL chapters at once (server-side) — no lazy loading
  const [chapters, total, fillerCount] = await Promise.all([
    db.chapter.findMany({
      orderBy: { number: "desc" },
      select: {
        id: true,
        number: true,
        title: true,
        wordCount: true,
        views: true,
        createdAt: true,
      },
    }),
    db.chapter.count(),
    db.chapter.count({
      where: {
        OR: Array.from({ length: 10 }, (_, i) => ({
          number: { gte: i + 0.1, lte: i + 0.99 },
        })),
      },
    }),
  ]);

  const regularCount = total - fillerCount;
  const isFiller = (num: number) => num !== Math.floor(num);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <BookOpen className="h-3.5 w-3.5" />
          فهرس الرواية
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient">
          قائمة الفصول
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-bold text-gold">{toArabicDigits(regularCount)}</span>{" "}
          فصل
          {" · "}
          <span className="inline-flex items-center gap-1 text-gold/70">
            <Sparkles className="h-3 w-3" />
            {toArabicDigits(fillerCount)} فلر
          </span>
        </p>
      </div>

      {/* Client-side search filter (no re-fetching) */}
      <ChaptersListClient chapters={chapters} />

      {/* Footer note */}
      <div className="mt-12 text-center text-xs text-muted-foreground">
        <Link href="/" className="text-gold/60 hover:text-gold">
          ← العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
