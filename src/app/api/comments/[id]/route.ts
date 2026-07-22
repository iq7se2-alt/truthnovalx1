import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** DELETE /api/comments/[id] — delete a comment by id. No auth (personal site). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) {
    return Response.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const existing = await db.comment.findUnique({ where: { id: numeric } });
  if (!existing) {
    return Response.json({ error: "التعليق غير موجود" }, { status: 404 });
  }

  await db.comment.delete({ where: { id: numeric } });
  return Response.json({ ok: true });
}
