import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PrintPageContent } from "./print-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ids: string }>;
}): Promise<Metadata> {
  const { ids } = await params;
  const nums = ids.split(",").map(Number).filter(Boolean);
  if (nums.length === 0) return { title: "طباعة | سيد الحقيقة" };
  return {
    title: `طباعة الفصول ${nums.join(", ")} | سيد الحقيقة`,
  };
}

export default async function PrintPage({
  params,
}: {
  params: Promise<{ ids: string }>;
}) {
  const { ids } = await params;
  // Decode URL-encoded characters (e.g. %2C → ,) since Next.js may encode
  // commas in dynamic route segments.
  const decoded = decodeURIComponent(ids);
  const nums = decoded
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (nums.length === 0) notFound();

  const chapters = await db.chapter.findMany({
    where: { number: { in: nums } },
    orderBy: { number: "asc" },
    select: { number: true, title: true, content: true },
  });

  if (chapters.length === 0) notFound();

  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="UTF-8" />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Noto Naskh Arabic', 'Cairo', serif;
            background: #faf7f0;
            color: #1a1a2e;
            line-height: 2.2;
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
          }
          .print-bar {
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 100;
            display: flex;
            gap: 0.5rem;
          }
          .print-bar button {
            background: #c9a84c;
            color: #1a0a00;
            border: none;
            padding: 0.6rem 1.2rem;
            border-radius: 6px;
            font-family: 'Cairo', sans-serif;
            font-weight: 600;
            cursor: pointer;
            font-size: 0.9rem;
          }
          .print-bar button:hover { background: #d4b05e; }
          .print-bar a {
            background: transparent;
            color: #666;
            border: 1px solid #ccc;
            padding: 0.6rem 1.2rem;
            border-radius: 6px;
            text-decoration: none;
            font-family: 'Cairo', sans-serif;
            font-size: 0.9rem;
          }
          .doc-header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 1.5rem;
            border-bottom: 2px solid #c9a84c;
          }
          .doc-header h1 {
            font-family: 'Cairo', sans-serif;
            font-size: 1.8rem;
            color: #8b6f1f;
            font-weight: 700;
          }
          .doc-header .sub {
            font-size: 0.85rem;
            color: #888;
            margin-top: 0.3rem;
          }
          .chapter {
            margin-bottom: 3rem;
            page-break-after: always;
          }
          .chapter:last-child { page-break-after: auto; }
          .chapter-header {
            text-align: center;
            margin-bottom: 2rem;
          }
          .chapter-eyebrow {
            font-size: 0.75rem;
            color: #8b6f1f;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-bottom: 0.5rem;
          }
          .chapter-title {
            font-family: 'Cairo', sans-serif;
            font-size: 1.6rem;
            font-weight: 700;
            color: #1a1a2e;
          }
          .chapter-rule {
            width: 60px;
            height: 2px;
            background: #c9a84c;
            margin: 1rem auto;
          }
          .chapter-body p {
            margin-bottom: 1.2em;
            text-align: justify;
            text-justify: inter-word;
          }
          @media print {
            .print-bar { display: none; }
            body { background: white; padding: 0; max-width: none; }
            @page { size: A4; margin: 2cm; }
          }
        `}</style>
      </head>
      <body>
        <PrintPageContent chapters={chapters} />
      </body>
    </html>
  );
}
