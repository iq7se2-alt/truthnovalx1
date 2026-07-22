import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/stats — aggregate site statistics (chapter count, total words). */
export async function GET() {
  const [chapterCount, agg] = await Promise.all([
    db.chapter.count(),
    db.chapter.aggregate({ _sum: { wordCount: true } }),
  ]);

  return Response.json({
    chapters: chapterCount,
    words: agg._sum.wordCount ?? 0,
  });
}
