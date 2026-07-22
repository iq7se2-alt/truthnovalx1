/**
 * PDF generation utilities for "سيد الحقيقة / Lord of the Truth".
 *
 * Renders Arabic chapter content to a styled HTML page and asks Playwright
 * (headless Chromium) to produce a PDF buffer via `page.pdf()`. Chromium's
 * text-shaping engine handles Arabic letter-joining, RTL bidi, and ligatures
 * correctly — this is why we prefer Playwright over PDFKit/puppeteer-core
 * (which can't shape Arabic on its own).
 *
 * Exports:
 *   - generateChapterPDF(chapter)   → single-chapter PDF Buffer
 *   - generateCombinedPDF(chapters) → one PDF with all chapters back-to-back
 *   - closeBrowser()                → teardown (mainly for tests)
 */

import { chromium, type Browser, type BrowserContext } from "playwright";

export type ChapterForPDF = {
  number: number;
  title: string;
  content: string;
};

// ---------------------------------------------------------------------------
// Singleton browser — launch once, reuse across requests. The dev server is a
// long-running Next.js process (`bun run dev`), so keeping a single Chromium
// instance alive across requests is both fast and economical.
// ---------------------------------------------------------------------------

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    // If launch ever fails, clear the cache so the next caller retries fresh.
    browserPromise.catch(() => {
      browserPromise = null;
    });
  }
  return browserPromise;
}

/** Warm up the browser singleton so the first PDF request is fast. */
export async function warmupBrowser(): Promise<void> {
  try {
    const browser = await getBrowser();
    // Verify the browser is alive by creating a blank page
    const page = await browser.newPage();
    await page.close();
  } catch {
    // Silent — will retry on first real request
    browserPromise = null;
  }
}

// Auto-warmup: launch the browser when this module is first imported.
// This runs once when the server starts, so the first PDF request doesn't
// have to wait for Chromium to cold-start.
if (process.env.NODE_ENV !== "test") {
  warmupBrowser().catch(() => {});
}

/** Reset the browser singleton (used on crash / retry). */
async function resetBrowser(): Promise<void> {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      await b.close();
    } catch {
      // ignore
    }
    browserPromise = null;
  }
}

/** Tear down the singleton browser (useful in tests / graceful shutdown). */
export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      await b.close();
    } catch {
      /* noop */
    } finally {
      browserPromise = null;
    }
  }
}

// ---------------------------------------------------------------------------
// HTML template — RTL, dark royal gold/purple theme matching the site,
// Cairo + Noto Naskh Arabic fonts via Google Fonts CDN, A4 print CSS.
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderChapterBlock(ch: ChapterForPDF): string {
  // Split content into paragraphs on blank-line separators (same logic the
  // reader uses). Each paragraph is wrapped in <p> for proper justify/spacing.
  const paragraphs = ch.content
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `      <p>${escapeHtml(p)}</p>`)
    .join("\n");

  return `
    <section class="chapter">
      <header class="chapter-header">
        <div class="chapter-eyebrow">فصل ${escapeHtml(String(ch.number))}</div>
        <h1 class="chapter-title">${escapeHtml(ch.title)}</h1>
        <div class="chapter-rule"></div>
      </header>
      <article class="chapter-body">
${paragraphs}
      </article>
    </section>`;
}

