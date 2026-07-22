import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = 50;
  const chapterFilter = searchParams.get("chapter");
  const q = (searchParams.get("q") || "").trim();

  const where: any = {};
  if (chapterFilter) {
    const chNum = Number(chapterFilter);
    if (Number.isFinite(chNum)) {
      const ch = await db.chapter.findFirst({ where: { number: chNum }, select: { id: true } });
      if (ch) where.chapterId = ch.id;
      else where.chapterId = -1;
    }
  }
  if (q) {
    where.OR = [
      { author: { contains: q } },
      { content: { contains: q } },
    ];
  }

  const [total, comments] = await Promise.all([
    db.comment.count({ where }),
    db.comment.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        author: true,
        content: true,
        wordAnchor: true,
        createdAt: true,
        chapter: { select: { number: true, title: true } },
      },
    }),
  ]);

  return Response.json({
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    comments,
  });
}
