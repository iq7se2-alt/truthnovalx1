import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type {
  ReaderChapter,
  ChapterLink,
} from "@/components/site/reader-view";
import { InfiniteReader } from "@/components/site/infinite-reader";
import { ScrollSettingsBar } from "@/components/site/scroll-settings-bar";
import { GoldenParticles } from "@/components/site/golden-particles";
import { ReaderRouter } from "@/components/site/reader-router";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numeric = Number(id);
  const chapter = await db.chapter.findFirst({
    where: Number.isFinite(numeric) ? { number: numeric } : { id: 0 },
    select: { number: true, title: true },
  });
  if (!chapter) return { title: "الفصل غير موجود | سيد الحقيقة" };
  return {
    title: `الفصل ${chapter.number}: ${chapter.title} | سيد الحقيقة`,
    description: `قراءة الفصل ${chapter.number} «${chapter.title}» من رواية سيد الحقيقة — Lord of the Truth.`,
  };
}

export default async function ChapterReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const numeric = Number(id);
  const searchQuery = (q || "").trim();

  const chapter = await db.chapter.findFirst({
    where: Number.isFinite(numeric)
      ? { OR: [{ number: numeric }, { id: numeric }] }
      : { id: 0 },
  });

  if (!chapter) notFound();

  const [prev, next, characters, prevChapter] = await Promise.all([
    db.chapter.findFirst({
      where: { number: { lt: chapter.number } },
      orderBy: { number: "desc" },
      select: { number: true, title: true },
    }),
    db.chapter.findFirst({
      where: { number: { gt: chapter.number } },
      orderBy: { number: "asc" },
      select: { number: true, title: true },
    }),
    db.character.findMany({
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        description: true,
        imageUrl: true,
        color: true,
        isMain: true,
      },
    }),
    // Fetch the previous chapter's recap (if any) — kept loaded on the server
    // (not currently rendered because InfiniteReader replaces the view, but
    // we still fetch it to keep the server-side contract intact).
    chapter.number > 1
      ? db.chapter.findFirst({
          where: { number: chapter.number - 1 },
          select: { number: true, title: true, recap: true },
        })
      : null,
  ]);

  // prevChapter is fetched for the server-side contract (kept for future use).
  void prevChapter;

  // Increment views (non-blocking)
  db.chapter
    .update({
      where: { id: chapter.id },
      data: { views: { increment: 1 } },
    })
    .catch((err) => console.error("Failed to increment views:", err));

  const readerChapter: ReaderChapter = {
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    content: chapter.content,
    wordCount: chapter.wordCount,
    views: chapter.views + 1,
    createdAt: chapter.createdAt.toISOString(),
    coverImageUrl: chapter.coverImageUrl,
  };

  return (
    <>
      <GoldenParticles />
      <ReaderRouter
        chapter={readerChapter}
        prev={prev as ChapterLink}
        next={next as ChapterLink}
        characters={characters}
        searchQuery={searchQuery}
      />
      {/* ScrollSettingsBar handles both progress bar + settings + audio */}
      <ScrollSettingsBar />
    </>
  );
}
