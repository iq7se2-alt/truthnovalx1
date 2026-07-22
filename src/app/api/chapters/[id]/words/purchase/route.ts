import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getDiscountedPrice } from "@/lib/daily-discount";

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
 * POST /api/chapters/[id]/words/purchase
 * Body: { userId, wordIndex, wordText, tier, color?, styleId? }
 * - Validates tier is 2-5 and uses TIERS[tier].price for the cost.
 * - Checks the user has enough coins and the word is not already owned.
 * - Deducts coins from the User and creates the OwnedWord atomically.
 * - Broadcasts word-update event to the socket server after the DB write.
 * - Returns: { word, remainingCoins }
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
    tier?: number;
    color?: string;
    styleId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const userId = (body.userId || "").trim();
  const wordIndex = Number(body.wordIndex);
  const wordText = (body.wordText || "").trim();
  const tier = Number(body.tier);
  const color = (body.color || "").trim() || null;
  const styleId = (body.styleId || "").trim() || null;

  if (!userId) {
    return Response.json({ error: "معرّف المستخدم مطلوب" }, { status: 400 });
  }
  if (!Number.isFinite(wordIndex) || wordIndex < 0) {
    return Response.json({ error: "مؤشر الكلمة غير صالح" }, { status: 400 });
  }
  if (!wordText) {
    return Response.json({ error: "نص الكلمة مطلوب" }, { status: 400 });
  }
  if (!Number.isInteger(tier) || tier < 2 || tier > 5) {
    return Response.json(
      { error: "المستوى يجب أن يكون بين ٢ و ٥" },
      { status: 400 }
    );
  }

  // Daily discount is applied server-side as the source of truth.
  // The client computes the same value via getDiscountedPrice() for display.
  const price = getDiscountedPrice(tier);

  // Fetch user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true, coins: true },
  });
  if (!user) {
    return Response.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  // Verify word is not already owned
  const existingWord = await db.ownedWord.findUnique({
    where: { chapterId_wordIndex: { chapterId, wordIndex } },
  });
  if (existingWord) {
    return Response.json(
      { error: "هذه الكلمة مملوكة بالفعل" },
      { status: 409 }
    );
  }

  // Check coins
  if (user.coins < price) {
    return Response.json(
      { error: "لا تملك عملات كافية" },
      { status: 402 }
    );
  }

  // Deduct coins and create OwnedWord atomically
  const [updatedUser, ownedWord] = await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { coins: { decrement: price } },
      select: { coins: true },
    }),
    db.ownedWord.create({
      data: {
        userId,
        chapterId,
        wordIndex,
        wordText,
        tier,
        color,
        styleId,
      },
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
        tier,
        color,
        styleId,
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
      styleId: ownedWord.styleId,
      owner: { nickname: user.nickname },
    },
    remainingCoins: updatedUser.coins,
  });
}
