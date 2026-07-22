import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/** GET /api/character-relations — public list with character names */
export async function GET() {
  const relations = await db.characterRelation.findMany({
    include: {
      from: { select: { id: true, name: true, imageUrl: true, isMain: true } },
      to: { select: { id: true, name: true, imageUrl: true, isMain: true } },
    },
  });
  return Response.json({ relations });
}

/** POST /api/character-relations — admin only */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();
  let body: { fromId?: number; toId?: number; type?: string; description?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "طلب غير صالح" }, { status: 400 }); }

  if (!body.fromId || !body.toId || !body.type?.trim())
    return Response.json({ error: "البيانات ناقصة" }, { status: 400 });

  const relation = await db.characterRelation.create({
    data: {
      fromId: body.fromId,
      toId: body.toId,
      type: body.type.trim(),
      description: body.description?.trim() || null,
    },
    include: {
      from: { select: { id: true, name: true, imageUrl: true, isMain: true } },
      to: { select: { id: true, name: true, imageUrl: true, isMain: true } },
    },
  });
  return Response.json({ relation }, { status: 201 });
}
