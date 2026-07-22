import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/** GET /api/characters/[id] — fetch a single character by numeric id. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) {
    return Response.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const character = await db.character.findUnique({ where: { id: numeric } });
  if (!character) {
    return Response.json({ error: "الشخصية غير موجودة" }, { status: 404 });
  }
  return Response.json({ character });
}

/** PUT /api/characters/[id] — update a character (admin only). */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) return unauthorized();

  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) {
    return Response.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const existing = await db.character.findUnique({ where: { id: numeric } });
  if (!existing) {
    return Response.json({ error: "الشخصية غير موجودة" }, { status: 404 });
  }

  let body: {
    name?: string;
    nameEn?: string;
    description?: string;
    imageUrl?: string;
    color?: string;
    isMain?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const data: {
    name?: string;
    nameEn?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    color?: string | null;
    isMain?: boolean;
  } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return Response.json({ error: "اسم الشخصية مطلوب" }, { status: 400 });
    }
    if (name !== existing.name) {
      const clash = await db.character.findUnique({ where: { name } });
      if (clash) {
        return Response.json(
          { error: "اسم الشخصية مستخدم بالفعل" },
          { status: 409 }
        );
      }
    }
    data.name = name;
  }
  if (body.nameEn !== undefined)
    data.nameEn = body.nameEn.trim() || null;
  if (body.description !== undefined)
    data.description = body.description.trim() || null;
  if (body.imageUrl !== undefined)
    data.imageUrl = body.imageUrl.trim() || null;
  if (body.color !== undefined) data.color = body.color.trim() || null;
  if (body.isMain !== undefined) data.isMain = !!body.isMain;

  const character = await db.character.update({
    where: { id: numeric },
    data,
  });
  return Response.json({ character });
}

/** DELETE /api/characters/[id] — delete a character (admin only). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) return unauthorized();

  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) {
    return Response.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const existing = await db.character.findUnique({ where: { id: numeric } });
  if (!existing) {
    return Response.json({ error: "الشخصية غير موجودة" }, { status: 404 });
  }

  await db.character.delete({ where: { id: numeric } });
  return Response.json({ ok: true });
}
