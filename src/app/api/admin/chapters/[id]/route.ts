import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";
import { countWords } from "@/lib/format";

/** PUT /api/admin/chapters/[id] — update a chapter (by number or id) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) return unauthorized();

  const { id } = await params;
  const numeric = Number(id);

  let body: { number?: number; title?: string; content?: string; coverImageUrl?: string | null; recap?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const existing = await db.chapter.findFirst({
    where: Number.isFinite(numeric)
      ? { OR: [{ number: numeric }, { id: numeric }] }
      : { id: 0 },
  });
  if (!existing) {
    return Response.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  const data: {
    number?: number;
    title?: string;
    content?: string;
    wordCount?: number;
    coverImageUrl?: string | null;
    recap?: string | null;
  } = {};

  if (body.number !== undefined) {
    const num = Number(body.number);
    if (!Number.isFinite(num) || num < 1) {
      return Response.json({ error: "رقم الفصل غير صالح" }, { status: 400 });
    }
    if (num !== existing.number) {
      const clash = await db.chapter.findUnique({ where: { number: num } });
      if (clash) {
        return Response.json({ error: "رقم الفصل مستخدم بالفعل" }, { status: 409 });
      }
      data.number = num;
    }
  }
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return Response.json({ error: "عنوان الفصل مطلوب" }, { status: 400 });
    }
    data.title = title;
  }
  if (body.content !== undefined) {
    data.content = body.content;
    data.wordCount = countWords(body.content);
  }
  if (body.coverImageUrl !== undefined) {
    data.coverImageUrl = body.coverImageUrl === null ? null : body.coverImageUrl.trim() || null;
  }
  if (body.recap !== undefined) {
    data.recap = body.recap === null ? null : body.recap.trim() || null;
  }

  const chapter = await db.chapter.update({
    where: { id: existing.id },
    data,
  });

  return Response.json({ chapter });
}

/** DELETE /api/admin/chapters/[id] — delete a chapter */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) return unauthorized();

  const { id } = await params;
  const numeric = Number(id);

  const existing = await db.chapter.findFirst({
    where: Number.isFinite(numeric)
      ? { OR: [{ number: numeric }, { id: numeric }] }
      : { id: 0 },
  });
  if (!existing) {
    return Response.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  await db.chapter.delete({ where: { id: existing.id } });
  return Response.json({ ok: true });
}
