import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/** GET /api/characters — public list of all characters with chapter appearances. */
export async function GET() {
  const characters = await db.character.findMany({
    orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    include: {
      appearances: {
        include: {
          chapter: {
            select: { number: true, title: true },
          },
        },
        orderBy: { paragraphIndex: "asc" },
      },
    },
  });
  return Response.json({ characters });
}

/** POST /api/characters — create a new character (admin only). */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();

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

  const name = (body.name || "").trim();
  if (!name) {
    return Response.json({ error: "اسم الشخصية مطلوب" }, { status: 400 });
  }

  const exists = await db.character.findUnique({ where: { name } });
  if (exists) {
    return Response.json(
      { error: "اسم الشخصية مستخدم بالفعل" },
      { status: 409 }
    );
  }

  const data = {
    name,
    nameEn: body.nameEn?.trim() || null,
    description: body.description?.trim() || null,
    imageUrl: body.imageUrl?.trim() || null,
    color: body.color?.trim() || null,
    isMain: !!body.isMain,
  };

  const character = await db.character.create({ data });
  return Response.json({ character }, { status: 201 });
}
