import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/** PUT /api/locations/[id] — admin only */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const numId = Number(id);
  let body: {
    name?: string;
    description?: string;
    imageUrl?: string;
    posX?: number;
    posY?: number;
    startChapter?: number;
    endChapter?: number;
  };
  try { body = await req.json(); } catch { return Response.json({ error: "طلب غير صالح" }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description.trim() || null;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl.trim() || null;
  if (body.posX !== undefined) data.posX = body.posX;
  if (body.posY !== undefined) data.posY = body.posY;
  if (body.startChapter !== undefined) data.startChapter = body.startChapter;
  if (body.endChapter !== undefined) data.endChapter = body.endChapter || null;

  const location = await db.location.update({ where: { id: numId }, data });
  return Response.json({ location });
}

/** DELETE /api/locations/[id] — admin only */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const numId = Number(id);
  await db.location.delete({ where: { id: numId } });
  return Response.json({ ok: true });
}
