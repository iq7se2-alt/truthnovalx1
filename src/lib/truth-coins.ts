// سيد الحقيقة — Truth Coin system + word tiers

// Tier 2 (مميزة) and Tier 4 (خارقة) are DEPRECATED.
// Tier 2 renders as Tier 1, Tier 4 renders as Tier 5.
// Active tiers: 1 (عادي), 3 (خرافية), 5 (أسطورية)

export const TIERS = {
  1: { name: "عادي", price: 1, colors: 12, glow: false, animated: false, styles: false },
  3: { name: "خرافية", price: 3, colors: 0, glow: true, animated: false, styles: true },
  5: { name: "أسطورية", price: 10, colors: 0, glow: true, animated: true, styles: true },
} as const;

export type TierKey = keyof typeof TIERS;

// Map deprecated tiers to their replacement
export function normalizeTier(tier: number): number {
  if (tier === 2) return 1; // مميزة → عادي
  if (tier === 4) return 5; // خارقة → أسطورية
  return tier;
}

// Elemental styles for tiers 3 + 5
export const TIER5_STYLES = [
  { id: "flame",    name: "لهب",     gradient: "linear-gradient(90deg,#f97316,#fde047,#ef4444)", glow: "#f97316" },
  { id: "ice",      name: "جليد",    gradient: "linear-gradient(90deg,#67e8f9,#3b82f6,#a5f3fc)", glow: "#22d3ee" },
  { id: "shadow",   name: "ظلام",    gradient: "linear-gradient(90deg,#1e1b4b,#4c1d95,#000)", glow: "#6d28d9" },
  { id: "light",    name: "نور",     gradient: "linear-gradient(90deg,#fde047,#fef3c7,#fbbf24)", glow: "#facc15" },
  { id: "thunder",  name: "رعد",     gradient: "linear-gradient(90deg,#a78bfa,#60a5fa,#818cf8)", glow: "#7c3aed" },
  { id: "nature",   name: "طبيعة",   gradient: "linear-gradient(90deg,#16a34a,#34d399,#4ade80)", glow: "#22c55e" },
  { id: "blood",    name: "دماء",    gradient: "linear-gradient(90deg,#dc2626,#7f1d1d,#991b1b)", glow: "#ef4444" },
  { id: "gold",     name: "ذهب",     gradient: "linear-gradient(90deg,#fbbf24,#f59e0b,#d4b05e)", glow: "#f59e0b" },
  { id: "cosmic",   name: "كوني",    gradient: "linear-gradient(90deg,#8b5cf6,#ec4899,#3b82f6)", glow: "#a855f7" },
  { id: "void",     name: "فراغ",    gradient: "linear-gradient(90deg,#0f0f1a,#4b5563,#1e293b)", glow: "#64748b" },
] as const;

export const TIER1_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#ffffff", "#f5f5f5", "#e0e0e0", "#d4b05e",
];

export const TIER23_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f43f5e", "#fb923c", "#a3e635", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#2dd4bf",
  "#fbbf24", "#fde047", "#c084fc", "#67e8f9",
  "#ffffff", "#f5f5f5", "#e5e5e5", "#d4d4d4",
  "#fafafa", "#f0f0f0", "#e0e0e0", "#cccccc",
  "#b8b8b8", "#a0a0a0", "#888888", "#707070",
];

export const DAILY_BONUS = 5;
export const BONUS_KEY = (userId: string) => `truth_last_bonus_${userId}`;
export const MODE_KEY = "reader-mode";

export function hasReceivedBonusToday(userId: string): boolean {
  if (typeof window === "undefined") return true;
  const key = BONUS_KEY(userId);
  const last = localStorage.getItem(key);
  if (!last) return false;
  const today = new Date().toDateString();
  return new Date(last).toDateString() === today;
}

export function markBonusReceived(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BONUS_KEY(userId), new Date().toISOString());
}

export function getTier5Style(styleId: string) {
  return TIER5_STYLES.find((s) => s.id === styleId) || TIER5_STYLES[0];
}

export function getTierColors(tier: number): string[] {
  if (tier === 1) return [...TIER1_COLORS];
  return [];
}

/** Get the CSS class name for a word based on its tier (for animations). */
export function getWordClassName(tier: number): string {
  const t = normalizeTier(tier);
  if (t === 3) return "tier-3-word";
  if (t === 5) return "tier-5-word";
  return "";
}

/** Get inline CSS for a word based on its tier. */
export function getWordStyle(opts: {
  tier: number;
  color?: string | null;
  styleId?: string | null;
}): React.CSSProperties {
  const tier = normalizeTier(opts.tier);
  const { color, styleId } = opts;
  const base: React.CSSProperties = { display: "inline-block" };

  if (tier === 1) {
    return { ...base, color: color || "#d4b05e" };
  }

  if (tier === 3) {
    const style = styleId ? getTier5Style(styleId) : TIER5_STYLES[0];
    return {
      ...base,
      backgroundImage: style.gradient,
      backgroundSize: "200% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      fontWeight: 800,
      filter: `drop-shadow(0 0 8px ${style.glow})`,
    };
  }

  if (tier === 5) {
    const style = styleId ? getTier5Style(styleId) : TIER5_STYLES[0];
    return {
      ...base,
      backgroundImage: style.gradient,
      backgroundSize: "200% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      fontWeight: 900,
      filter: `drop-shadow(0 0 12px ${style.glow}) drop-shadow(0 0 24px ${style.glow}) drop-shadow(0 0 36px ${style.glow})`,
      padding: "0 6px",
      borderRadius: "6px",
      textShadow: `0 0 20px ${style.glow}`,
    };
  }

  return base;
}
