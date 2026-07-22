import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/[userId]/coins
 * Returns the user's current coin balance, or 404 if the user does not exist.
 * Response: { coins }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });

  if (!user) {
    return Response.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  return Response.json({ coins: user.coins });
}
