import { db } from "@/lib/db";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadingStatsWidget } from "@/components/site/reading-stats";
import { PushNotificationManager } from "@/components/site/push-notifications";
import { HeroCover } from "@/components/site/hero-cover";
import { ContinueReading } from "@/components/site/continue-reading";
import { TreeOfWisdomSection } from "@/components/site/tree-of-wisdom-section";
import { StatCards, LatestChaptersGrid } from "@/components/site/stat-cards";

export const dynamic = "force-dynamic";

async function getHomeData() {
  const [settings, chapterCount, wordsAgg, latest] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: 1 } }),
    db.chapter.count(),
    db.chapter.aggregate({ _sum: { wordCount: true } }),
    db.chapter.findMany({
      orderBy: { number: "desc" },
      take: 3,
      select: {
        id: true,
        number: true,
        title: true,
        wordCount: true,
        views: true,
        createdAt: true,
      },
    }),
  ]);

  // Count fillers (numbers with decimals)
  const allNums = await db.chapter.findMany({ select: { number: true }, orderBy: { number: "asc" } });
  const fillers = allNums.filter((c) => c.number !== Math.floor(c.number)).length;
  const regular = chapterCount - fillers;

  return {
    settings,
    chapterCount,
    regularCount: regular,
    fillerCount: fillers,
    totalWords: wordsAgg._sum.wordCount ?? 0,
    latest,
  };
}

export default async function HomePage() {
  const { settings, chapterCount, regularCount, fillerCount, totalWords, latest } = await getHomeData();

  const coverUrl = settings?.coverImageUrl || "/cover.jpg";
  const titleAr = settings?.novelTitle || "سيد الحقيقة";
  const titleEn = settings?.novelTitleEn || "Lord of the Truth";
  const description =
    settings?.novelDescription ||
    "روبين بورتون، شاب وُلد فوجد نفسه لديه الموهبة والعائلة القوية والذكاء — ما عدا شيء واحد.. الرغبة في استعمال كل هذا!";

  const firstChapterNumber = latest.length > 0 ? latest[latest.length - 1].number : 1;

  return (
    <div className="flex flex-col">
      {/* ===================== HERO ===================== */}
      <section className="cosmic-bg relative overflow-hidden">
        <div className="starfield absolute inset-0" />
        {/* radial glow behind cover */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute right-1/4 top-1/2 h-[40rem] w-[40rem] -translate-y-1/2 rounded-full bg-purple/10 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          {/* Cover (appears right in RTL) — 3D tilt on hover */}
          <HeroCover coverUrl={coverUrl} alt={`${titleAr} — ${titleEn}`} />

          {/* Text */}
          <div className="order-2 text-center md:text-right">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-muted px-4 py-1.5 text-xs text-gold/80">
              <Sparkles className="h-3.5 w-3.5" />
              رواية ويب عربية · فانتازيا
            </div>

            <h1 className="font-naskh text-6xl font-bold leading-tight text-gold-gradient sm:text-7xl md:text-8xl">
              {titleAr}
            </h1>
            <p className="mt-3 text-sm uppercase tracking-[0.35em] text-gold/50 sm:text-base">
              {titleEn}
            </p>

            <div className="gold-divider mx-auto my-8 md:mx-0 md:mr-0" />

            <p className="mx-auto max-w-xl font-naskh text-lg leading-loose text-foreground/90 md:mx-0">
              {description}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Link href={`/chapters/${firstChapterNumber}`}>
                <Button
                  size="lg"
                  className="bg-gold text-[#1a0a00] hover:bg-gold-soft"
                >
                  ابدأ القراءة
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/chapters">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gold/40 text-gold hover:border-gold/70 hover:bg-gold/10"
                >
                  <BookOpen className="ml-2 h-4 w-4" />
                  تصفّح الفصول
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      <section className="border-y border-gold/15 bg-muted">
        <StatCards
          regularCount={regularCount}
          fillerCount={fillerCount}
          totalWords={totalWords}
          latestChapterNumber={latest[0]?.number ?? null}
        />
      </section>

      {/* ===================== READING STATS (personal) ===================== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* "Where did I stop?" — continue reading widget (client-side, localStorage) */}
        <ContinueReading />

        <div className="mb-4 flex justify-center">
          <PushNotificationManager />
        </div>
        <ReadingStatsWidget totalChapters={chapterCount} />
      </section>

      {/* ===================== LATEST CHAPTERS ===================== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="font-naskh text-3xl font-bold text-gold-gradient sm:text-4xl">
              آخر الفصول
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              أحدث ما نُشر من رواية سيد الحقيقة
            </p>
          </div>
          <Link
            href="/chapters"
            className="hidden items-center gap-1 text-sm text-gold/70 transition-colors hover:text-gold sm:flex"
          >
            كل الفصول
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="gold-card rounded-lg p-12 text-center">
            <p className="font-naskh text-lg text-muted-foreground">
              لا توجد فصول بعد.
            </p>
          </div>
        ) : (
          <LatestChaptersGrid
            chapters={latest.map((ch) => ({
              number: ch.number,
              title: ch.title,
              wordCount: ch.wordCount,
              views: ch.views,
              createdAt: ch.createdAt.toISOString(),
            }))}
            coverUrl={coverUrl}
          />
        )}

        <div className="mt-8 flex justify-center sm:hidden">
          <Link href="/chapters">
            <Button
              variant="outline"
              className="border-gold/40 text-gold hover:border-gold/70 hover:bg-gold/10"
            >
              <BookOpen className="ml-2 h-4 w-4" />
              كل الفصول
            </Button>
          </Link>
        </div>
      </section>

      {/* ===================== TREE OF WISDOM ===================== */}
      <TreeOfWisdomSection />

      {/* ===================== ABOUT / CTA ===================== */}
      <section className="border-t border-gold/15 bg-background">
        <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-gold/60" />
          <h2 className="font-naskh text-3xl font-bold text-gold-gradient sm:text-4xl">
            اغرق في عالم سيد الحقيقة
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-naskh text-lg leading-loose text-foreground/80">
            تابع رحلة روبين بورتون — الشاب العبقري الذي يملك كل شيء إلا الرغبة في
            استعماله. فصل تلو الآخر، اكتشف كيف يتشكّل مصيره وسط صراعات العائلات
            والطاقة والسلطة.
          </p>
          <Link href={`/chapters/${firstChapterNumber}`}>
            <Button
              size="lg"
              className="mt-8 bg-gold text-[#1a0a00] hover:bg-gold-soft"
            >
              ابدأ من الفصل الأول
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
