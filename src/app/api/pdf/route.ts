import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateChapterPDF,
  generateCombinedPDF,
} from "@/lib/pdf-generator";

export const dynamic = "force-dynamic";

// PDF generation with Playwright can take a few seconds per chapter, especially
// on the first request while Chromium warms up. 60s gives plenty of headroom.
export const maxDuration = 60;

/** Parse ?chapters=1,2,3 (or "1" / "1 2 3") into a sorted unique list. */
function parseChapterList(raw: string | null): number[] {
  if (!raw) return [];
  const nums = raw
    .split(/[\s,]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function toArabicDigits(input: number | string): string {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(input).replace(/[0-9]/g, (d) => map[Number(d)]);
}

/** Build a Content-Disposition header value with a URL-safe fallback filename. */
function contentDisposition(filename: string): string {
  // RFC 5987 — `filename*` lets us ship a UTF-8 Arabic filename; the ASCII
  // `filename=` fallback is for older browsers.
  const ascii = "chapters.pdf";
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * GET /api/pdf?chapters=1,2,3&mode=combined
 * GET /api/pdf?chapters=5&mode=single
 * GET /api/pdf?chapters=1,2,3&mode=separate  → returns JSON download URLs
 *
 * Public (anyone can download — personal site).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") || "combined").toLowerCase();
  const chapters = parseChapterList(searchParams.get("chapters"));

  if (chapters.length === 0) {
    return NextResponse.json(
      { error: "لم يتم تحديد أي فصل" },
      { status: 400 }
    );
  }

  // Fetch all requested chapters in one query.
  const rows = await db.chapter.findMany({
    where: { number: { in: chapters } },
    select: { number: true, title: true, content: true },
  });

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "لم يتم العثور على الفصول المطلوبة" },
      { status: 404 }
    );
  }

  // Sort rows to match the requested order so the combined PDF reads naturally.
  rows.sort((a, b) => a.number - b.number);

  // --- mode=separate: return a JSON list of per-chapter download URLs -------
  if (mode === "separate" && chapters.length > 1) {
    const downloads = rows.map((r) => ({
      number: r.number,
      title: r.title,
      url: `/api/pdf?chapters=${r.number}&mode=single`,
    }));
    return NextResponse.json({ downloads });
  }

  // --- Generate the actual PDF buffer ---------------------------------------
  try {
    if (mode === "single" || rows.length === 1) {
      // Only the first requested chapter is used in single mode.
      const chapter = rows[0];
      const buffer = await generateChapterPDF(chapter);

      const filename = `سيد-الحقيقة-الفصل-${toArabicDigits(chapter.number)}.pdf`;
      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": contentDisposition(filename),
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // Default: combined
    const buffer = await generateCombinedPDF(rows);
    const range =
      rows.length === 1
        ? `الفصل-${toArabicDigits(rows[0].number)}`
        : `الفصول-${toArabicDigits(rows[0].number)}-${toArabicDigits(
            rows[rows.length - 1].number
          )}`;
    const filename = `سيد-الحقيقة-${range}.pdf`;
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[/api/pdf] generation failed:", err);
    return NextResponse.json(
      {
        error:
          "تعذّر توليد ملف PDF. حاول مرة أخرى لاحقاً. (Playwright/Chromium error)",
      },
      { status: 500 }
    );
  }
}
