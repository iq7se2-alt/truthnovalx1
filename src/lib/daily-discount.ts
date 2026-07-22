// سيد الحقيقة — Daily discount tier system (client-side, day-of-week based)
//
// Each day of the week a different word tier is on discount:
//   - Sunday   : tier 5 (أسطورية) 50% off → 5💎 instead of 10
//   - Monday   : tier 3 (خرافية)  33% off → 2💎 instead of 3
//   - Tuesday  : tier 5            50% off
//   - Wednesday: tier 3            33% off
//   - Thursday : tier 5            50% off
//   - Friday   : tier 3            33% off
//   - Saturday : tier 5            50% off
//
// This is purely cosmetic / client-side — the server still trusts the
// tier and computes its own price via TIERS[tier].price. To keep the
// discount server-authoritative we expose getDiscountedPrice() and the
// purchase API uses the same logic. (See /api/chapters/[id]/words/purchase.)

import { TIERS, normalizeTier, type TierKey } from "@/lib/truth-coins";

export type DailyDiscount = {
  /** Discounted tier (normalized: 1, 3 or 5). */
  tier: number;
  /** Discount fraction as a number between 0 and 1 (0.5 = 50% off). */
  discount: number;
  /** Human readable Arabic label, e.g. "خصم ٥٠٪ على الفئة الأسطورية". */
  label: string;
  /** Western-digit day-of-week index, 0 = Sunday … 6 = Saturday. */
  dayIndex: number;
  /** Arabic name of the day. */
  dayName: string;
};

// Maps day-of-week (0 = Sunday … 6 = Saturday) to the discounted tier.
const DAY_TO_TIER: Record<number, number> = {
  0: 5, // Sunday    → أسطورية
  1: 3, // Monday    → خرافية
  2: 5, // Tuesday   → أسطورية
  3: 3, // Wednesday → خرافية
  4: 5, // Thursday  → أسطورية
  5: 3, // Friday    → خرافية
  6: 5, // Saturday  → أسطورية
};

const DAY_NAMES_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

// Discount fraction per tier (only 3 and 5 are ever discounted).
const TIER_DISCOUNT: Record<number, number> = {
  3: 1 / 3, // ~33% off
  5: 1 / 2, // 50% off
};

/**
 * Compute today's daily discount based on the local day-of-week.
 * Pure / deterministic for a given Date — pass an explicit date for tests.
 */
export function getDailyDiscount(now: Date = new Date()): DailyDiscount {
  const dayIndex = now.getDay();
  const tier = normalizeTier(DAY_TO_TIER[dayIndex] ?? 5);
  const discount = TIER_DISCOUNT[tier] ?? 0;
  const tierName = TIERS[tier as TierKey]?.name ?? "";
  const pct = Math.round(discount * 100);
  const label = `خصم ${pct}٪ على الفئة ${tierName}`;
  return {
    tier,
    discount,
    label,
    dayIndex,
    dayName: DAY_NAMES_AR[dayIndex] ?? "",
  };
}

/**
 * Returns the discounted price (in 💎 truth-coins) for a given tier today.
 * Tier 1 is never discounted. Falls back to TIERS[tier].price when not on
 * the daily deal.
 */
export function getDiscountedPrice(
  tier: number,
  now: Date = new Date()
): number {
  const t = normalizeTier(tier);
  const base = TIERS[t as TierKey]?.price ?? 0;
  const daily = getDailyDiscount(now);
  if (daily.tier === t && daily.discount > 0) {
    return Math.max(1, Math.round(base * (1 - daily.discount)));
  }
  return base;
}

/**
 * True when the given tier is on daily discount today.
 */
export function isTierDiscountedToday(
  tier: number,
  now: Date = new Date()
): boolean {
  const t = normalizeTier(tier);
  return getDailyDiscount(now).tier === t;
}
