import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/chapters/[id]/comments — list all comments for a chapter (by number or id), oldest first. Public. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numeric = Number(id);

  const chapter = await db.chapter.findFirst({
    where: Number.isFinite(numeric)
      ? { OR: [{ number: numeric }, { id: numeric }] }
      : { id: 0 },
    select: { id: true },
  });

  if (!chapter) {
    return Response.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  const comments = await db.comment.findMany({
    where: { chapterId: chapter.id },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ comments });
}

/** POST /api/chapters/[id]/comments — create a comment. Public (readers can comment). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numeric = Number(id);

  const chapter = await db.chapter.findFirst({
    where: Number.isFinite(numeric)
      ? { OR: [{ number: numeric }, { id: numeric }] }
      : { id: 0 },
    select: { id: true },
  });

  if (!chapter) {
    return Response.json({ error: "الفصل غير موجود" }, { status: 404 });
  }

  let body: { author?: string; content?: string; wordAnchor?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const author = (body.author || "").trim();
  const content = (body.content || "").trim();
  const wordAnchor = (body.wordAnchor || "").trim();

  if (author.length < 1 || author.length > 50) {
    return Response.json(
      { error: "الاسم يجب أن يكون بين ١ و ٥٠ حرفاً" },
      { status: 400 }
    );
  }
  if (content.length < 1 || content.length > 2000) {
    return Response.json(
      { error: "التعليق يجب أن يكون بين ١ و ٢٠٠٠ حرفاً" },
      { status: 400 }
    );
  }

  const comment = await db.comment.create({
    data: {
      chapterId: chapter.id,
      author,
      content,
      wordAnchor: wordAnchor || null,
    },
  });

  return Response.json({ comment }, { status: 201 });
}
