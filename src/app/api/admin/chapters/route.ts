import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";
import { countWords } from "@/lib/format";

/** GET /api/admin/chapters — all chapter metadata (admin only). */
export async function GET() {
  if (!(await isAuthenticated())) return unauthorized();
  const chapters = await db.chapter.findMany({
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      title: true,
      wordCount: true,
      views: true,
      createdAt: true,
      updatedAt: true,
      coverImageUrl: true,
      recap: true,
    },
  });
  return Response.json({ chapters });
}

/** POST /api/admin/chapters — create a chapter */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();

  let body: { number?: number; title?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const number = Number(body.number);
  const title = (body.title || "").trim();
  const content = body.content || "";

  if (!Number.isFinite(number) || number < 1) {
    return Response.json({ error: "رقم الفصل غير صالح" }, { status: 400 });
  }
  if (!title) {
    return Response.json({ error: "عنوان الفصل مطلوب" }, { status: 400 });
  }

  const exists = await db.chapter.findUnique({ where: { number } });
  if (exists) {
    return Response.json({ error: "رقم الفصل مستخدم بالفعل" }, { status: 409 });
  }

  const chapter = await db.chapter.create({
    data: {
      number,
      title,
      content,
      wordCount: countWords(content),
    },
  });

  return Response.json({ chapter }, { status: 201 });
}
