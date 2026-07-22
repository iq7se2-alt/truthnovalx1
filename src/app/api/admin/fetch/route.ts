import { NextRequest } from "next/server";
import { isAuthenticated, unauthorized } from "@/lib/server-auth";
import {
  fetchChapterByNumber,
  fetchChapters,
  upsertFetchedChapter,
} from "@/lib/fetcher";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for bulk fetches

/** POST /api/admin/fetch
 * Body: { number?: number } — re-fetch a single chapter by number
 *    OR { all?: true, count?: number } — fetch from ch1 for `count` chapters (default 10)
 */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return unauthorized();

  let body: { number?: number; all?: boolean; count?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  // Single chapter re-fetch
  if (body.number) {
    const num = Number(body.number);
    if (!Number.isFinite(num) || num < 1) {
      return Response.json({ error: "رقم فصل غير صالح" }, { status: 400 });
    }

    const fetched = await fetchChapterByNumber(num);
    if (!fetched) {
      return Response.json(
        { error: `تعذّر سحب الفصل ${num} من الموقع الأصلي` },
        { status: 502 }
      );
    }

    const chapter = await upsertFetchedChapter(fetched);
    return Response.json({
      ok: true,
      chapter: {
        number: chapter.number,
        title: chapter.title,
        wordCount: chapter.wordCount,
      },
    });
  }

  // Bulk fetch
  if (body.all || body.count) {
    const count = Math.min(body.count || 10, 500);
    const fetched = await fetchChapters(count);

    const results: Array<{ number: number; title: string; ok: boolean }> = [];
    for (const ch of fetched) {
      await upsertFetchedChapter(ch);
      results.push({ number: ch.number, title: ch.title, ok: true });
    }

    return Response.json({
      ok: true,
      fetched: results.length,
      chapters: results,
    });
  }

  return Response.json(
    { error: "حدد فصلاً أو اطلب السحب الكلي" },
    { status: 400 }
  );
}
