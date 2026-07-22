import { db } from "@/lib/db";
import Link from "next/link";
import { Trophy, ArrowRight, Crown, Medal, Award, Diamond } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toArabicDigits, formatArabicDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة المتصدرين | سيد الحقيقة",
  description: "أكثر القرّاء امتلاكاً للكلمات في رواية سيد الحقيقة",
};

// ─── Tier display config ─────────────────────────────────────
// (mirrors src/lib/truth-coins.ts TIERS — kept here so the server
//  component doesn't need to import client-only CSS-in-JS helpers)
const TIER_META: Record<number, { name: string; color: string; emoji: string }> = {
  1: { name: "عادي", color: "#d4b05e", emoji: "●" },
  3: { name: "خرافية", color: "#8b6db5", emoji: "✦" },
  5: { name: "أسطورية", color: "#f0d98a", emoji: "★" },
};

// Normalize deprecated tiers (2 → 1, 4 → 5) for the breakdown display.
function normalizeTier(tier: number): number {
  if (tier === 2) return 1;
  if (tier === 4) return 5;
  return tier;
}

// ─── Page ────────────────────────────────────────────────────

export default async function LeaderboardPage() {
  // 1) Top 20 users by total words owned
  const totals = await db.ownedWord.groupBy({
    by: ["userId"],
    _count: { _all: true },
    orderBy: { _count: { userId: "desc" } },
    take: 20,
  });

  const userIds = totals.map((t) => t.userId);

  // 2) Tier breakdown for those users (so we can render badges per tier)
  const byTierRaw = userIds.length
    ? await db.ownedWord.groupBy({
        by: ["userId", "tier"],
        _count: { _all: true },
        where: { userId: { in: userIds } },
      })
    : [];

  // Build a map: userId → { tier(normalized) → count }
  const tierBreakdown = new Map<string, Map<number, number>>();
  for (const row of byTierRaw) {
    const t = normalizeTier(row.tier);
    const inner = tierBreakdown.get(row.userId) ?? new Map<number, number>();
    inner.set(t, (inner.get(t) ?? 0) + row._count._all);
    tierBreakdown.set(row.userId, inner);
  }

  // 3) Fetch user nicknames + coins
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, nickname: true, coins: true, createdAt: true },
      })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Assemble leaderboard rows
  const rows = totals.map((t, i) => {
    const u = userMap.get(t.userId);
    return {
      rank: i + 1,
      userId: t.userId,
      nickname: u?.nickname ?? "قارئ مجهول",
      coins: u?.coins ?? 0,
      createdAt: u?.createdAt ?? null,
      total: t._count._all,
      tiers: tierBreakdown.get(t.userId) ?? new Map<number, number>(),
    };
  });

  // Top 3 for the podium section
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <Trophy className="h-3.5 w-3.5" />
          المتصدرون
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
          🏆 لوحة المتصدرين
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أكثر القرّاء امتلاكاً للكلمات في رواية «سيد الحقيقة» — أعلى ٢٠ قارئاً
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="gold-card animate-float-in rounded-lg p-12 text-center">
          <Trophy
            className="mx-auto mb-4 h-12 w-12 text-gold/30"
            style={{ animation: "float 3s ease-in-out infinite" }}
          />
          <p className="font-naskh text-lg text-muted-foreground">
            لا يوجد متصدرون بعد
          </p>
          <p className="mt-2 text-sm text-muted-foreground/70">
            كن أول من يمتلك كلمة في الرواية!
          </p>
          <Link href="/chapters" className="mt-6 inline-block">
            <Button className="bg-gold text-[#1a0a00] hover:bg-gold-soft">
              ابدأ القراءة
              <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Podium — top 3 with special styling */}
          {podium.length > 0 && (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {podium.map((row, idx) => (
                <PodiumCard key={row.userId} row={row} index={idx} />
              ))}
            </div>
          )}

          {/* Remaining rows — list */}
          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map((row, idx) => (
                <Link
                  key={row.userId}
                  href={`/user/${row.userId}`}
                  className="block"
                >
                  <div
                    className="gold-card group animate-float-in flex items-center gap-3 rounded-lg p-4 transition-all hover:border-gold/60"
                    style={{
                      animationDelay: `${Math.min(idx + 3, 12) * 60}ms`,
                    }}
                  >
                    {/* Rank */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-gold/25 bg-muted">
                      <span className="font-mono text-lg font-bold text-gold/80">
                        {toArabicDigits(row.rank)}
                      </span>
                    </div>

                    {/* Nickname + meta */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-naskh text-lg font-bold text-foreground transition-colors group-hover:text-gold">
                        {row.nickname}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Diamond className="h-3 w-3 text-gold/60" />
                          {toArabicDigits(row.coins)} عملة
                        </span>
                        {row.createdAt && (
                          <span>عضو منذ {formatArabicDate(row.createdAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* Tier breakdown badges */}
                    <div className="hidden flex-wrap items-center justify-end gap-1.5 sm:flex">
                      {[5, 3, 1].map((t) => {
                        const count = row.tiers.get(t) ?? 0;
                        if (count === 0) return null;
                        const meta = TIER_META[t];
                        return (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              borderColor: `${meta.color}55`,
                              color: meta.color,
                              background: `${meta.color}12`,
                            }}
                            title={`${meta.name}: ${count}`}
                          >
                            <span>{meta.emoji}</span>
                            {toArabicDigits(count)}
                          </span>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div className="flex shrink-0 flex-col items-center justify-center rounded-md border border-gold/30 bg-muted/50 px-3 py-2">
                      <span className="font-mono text-xl font-bold text-gold">
                        {toArabicDigits(row.total)}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-gold/60">
                        كلمة
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Tier legend */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="text-gold/70">دليل الفئات:</span>
            {[1, 3, 5].map((t) => {
              const meta = TIER_META[t];
              return (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1"
                  style={{
                    borderColor: `${meta.color}55`,
                    color: meta.color,
                  }}
                >
                  <span>{meta.emoji}</span>
                  {meta.name}
                </span>
              );
            })}
          </div>
        </>
      )}

      {/* Back link */}
      <div className="mt-10 flex justify-center">
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

// ─── Podium card (top 3) ─────────────────────────────────────

function PodiumCard({
  row,
  index,
}: {
  row: {
    rank: number;
    userId: string;
    nickname: string;
    coins: number;
    createdAt: Date | null;
    total: number;
    tiers: Map<number, number>;
  };
  index: number;
}) {
  // 1st = gold, 2nd = silver (purple), 3rd = bronze (gold-soft)
  const podiumStyles = [
    {
      border: "border-gold/60",
      ring: "ring-2 ring-gold/30",
      glow: "shadow-[0_0_40px_-8px_rgba(212,176,94,0.5)]",
      icon: <Crown className="h-5 w-5 text-gold" />,
      rankColor: "text-gold",
      label: "الأول",
      scale: "sm:scale-105",
    },
    {
      border: "border-purple/50",
      ring: "ring-1 ring-purple/20",
      glow: "shadow-[0_0_28px_-10px_rgba(139,109,181,0.4)]",
      icon: <Medal className="h-5 w-5 text-purple" />,
      rankColor: "text-purple",
      label: "الثاني",
      scale: "",
    },
    {
      border: "border-gold/30",
      ring: "",
      glow: "",
      icon: <Award className="h-5 w-5 text-gold-soft" />,
      rankColor: "text-gold-soft",
      label: "الثالث",
      scale: "",
    },
  ][index] ?? {
    border: "border-gold/20",
    ring: "",
    glow: "",
    icon: <Trophy className="h-5 w-5 text-gold/60" />,
    rankColor: "text-gold/60",
    label: "",
    scale: "",
  };

  return (
    <Link
      href={`/user/${row.userId}`}
      className="block"
    >
      <div
        className={`gold-card animate-float-in group rounded-lg p-5 text-center transition-all hover:border-gold ${podiumStyles.border} ${podiumStyles.ring} ${podiumStyles.glow} ${podiumStyles.scale}`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Rank icon */}
        <div className="mb-3 flex items-center justify-center gap-2">
          {podiumStyles.icon}
          <span className={`font-naskh text-sm font-bold ${podiumStyles.rankColor}`}>
            {podiumStyles.label}
          </span>
        </div>

        {/* Nickname */}
        <h3 className="truncate font-naskh text-xl font-bold text-foreground transition-colors group-hover:text-gold">
          {row.nickname}
        </h3>

        {/* Total */}
        <div className="mt-3 flex items-baseline justify-center gap-1">
          <span className="font-mono text-3xl font-bold text-gold-gradient">
            {toArabicDigits(row.total)}
          </span>
          <span className="text-xs text-muted-foreground">كلمة</span>
        </div>

        {/* Coins */}
        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Diamond className="h-3 w-3 text-gold/60" />
          {toArabicDigits(row.coins)} عملة
        </div>

        {/* Tier breakdown badges */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {[5, 3, 1].map((t) => {
            const count = row.tiers.get(t) ?? 0;
            if (count === 0) return null;
            const meta = TIER_META[t];
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                style={{
                  borderColor: `${meta.color}55`,
                  color: meta.color,
                  background: `${meta.color}12`,
                }}
                title={`${meta.name}: ${count}`}
              >
                <span>{meta.emoji}</span>
                {toArabicDigits(count)}
              </span>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
