import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Build a ~80-char snippet around the first occurrence of `query` in
 * `paragraph`. Uses `radius` chars before and after the match. Adds an
 * ellipsis on either side if the snippet doesn't start/end at the paragraph
 * boundary.
 */
function makeSnippet(paragraph: string, query: string, radius = 40): string {
  const lowerP = paragraph.toLowerCase();
  const lowerQ = query.toLowerCase();
  const idx = lowerP.indexOf(lowerQ);

  if (idx === -1) {
    // No match in this paragraph — return a leading slice.
    const slice = paragraph.slice(0, radius * 2).trim();
    return paragraph.length > radius * 2 ? slice + "…" : slice;
  }

  const start = Math.max(0, idx - radius);
  const end = Math.min(paragraph.length, idx + query.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < paragraph.length ? "…" : "";
  return prefix + paragraph.slice(start, end).trim() + suffix;
}

/**
 * GET /api/search?q=...&limit=20
 *
 * Searches chapter titles + content for the query string (SQLite `contains`
 * is case-insensitive for ASCII; Arabic has no case so it works fine).
 *
 * For each matching chapter, returns:
 *   { chapterNumber, chapterTitle, matchCount, matches: [{ paragraphIndex, snippet }] }
 *
 * `matchCount` is the total number of occurrences of `q` in the chapter.
 * `matches` is the top 5 paragraphs that contain `q` (each with a ~80-char
 * snippet around the first occurrence in that paragraph).
 *
 * Returns `{ query, totalChapters, results }`. If `q` is empty or < 2 chars,
 * returns `{ query: "", totalChapters: 0, results: [] }`.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") || "20"))
  );

  if (q.length < 2) {
    return Response.json({ query: "", totalChapters: 0, totalMatches: 0, results: [] });
  }

  const chapters = await db.chapter.findMany({
    where: {
      OR: [{ title: { contains: q } }, { content: { contains: q } }],
    },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      title: true,
      content: true,
    },
    take: limit,
  });

  const lowerQ = q.toLowerCase();

  const results = chapters
    .map((ch) => {
      // Same paragraph-splitting logic as ReaderView + findSearchPositions.
      const paragraphs = ch.content
        .split(/\n\s*\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

      let matchCount = 0;
      const matches: Array<{ paragraphIndex: number; snippet: string }> = [];

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const lowerP = p.toLowerCase();

        // Count every occurrence in this paragraph.
        let from = 0;
        for (;;) {
          const idx = lowerP.indexOf(lowerQ, from);
          if (idx === -1) break;
          matchCount++;
          from = idx + lowerQ.length;
        }

        // Collect up to 5 paragraph-level matches (snippet around first hit).
        if (matches.length < 5 && lowerP.includes(lowerQ)) {
          matches.push({ paragraphIndex: i, snippet: makeSnippet(p, q) });
        }
      }

      return {
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        matchCount,
        matches,
      };
    })
    .filter((r) => r.matchCount > 0);

  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);

  return Response.json({
    query: q,
    totalChapters: results.length,
    totalMatches,
    results,
  });
}
