"use client";

import Link from "next/link";
import { BookOpen, Type, Clock, Hash, Eye } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { AnimatedCounter } from "@/components/site/animated-counter";
import { formatArabicDate, readingMinutes } from "@/lib/format";

/**
 * StatCards — client wrapper around the four home-page stat cards.
 *
 * The home page (`src/app/page.tsx`) is a server component that fetches
 * totals from the DB. We pass those raw numbers here as props, and this
 * client component reads the UI language hook to render Arabic-Indic
 * digits (١٢٣) or Western digits (123), and Arabic or English labels.
 *
 * The HTML `dir` attribute stays `rtl` (Arabic novel content is always
 * RTL) — only the UI chrome (labels + digit system) switches.
 */
export function StatCards({
  regularCount,
  fillerCount,
  totalWords,
  latestChapterNumber,
}: {
  regularCount: number;
  fillerCount: number;
  totalWords: number;
  latestChapterNumber: number | null;
}) {
  const { t, formatNumber } = useLanguage();

  const readingMin = readingMinutes(totalWords);

  // Each card's `displayValue` is the Western-digit formatted string the
  // AnimatedCounter animates; the counter internally re-formats to the
  // active language's digit system on every render.
  const cards: Array<{
    icon: React.ReactNode;
    numericValue: number;
    displayValue: string;
    label: string;
    delay: number;
  }> = [
    {
      icon: <BookOpen className="h-5 w-5" />,
      numericValue: regularCount,
      displayValue: String(regularCount),
      label:
        fillerCount > 0
          ? `${t("فصل")} · ${formatNumber(fillerCount)} ${t("فلر")}`
          : t("فصل منشور"),
      delay: 0,
    },
    {
      icon: <Type className="h-5 w-5" />,
      numericValue: totalWords,
      displayValue: totalWords.toLocaleString("en-US"),
      label: t("كلمة"),
      delay: 100,
    },
    {
      icon: <Clock className="h-5 w-5" />,
      numericValue: readingMin,
      displayValue: String(readingMin),
      label: t("وقت القراءة الكلي"),
      delay: 200,
    },
    {
      icon: <Hash className="h-5 w-5" />,
      numericValue: latestChapterNumber ?? 0,
      displayValue: latestChapterNumber != null ? String(latestChapterNumber) : "—",
      label: t("آخر فصل"),
      delay: 300,
    },
  ];

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px overflow-hidden md:grid-cols-4">
      {cards.map((c, idx) => (
        <StatCard
          key={idx}
          icon={c.icon}
          numericValue={c.numericValue}
          displayValue={c.displayValue}
          label={c.label}
          delay={c.delay}
        />
      ))}
    </div>
  );
}

function StatCard({
  icon,
  numericValue,
  displayValue,
  label,
  delay = 0,
}: {
  icon: React.ReactNode;
  numericValue: number;
  displayValue: string;
  label: string;
  delay?: number;
}) {
  return (
    <div
      className="animate-float-in flex flex-col items-center gap-2 bg-muted px-4 py-8 text-center"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-gold">
        {icon}
      </div>
      <div className="font-naskh text-3xl font-bold text-gold-gradient">
        <AnimatedCounter
          value={numericValue}
          displayValue={displayValue}
          delay={delay}
        />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// ============ Latest Chapter Cards (client, language-aware) ============

type LatestChapter = {
  number: number;
  title: string;
  wordCount: number;
  views: number;
  createdAt: string;
};

/**
 * LatestChaptersGrid — renders the home page's "latest chapters" list.
 * Reads the UI language hook so chapter numbers / word counts / views
 * switch between Arabic-Indic and Western digit systems.
 */
export function LatestChaptersGrid({
  chapters,
  coverUrl,
}: {
  chapters: LatestChapter[];
  coverUrl: string;
}) {
  const { t, formatNumber } = useLanguage();

  if (chapters.length === 0) {
    return (
      <div className="gold-card rounded-lg p-12 text-center">
        <p className="font-naskh text-lg text-muted-foreground">
          {t("لا توجد فصول بعد")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {chapters.map((ch, i) => (
        <div
          key={ch.number}
          className="animate-float-in"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Link
            href={`/chapters/${ch.number}`}
            className="gold-card group flex flex-col overflow-hidden rounded-lg"
          >
            {/* cover thumbnail */}
            <div className="relative aspect-[16/9] overflow-hidden border-b border-gold/15">
              <img
                src={coverUrl}
                alt={ch.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1a] via-[#0f0f1a]/40 to-transparent" />
              <div className="absolute bottom-3 right-3 flex h-12 w-12 flex-col items-center justify-center rounded-md border border-gold/40 bg-background/80 backdrop-blur">
                <span className="text-[8px] uppercase tracking-wider text-gold/60">
                  {t("فصل")}
                </span>
                <span className="font-mono text-base font-bold text-gold">
                  {formatNumber(ch.number)}
                </span>
              </div>
            </div>

            {/* body */}
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-naskh text-xl font-bold text-foreground transition-colors group-hover:text-gold">
                {ch.title}
              </h3>
              <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {formatNumber(ch.wordCount)} {t("كلمة")}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatNumber(ch.views)}
                </span>
                <span className="mr-auto">{formatArabicDate(ch.createdAt)}</span>
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
