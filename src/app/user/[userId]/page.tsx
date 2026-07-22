import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Diamond,
  Calendar,
  BookOpen,
  ArrowRight,
  Hash,
  Trophy,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TIERS,
  normalizeTier,
  getWordClassName,
  getWordStyle,
  type TierKey,
} from "@/lib/truth-coins";
import { toArabicDigits, formatArabicDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ملف القارئ | سيد الحقيقة",
  description: "ملف شخصي لقارئ في رواية سيد الحقيقة",
};

// ─── Tier display meta (for breakdown chips) ────────────────
const TIER_META: Record<number, { name: string; color: string; emoji: string }> = {
  1: { name: "عادي", color: "#d4b05e", emoji: "●" },
  3: { name: "خرافية", color: "#8b6db5", emoji: "✦" },
  5: { name: "أسطورية", color: "#f0d98a", emoji: "★" },
};

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { userId } = await params;

  // ─── Fetch user ───────────────────────────────────────────
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      coins: true,
      createdAt: true,
    },
  });

  if (!user) {
    notFound();
  }

  // ─── Fetch owned words ────────────────────────────────────
  const ownedWords = await db.ownedWord.findMany({
    where: { userId: user.id },
    orderBy: [{ chapterId: "asc" }, { wordIndex: "asc" }],
    select: {
      id: true,
      chapterId: true,
      wordIndex: true,
      wordText: true,
      tier: true,
      color: true,
      styleId: true,
      createdAt: true,
    },
  });

  // ─── Fetch chapters referenced by owned words ────────────
  // (OwnedWord.chapterId is the Chapter.id PK, NOT chapter.number)
  const chapterIds = Array.from(new Set(ownedWords.map((w) => w.chapterId)));
  const chapters = chapterIds.length
    ? await db.chapter.findMany({
        where: { id: { in: chapterIds } },
        select: { id: true, number: true, title: true },
      })
    : [];

  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  // ─── Group owned words by chapterId ──────────────────────
  // Use a Map to preserve insertion order (already sorted by chapterId asc)
  const wordsByChapter = new Map<
    number,
    Array<{
      id: string;
      wordIndex: number;
      wordText: string;
      tier: number;
      color: string | null;
      styleId: string | null;
      createdAt: Date;
    }>
  >();
  for (const w of ownedWords) {
    const arr = wordsByChapter.get(w.chapterId) ?? [];
    arr.push(w);
    wordsByChapter.set(w.chapterId, arr);
  }

  // ─── Tier breakdown counts ───────────────────────────────
  const tierCounts = new Map<number, number>();
  for (const w of ownedWords) {
    const t = normalizeTier(w.tier);
    tierCounts.set(t, (tierCounts.get(t) ?? 0) + 1);
  }

  const totalWords = ownedWords.length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      {/* ─── User Header ───────────────────────────────────── */}
      <div className="gold-card animate-float-in mb-8 overflow-hidden rounded-lg">
        {/* Top banner */}
        <div className="relative border-b border-gold/15 bg-gradient-to-l from-purple/10 via-transparent to-gold/10 px-6 py-8 text-center">
          {/* Avatar (initial in a gold circle) */}
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/40 bg-muted shadow-[0_0_24px_-4px_rgba(212,176,94,0.4)]">
            <span className="font-naskh text-4xl font-bold text-gold-gradient">
              {user.nickname.charAt(0) || "؟"}
            </span>
          </div>

          {/* Nickname */}
          <h1 className="font-naskh text-3xl font-bold text-gold-gradient sm:text-4xl">
            {user.nickname}
          </h1>

          {/* Member since */}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            عضو منذ {formatArabicDate(user.createdAt)}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-gold/15">
          <Stat
            icon={<BookOpen className="h-4 w-4" />}
            label="كلمات مملوكة"
            value={toArabicDigits(totalWords)}
            color="text-gold"
          />
          <Stat
            icon={<Diamond className="h-4 w-4" />}
            label="رصيد العملات"
            value={`${toArabicDigits(user.coins)} 💎`}
            color="text-purple"
          />
          <Stat
            icon={<Sparkles className="h-4 w-4" />}
            label="فصول نشطة"
            value={toArabicDigits(wordsByChapter.size)}
            color="text-gold-soft"
          />
        </div>

        {/* Tier breakdown bar */}
        {totalWords > 0 && (
          <div className="border-t border-gold/15 px-6 py-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>توزيع الفئات</span>
              <span>{toArabicDigits(totalWords)} كلمة</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              {[1, 3, 5].map((t) => {
                const count = tierCounts.get(t) ?? 0;
                if (count === 0) return null;
                const pct = (count / totalWords) * 100;
                const meta = TIER_META[t];
                return (
                  <div
                    key={t}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: meta.color,
                    }}
                    title={`${meta.name}: ${count} (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              {[5, 3, 1].map((t) => {
                const count = tierCounts.get(t) ?? 0;
                if (count === 0) return null;
                const meta = TIER_META[t];
                return (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold"
                    style={{
                      borderColor: `${meta.color}55`,
                      color: meta.color,
                      background: `${meta.color}12`,
                    }}
                  >
                    <span>{meta.emoji}</span>
                    {meta.name}
                    <span className="font-mono">({toArabicDigits(count)})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Owned words grouped by chapter ──────────────── */}
      {totalWords === 0 ? (
        <div className="gold-card animate-float-in rounded-lg p-12 text-center">
          <BookOpen
            className="mx-auto mb-4 h-12 w-12 text-gold/30"
            style={{ animation: "float 3s ease-in-out infinite" }}
          />
          <p className="font-naskh text-lg text-muted-foreground">
            لم يمتلك هذا القارئ أي كلمات بعد
          </p>
          <p className="mt-2 text-sm text-muted-foreground/70">
            ابدأ القراءة وامتلك أول كلمة!
          </p>
          <Link href="/chapters" className="mt-6 inline-block">
            <Button className="bg-gold text-[#1a0a00] hover:bg-gold-soft">
              تصفّح الفصول
              <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(wordsByChapter.entries()).map(([chapterId, words], idx) => {
            const chapter = chapterMap.get(chapterId);
            return (
              <section
                key={chapterId}
                className="gold-card animate-float-in overflow-hidden rounded-lg"
                style={{ animationDelay: `${Math.min(idx, 8) * 80}ms` }}
              >
                {/* Chapter header */}
                <div className="flex items-center gap-3 border-b border-gold/15 bg-muted/40 px-4 py-3">
                  <Link
                    href={chapter ? `/chapters/${chapter.number}` : "#"}
                    className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-gold"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md border border-gold/30 bg-muted">
                      <span className="text-[8px] uppercase tracking-wider text-gold/50">
                        فصل
                      </span>
                      <span className="font-mono text-sm font-bold text-gold">
                        {chapter ? toArabicDigits(chapter.number) : "—"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-naskh text-lg font-bold text-foreground transition-colors hover:text-gold">
                        {chapter?.title ?? `فصل #${chapterId}`}
                      </h2>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {toArabicDigits(words.length)} كلمة
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Word chips */}
                <div className="flex flex-wrap gap-2 p-4">
                  {words.map((w) => (
                    <WordChip key={w.id} word={w} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ─── Footer actions ───────────────────────────────── */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href="/leaderboard">
          <Button
            variant="outline"
            className="border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold"
          >
            <Trophy className="ml-2 h-4 w-4" />
            لوحة المتصدرين
          </Button>
        </Link>
        <Link href="/chapters">
          <Button
            variant="outline"
            className="border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold"
          >
            <BookOpen className="ml-2 h-4 w-4" />
            تصفّح الفصول
          </Button>
        </Link>
        <Link href="/">
          <Button
            variant="outline"
            className="border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Stat cell ──────────────────────────────────────────────

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-4 text-center">
      <div className={`mb-1 flex items-center gap-1.5 text-xs text-muted-foreground`}>
        <span className={color}>{icon}</span>
        {label}
      </div>
      <div className={`font-mono text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ─── Word chip (renders with tier styling) ──────────────────

function WordChip({
  word,
}: {
  word: {
    id: string;
    wordIndex: number;
    wordText: string;
    tier: number;
    color: string | null;
    styleId: string | null;
    createdAt: Date;
  };
}) {
  const t = normalizeTier(word.tier);
  const tierName = TIERS[t as TierKey]?.name ?? "";

  return (
    <span
      title={`${tierName} — ${formatArabicDate(word.createdAt)}`}
      className="inline-flex items-center rounded-md border border-gold/15 bg-muted/40 px-2.5 py-1 text-sm transition-colors hover:border-gold/40"
    >
      <span
        className={getWordClassName(t)}
        style={getWordStyle({
          tier: t,
          color: word.color,
          styleId: word.styleId,
        })}
      >
        {word.wordText}
      </span>
    </span>
  );
}
