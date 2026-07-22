import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DAILY_BONUS } from "@/lib/truth-coins";

export const dynamic = "force-dynamic";

/**
 * POST /api/user/init
 * Body: { userId: string, nickname: string }
 * - Upserts the user (creates with coins=0 if new, otherwise updates nickname).
 * - Applies a once-per-day login bonus of 5 coins using a DailyWordClaim
 *   row with chapterId=0 as the "login" marker.
 * - Returns: { id, nickname, coins, receivedBonus }
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string; nickname?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const userId = (body.userId || "").trim();
  const nickname = (body.nickname || "").trim();

  if (!userId) {
    return Response.json({ error: "معرّف المستخدم مطلوب" }, { status: 400 });
  }
  if (nickname.length < 1 || nickname.length > 50) {
    return Response.json(
      { error: "الاسم يجب أن يكون بين ١ و ٥٠ حرفاً" },
      { status: 400 }
    );
  }

  // Admin gets 10M coins, normal users start with 0
  const ADMIN_NICKNAMES = ["admin", "أدمن", "Admin", "ADMIN", "مالك"];
  const isAdmin = ADMIN_NICKNAMES.includes(nickname);
  const ADMIN_COINS = 10_000_000;

  // Upsert user (update nickname if exists, create with coins=0 if new)
  const user = await db.user.upsert({
    where: { id: userId },
    update: { nickname, ...(isAdmin ? { coins: ADMIN_COINS } : {}) },
    create: { id: userId, nickname, coins: isAdmin ? ADMIN_COINS : 0 },
  });

  // Daily bonus check using chapterId=0 as the "login" marker.
  // DailyWordClaim has @@unique([userId, chapterId]) so we reuse a single row
  // and refresh claimedAt when the bonus is granted on a new day.
  const today = new Date();
  const todayStr = today.toDateString();

  const existingLogin = await db.dailyWordClaim.findUnique({
    where: { userId_chapterId: { userId: user.id, chapterId: 0 } },
  });

  let receivedBonus = false;
  if (!existingLogin) {
    await db.dailyWordClaim.create({
      data: { userId: user.id, chapterId: 0, claimedAt: today },
    });
    receivedBonus = true;
  } else if (existingLogin.claimedAt.toDateString() !== todayStr) {
    await db.dailyWordClaim.update({
      where: { id: existingLogin.id },
      data: { claimedAt: today },
    });
    receivedBonus = true;
  }

  if (receivedBonus) {
    await db.user.update({
      where: { id: user.id },
      data: { coins: { increment: DAILY_BONUS } },
    });
  }

  const refreshed = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, nickname: true, coins: true },
  });

  return Response.json({
    id: refreshed?.id ?? user.id,
    nickname: refreshed?.nickname ?? nickname,
    coins: refreshed?.coins ?? user.coins,
    receivedBonus,
  });
}
