import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/** DELETE /api/character-relations/[id] — admin only */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const numId = Number(id);
  await db.characterRelation.delete({ where: { id: numId } });
  return Response.json({ ok: true });
}
