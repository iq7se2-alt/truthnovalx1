import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/user/[userId]/coins/add
 * Admin-only endpoint that adds coins to a user's balance.
 * Body: { amount: number }
 * Response: { coins }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAuthenticated())) return unauthorized();

  const { userId } = await params;

  let body: { amount?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount === 0) {
    return Response.json(
      { error: "المبلغ يجب أن يكون عدداً صحيحاً غير صفري" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!existing) {
    return Response.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data:
      amount > 0
        ? { coins: { increment: amount } }
        : { coins: { decrement: Math.abs(amount) } },
    select: { coins: true },
  });

  return Response.json({ coins: updated.coins });
}