function renderHtml(chapters: ChapterForPDF[]): string {
  const body = chapters
    .map((ch, i) => {
      // Each chapter after the first starts on a new page.
      const pageBreak = i > 0 ? ` page-break` : "";
      return `<div class="chapter-wrap${pageBreak}">${renderChapterBlock(ch)}</div>`;
    })
    .join("\n");

  const titleBlock =
    chapters.length === 1
      ? `<div class="doc-eyebrow">سيد الحقيقة</div>`
      : `<div class="doc-eyebrow">سيد الحقيقة · مجموعة فصول</div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>سيد الحقيقة</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Noto+Naskh+Arabic:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  /* Page setup: A4 with 2cm margins. */
  @page {
    size: A4;
    margin: 2cm;
  }

  :root {
    --bg: #080810;
    --panel: #0f0f1a;
    --text: #e8e6e0;
    --muted: #9a9a8e;
    --gold: #c9a84c;
    --gold-soft: #e3c878;
    --purple: #7b5ea7;
    --border: rgba(201, 168, 76, 0.22);
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--text);
    font-family: "Cairo", "Noto Naskh Arabic", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* The whole PDF is rendered on a dark canvas. */
  body {
    background:
      radial-gradient(ellipse 70% 55% at 50% 0%, rgba(123, 94, 167, 0.18) 0%, transparent 60%),
      radial-gradient(ellipse 60% 45% at 50% 12%, rgba(201, 168, 76, 0.12) 0%, transparent 55%),
      var(--bg);
    padding: 0.4cm 0.2cm 0.6cm;
  }

  .doc-eyebrow {
    text-align: center;
    font-size: 11px;
    letter-spacing: 0.15em;
    color: var(--gold);
    opacity: 0.85;
    margin-bottom: 1.2cm;
    text-transform: uppercase;
  }

  .chapter-wrap {
    padding: 0;
  }
  /* Force every chapter after the first onto a fresh A4 page. */
  .chapter-wrap.page-break {
    page-break-before: always;
    break-before: page;
  }

  .chapter-header {
    text-align: center;
    margin-bottom: 1.4cm;
    padding: 0.6cm 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .chapter-eyebrow {
    font-family: "Cairo", sans-serif;
    font-size: 12px;
    letter-spacing: 0.25em;
    color: var(--gold-soft);
    opacity: 0.85;
    margin-bottom: 0.25cm;
  }
  .chapter-title {
    font-family: "Noto Naskh Arabic", "Cairo", serif;
    font-size: 30px;
    font-weight: 700;
    line-height: 1.4;
    margin: 0;
    color: var(--gold);
    /* Gold gradient text — fallback solid color below for safety */
    background: linear-gradient(180deg, #f0d98a 0%, #c9a84c 55%, #9c7d2f 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }
  .chapter-rule {
    width: 4cm;
    height: 2px;
    margin: 0.5cm auto 0;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }

  .chapter-body {
    font-family: "Noto Naskh Arabic", "Cairo", serif;
    font-size: 15px;
    line-height: 2;
    color: var(--text);
    text-align: justify;
    text-justify: inter-word;
  }
  .chapter-body p {
    margin: 0 0 1.1em 0;
    text-indent: 1.2em;
  }
  .chapter-body p:first-child {
    text-indent: 0;
  }

  /* Header / footer for printed pages. */
  @media print {
    body { background: var(--bg); }
  }
</style>
</head>
<body>
  ${titleBlock}
${body}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// PDF generation — render → wait for fonts → page.pdf() → Buffer
// ---------------------------------------------------------------------------

async function renderToPdfBuffer(
  context: BrowserContext,
  chapters: ChapterForPDF[]
): Promise<Buffer> {
  const page = await context.newPage();
  try {
    const html = renderHtml(chapters);
    // Use `domcontentloaded` instead of `networkidle` — it's faster and
    // doesn't timeout if external resources (fonts) are slow.
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Explicitly wait for web fonts to be ready (with a timeout fallback).
    try {
      await page.evaluate(async () => {
        const d = document as Document & { fonts?: { ready?: Promise<unknown> } };
        if (d.fonts && d.fonts.ready) {
          await Promise.race([
            d.fonts.ready,
            new Promise((r) => setTimeout(r, 8000)), // 8s max for fonts
          ]);
        }
      });
    } catch {
      // If font loading fails, continue with fallback fonts
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "2cm", right: "2cm", bottom: "2cm", left: "2cm" },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

/** Generate a single-chapter PDF (with retry on browser crash). */
export async function generateChapterPDF(
  chapter: ChapterForPDF
): Promise<Buffer> {
  return generateWithRetry([chapter]);
}

/** Generate one combined PDF containing every chapter (each on a new page). */
export async function generateCombinedPDF(
  chapters: ChapterForPDF[]
): Promise<Buffer> {
  if (chapters.length === 0) {
    throw new Error("لا توجد فصول لتوليد ملف PDF");
  }
  const ordered = [...chapters].sort((a, b) => a.number - b.number);
  return generateWithRetry(ordered);
}

/** Internal: render with up to 2 retries (resets browser on failure). */
async function generateWithRetry(
  chapters: ChapterForPDF[]
): Promise<Buffer> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const browser = await getBrowser();
      const context = await browser.newContext();
      try {
        return await renderToPdfBuffer(context, chapters);
      } finally {
        await context.close();
      }
    } catch (err) {
      console.error(`[pdf-generator] attempt ${attempt} failed:`, err);
      if (attempt < 2) {
        await resetBrowser();
      } else {
        throw err;
      }
    }
  }
  throw new Error("فشل توليد PDF بعد محاولتين");
}
