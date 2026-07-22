import ZAI from "z-ai-web-dev-sdk";
import { db } from "./db";
import { countWords } from "./format";

const TRUTHNOVEL_BASE = "https://truthnovel.top";

export type FetchedChapter = {
  number: number;
  title: string;
  content: string;
  sourceUrl: string;
  nextUrl: string | null;
};

// ====== Helpers ======

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/g, "");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

function cleanContent(content: string): string {
  const junkPatterns = [
    /mediafire\.com/i,
    /NinjaTrader/i,
    /تعليقات الموقع/i,
    /رجاءً? اترك تعليق/i,
    /ضاع عشرات آلاف التعليقات/i,
    /تحديث زيوسي/i,
    /للأسف تم مسح كل تعليقات/i,
    /هذه الرواية من تأليف/i,
    /مالك موقع تيم/i,
    /مترجم المانها/i,
    /النسخة الأصلية من الرواية/i,
  ];
  const isJunk = (p: string) =>
    junkPatterns.some((re) => re.test(p)) ||
    /^https?:\/\/\S+$/.test(p.trim());

  const ps = content
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !isJunk(p));

  return ps.join("\n\n");
}

function extractContent(html: string): { content: string; nextUrl: string | null } {
  const nextRe = /<a[^>]*href=["']([^"']*)["'][^>]*class=["'][^"']*next-post[^"']*["']/gi;
  const nextMatches = [...html.matchAll(nextRe)];
  const nextUrl = nextMatches.length ? nextMatches[0][1] : null;

  let contentStart = -1;
  let contentEnd = html.length;

  if (nextMatches.length >= 1) {
    contentStart = nextMatches[0].index + nextMatches[0][0].length;
    const hrIdx = html.indexOf("<hr", contentStart);
    if (hrIdx >= 0 && hrIdx < contentStart + 200) contentStart = hrIdx;
  }
  if (nextMatches.length >= 2) {
    contentEnd = nextMatches[1].index;
  } else {
    const prevRe = /<a[^>]*class=["'][^"']*prev-post[^"']*["']/gi;
    const prevM = prevRe.exec(html);
    if (prevM && prevM.index > contentStart) contentEnd = prevM.index;
  }

  if (contentStart < 0) {
    const mtIdx = html.indexOf("الموضوع التالي");
    if (mtIdx >= 0) contentStart = mtIdx;
    else return { content: "", nextUrl };
  }

  const slice = html.substring(
    contentStart,
    contentEnd > contentStart ? contentEnd : html.length
  );

  const pBlocks = [...slice.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  const paragraphs: string[] = [];
  for (const m of pBlocks) {
    let inner = m[1].replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "");
    inner = stripTags(inner);
    inner = decodeEntities(inner);
    inner = inner
      .split("\n")
      .map((l) => l.replace(/[ \t]+/g, " ").trim())
      .filter((l) => l.length > 0)
      .join("\n");
    if (inner.length > 0) paragraphs.push(inner);
  }

  const content = paragraphs.join("\n\n");
  return { content: cleanContent(content), nextUrl };
}

function extractTitle(rawTitle: string, url: string): { number: number; title: string } {
  const m = url.match(/\/(\d+)-/);
  const number = m ? Number(m[1]) : 0;

  let t = (rawTitle || "").replace(/\s*-\s*Novel Stories\s*$/i, "");
  t = t.replace(/^\d+\s*-\s*/, "").trim();
  if (!t) {
    try {
      const slug = url.split("/").filter(Boolean).pop() || "";
      const decoded = decodeURIComponent(slug);
      t = decoded.replace(/^\d+-/, "").replace(/-/g, " ").trim();
    } catch {
      t = `الفصل ${number}`;
    }
  }
  return { number, title: t };
}

// ====== Public API ======

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZai() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

/** Fetch a single chapter from a known URL. */
export async function fetchChapterByUrl(url: string): Promise<FetchedChapter | null> {
  const zai = await getZai();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await zai.functions.invoke("page_reader", { url });
      const data = result.data || result;
      const html: string = data.html || "";
      const rawTitle: string = data.title || "";
      if (!html) throw new Error("empty html");
      const { content, nextUrl } = extractContent(html);
      const { number, title } = extractTitle(rawTitle, url);
      if (!content) throw new Error("could not extract content");
      return { number, title, content, sourceUrl: url, nextUrl };
    } catch (e) {
      console.error(`  ⚠ attempt ${attempt} for ${url}: ${(e as Error).message}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  return null;
}

/** Fetch a single chapter by its number. Tries to use stored sourceUrl, else follows chain from ch1. */
export async function fetchChapterByNumber(
  number: number
): Promise<FetchedChapter | null> {
  // First, try to use stored sourceUrl
  const existing = await db.chapter.findUnique({
    where: { number },
    select: { sourceUrl: true },
  });
  if (existing?.sourceUrl) {
    return fetchChapterByUrl(existing.sourceUrl);
  }
  // Otherwise, follow the chain from chapter 1
  return fetchChapterByChain(number);
}

/** Follow the next-post chain from chapter 1 until reaching the target number. */
export async function fetchChapterByChain(
  targetNumber: number
): Promise<FetchedChapter | null> {
  let url: string | null =
    "https://truthnovel.top/1-%D8%B9%D8%A8%D9%82%D8%B1%D9%8A/";

  while (url) {
    const ch = await fetchChapterByUrl(url);
    if (!ch) return null;
    if (ch.number === targetNumber) return ch;
    if (ch.number > targetNumber) return null; // overshot
    url = ch.nextUrl;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

/** Fetch multiple chapters by following the chain. Returns all fetched chapters. */
export async function fetchChapters(
  count: number,
  startUrl: string = "https://truthnovel.top/1-%D8%B9%D8%A8%D9%82%D8%B1%D9%8A/"
): Promise<FetchedChapter[]> {
  const fetched: FetchedChapter[] = [];
  let url: string | null = startUrl;

  while (url && fetched.length < count) {
    const ch = await fetchChapterByUrl(url);
    if (!ch) break;
    fetched.push(ch);
    url = ch.nextUrl;
    if (url && fetched.length < count) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return fetched;
}

/** Upsert a fetched chapter into the DB. Returns the chapter record. */
export async function upsertFetchedChapter(ch: FetchedChapter) {
  const wordCount = countWords(ch.content);
  const existing = await db.chapter.findUnique({ where: { number: ch.number } });
  if (existing) {
    return db.chapter.update({
      where: { number: ch.number },
      data: {
        title: ch.title,
        content: ch.content,
        wordCount,
        sourceUrl: ch.sourceUrl,
      },
    });
  }
  return db.chapter.create({
    data: {
      number: ch.number,
      title: ch.title,
      content: ch.content,
      wordCount,
      sourceUrl: ch.sourceUrl,
    },
  });
}
