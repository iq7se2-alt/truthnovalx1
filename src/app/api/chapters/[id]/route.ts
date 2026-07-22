import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/chapters/[id] — single chapter by number (or numeric id), increments views. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numeric = Number(id);

  const chapter = await db.chapter.findFirst({
    where: Number.isFinite(numeric)
      ? { OR: [{ number: numeric }, { id: numeric }] }
      : { id: 0 },
    orderBy: { number: "asc" },
  });

  if (!chapter) {
    return Response.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  // Fetch siblings for prev/next navigation (by number ordering)
  const [prev, next] = await Promise.all([
    db.chapter.findFirst({
      where: { number: { lt: chapter.number } },
      orderBy: { number: "desc" },
      select: { number: true, title: true },
    }),
    db.chapter.findFirst({
      where: { number: { gt: chapter.number } },
      orderBy: { number: "asc" },
      select: { number: true, title: true },
    }),
  ]);

  // NOTE: View counting is handled in the page component (chapters/[id]/page.tsx).
  // The API only returns data — it does NOT increment views to avoid double-counting.

  return Response.json({
    chapter: {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      content: chapter.content,
      wordCount: chapter.wordCount,
      views: chapter.views,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
      coverImageUrl: chapter.coverImageUrl,
    },
    prev,
    next,
  });
}
