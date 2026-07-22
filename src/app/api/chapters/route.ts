import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/chapters?page=1&q=...  — chapter list with server-side pagination. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = 50;
  const q = (searchParams.get("q") || "").trim();
  const sort = searchParams.get("sort") === "desc" ? "desc" : "asc";

  const where = q
    ? {
        OR: [
          { title: { contains: q } },
          ...(Number.isFinite(Number(q))
            ? [{ number: Number(q) }]
            : []),
        ],
      }
    : {};

  const [total, chapters] = await Promise.all([
    db.chapter.count({ where }),
    db.chapter.findMany({
      where,
      orderBy: { number: sort },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        number: true,
        title: true,
        wordCount: true,
        views: true,
        createdAt: true,
        coverImageUrl: true,
      },
    }),
  ]);

  return Response.json({
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    chapters,
  });
}
