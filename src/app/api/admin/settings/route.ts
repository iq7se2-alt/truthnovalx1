import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";

/** PUT /api/admin/settings — update site settings (cover URL, title, description). */
export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();

  let body: {
    coverImageUrl?: string;
    novelTitle?: string;
    novelTitleEn?: string;
    novelDescription?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const data: {
    coverImageUrl?: string | null;
    novelTitle?: string;
    novelTitleEn?: string;
    novelDescription?: string;
  } = {};

  if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl.trim() || null;
  if (body.novelTitle !== undefined) data.novelTitle = body.novelTitle.trim();
  if (body.novelTitleEn !== undefined) data.novelTitleEn = body.novelTitleEn.trim();
  if (body.novelDescription !== undefined) data.novelDescription = body.novelDescription.trim();

  const settings = await db.siteSettings.upsert({
    where: { id: 1 },
    update: data,
    create: {
      id: 1,
      coverImageUrl: data.coverImageUrl ?? "/cover.jpg",
      novelTitle: data.novelTitle ?? "سيد الحقيقة",
      novelTitleEn: data.novelTitleEn ?? "Lord of the Truth",
      novelDescription:
        data.novelDescription ??
        "روبين بورتون، شاب وُلد فوجد نفسه لديه الموهبة والعائلة القوية والذكاء — ما عدا شيء واحد.. الرغبة في استعمال كل هذا!",
    },
  });

  return Response.json({ settings });
}
