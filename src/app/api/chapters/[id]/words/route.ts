import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Helper: resolve a chapter id (Int PK) from a route slug (number or id). */
async function resolveChapterId(slug: string): Promise<number | null> {
  const numeric = Number(slug);
  if (!Number.isFinite(numeric)) return null;
  const chapter = await db.chapter.findFirst({
    where: { OR: [{ number: numeric }, { id: numeric }] },
    select: { id: true },
  });
  return chapter?.id ?? null;
}

/**
 * GET /api/chapters/[id]/words
 * Returns all OwnedWords for the chapter (resolved by number or id) along
 * with the owner's nickname.
 * Response: { words: [{ id, wordIndex, wordText, tier, color, styleId,
 *                        owner: { nickname, userId } }] }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chapterId = await resolveChapterId(id);

  if (chapterId === null) {
    return Response.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  const ownedWords = await db.ownedWord.findMany({
    where: { chapterId },
    orderBy: { wordIndex: "asc" },
    include: {
      user: { select: { nickname: true, id: true } },
    },
  });

  const words = ownedWords.map((w) => ({
    id: w.id,
    wordIndex: w.wordIndex,
    wordText: w.wordText,
    tier: w.tier,
    color: w.color,
    styleId: w.styleId,
    owner: {
      nickname: w.user.nickname,
      userId: w.user.id,
    },
  }));

  return Response.json({ words });
}
