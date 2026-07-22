import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/settings — public site settings (cover + description). */
export async function GET() {
  let settings = await db.siteSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await db.siteSettings.create({
      data: {
        id: 1,
        coverImageUrl: "/cover.jpg",
        novelTitle: "سيد الحقيقة",
        novelTitleEn: "Lord of the Truth",
        novelDescription:
          "روبين بورتون، شاب وُلد فوجد نفسه لديه الموهبة والعائلة القوية والذكاء — ما عدا شيء واحد.. الرغبة في استعمال كل هذا!",
      },
    });
  }
  return Response.json({ settings });
}
