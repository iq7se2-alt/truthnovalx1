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
 * POST /api/chapters/[id]/words/claim-free
 * Body: { userId, wordIndex, wordText, color }
 * - Resolves chapter by number to get chapterId.
 * - Verifies: user exists, hasn't claimed free word in this chapter
 *   (DailyWordClaim), word not already owned (OwnedWord unique on
 *   [chapterId, wordIndex]).
 * - Creates OwnedWord with tier=1 and a DailyWordClaim row.
 * - Broadcasts word-update event to the socket server after the DB write.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chapterId = await resolveChapterId(id);

  if (chapterId === null) {
    return Response.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  let body: {
    userId?: string;
    wordIndex?: number;
    wordText?: string;
    color?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const userId = (body.userId || "").trim();
  const wordIndex = Number(body.wordIndex);
  const wordText = (body.wordText || "").trim();
  const color = (body.color || "").trim();

  if (!userId) {
    return Response.json({ error: "معرّف المستخدم مطلوب" }, { status: 400 });
  }
  if (!Number.isFinite(wordIndex) || wordIndex < 0) {
    return Response.json({ error: "مؤشر الكلمة غير صالح" }, { status: 400 });
  }
  if (!wordText) {
    return Response.json({ error: "نص الكلمة مطلوب" }, { status: 400 });
  }
  if (!color) {
    return Response.json({ error: "اللون مطلوب" }, { status: 400 });
  }

  // Verify user exists
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true },
  });
  if (!user) {
    return Response.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  // Verify no existing free claim for this chapter (DailyWordClaim unique on [userId, chapterId])
  const existingClaim = await db.dailyWordClaim.findUnique({
    where: { userId_chapterId: { userId, chapterId } },
  });
  if (existingClaim) {
    return Response.json(
      { error: "لقد قمت بالفعل بطلب كلمة مجانية في هذا الفصل" },
      { status: 409 }
    );
  }

  // Verify word not already owned (OwnedWord unique on [chapterId, wordIndex])
  const existingWord = await db.ownedWord.findUnique({
    where: { chapterId_wordIndex: { chapterId, wordIndex } },
  });
  if (existingWord) {
    return Response.json(
      { error: "هذه الكلمة مملوكة بالفعل" },
      { status: 409 }
    );
  }

  // Create OwnedWord (tier=1) and DailyWordClaim atomically
  const [ownedWord] = await db.$transaction([
    db.ownedWord.create({
      data: {
        userId,
        chapterId,
        wordIndex,
        wordText,
        tier: 1,
        color,
      },
    }),
    db.dailyWordClaim.create({
      data: { userId, chapterId },
    }),
  ]);

  // Broadcast to socket server (fire-and-forget)
  fetch("http://localhost:3003/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room: `chapter-${chapterId}`,
      event: "word-update",
      data: {
        wordIndex,
        wordText,
        tier: 1,
        color,
        nickname: user.nickname,
        userId: user.id,
      },
    }),
  }).catch(() => {});

  return Response.json({
    word: {
      id: ownedWord.id,
      wordIndex: ownedWord.wordIndex,
      wordText: ownedWord.wordText,
      tier: ownedWord.tier,
      color: ownedWord.color,
      owner: { nickname: user.nickname },
    },
  });
}
