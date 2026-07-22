import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/** GET /api/locations — public list */
export async function GET() {
  const locations = await db.location.findMany({
    orderBy: { startChapter: "asc" },
  });
  return Response.json({ locations });
}

/** POST /api/locations — admin only */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();
  let body: {
    name?: string;
    description?: string;
    imageUrl?: string;
    posX?: number;
    posY?: number;
    startChapter?: number;
    endChapter?: number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const name = (body.name || "").trim();
  if (!name) return Response.json({ error: "الاسم مطلوب" }, { status: 400 });

  const exists = await db.location.findUnique({ where: { name } });
  if (exists) return Response.json({ error: "الاسم مستخدم" }, { status: 409 });

  const location = await db.location.create({
    data: {
      name,
      description: body.description?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
      posX: body.posX ?? 50,
      posY: body.posY ?? 50,
      startChapter: body.startChapter ?? 1,
      endChapter: body.endChapter ?? null,
    },
  });
  return Response.json({ location }, { status: 201 });
}
