/**
 * Unified font system — used by both reader-view and ScrollSettingsBar.
 * All fonts are loaded via next/font/google in layout.tsx.
 *
 * To add a new font:
 * 1. Import it in src/app/layout.tsx with next/font/google
 * 2. Assign it a CSS variable (--font-xxx)
 * 3. Add an entry here with the matching cssVar
 */

export type FontKey =
  | "naskh"
  | "cairo"
  | "amiri"
  | "kufi"
  | "reem"
  | "scheherazade"
  | "lateef"
  | "marhey"
  | "lemonada"
  | "tajawal"
  | "almarai"
  | "aref"
  | "mirza"
  | "harmattan"
  | "mada"
  | "jomhuria"
  | "rakkas"
  | "baloo"
  | "elMessiri"
  | "changa"
  | "katibeh"
  | "lalezar";

export const FONTS: { key: FontKey; label: string; cssVar: string; category: string }[] = [
  { key: "naskh", label: "نسخ", cssVar: "var(--font-naskh), serif", category: "كلاسيكي" },
  { key: "cairo", label: "القاهرة", cssVar: "var(--font-cairo), sans-serif", category: "عصري" },
  { key: "amiri", label: "أميري", cssVar: "var(--font-amiri), serif", category: "كلاسيكي" },
  { key: "kufi", label: "كوفي", cssVar: "var(--font-kufi), sans-serif", category: "كلاسيكي" },
  { key: "reem", label: "ريم", cssVar: "var(--font-reem), sans-serif", category: "عصري" },
  { key: "scheherazade", label: "شهرزاد", cssVar: "var(--font-scheherazade), serif", category: "كلاسيكي" },
  { key: "lateef", label: "لطيف", cssVar: "var(--font-lateef), serif", category: "كلاسيكي" },
  { key: "marhey", label: "مرحي", cssVar: "var(--font-marhey), sans-serif", category: "عصري" },
  { key: "lemonada", label: "ليموناضة", cssVar: "var(--font-lemonada), sans-serif", category: "عصري" },
  { key: "tajawal", label: "تجوال", cssVar: "var(--font-tajawal), sans-serif", category: "عصري" },
  { key: "almarai", label: "المراعي", cssVar: "var(--font-almarai), sans-serif", category: "عصري" },
  { key: "aref", label: "عارف", cssVar: "var(--font-aref), serif", category: "كلاسيكي" },
  { key: "mirza", label: "ميرزا", cssVar: "var(--font-mirza), sans-serif", category: "عصري" },
  { key: "harmattan", label: "هرمتن", cssVar: "var(--font-harmattan), sans-serif", category: "عصري" },
  { key: "mada", label: "مدى", cssVar: "var(--font-mada), sans-serif", category: "عصري" },
  { key: "jomhuria", label: "جمهورية", cssVar: "var(--font-jomhuria), serif", category: "زخرفي" },
  { key: "rakkas", label: "ركاص", cssVar: "var(--font-rakkas), sans-serif", category: "زخرفي" },
  { key: "baloo", label: "بالو", cssVar: "var(--font-baloo), sans-serif", category: "عصري" },
  { key: "elMessiri", label: "المسيري", cssVar: "var(--font-elmessiri), sans-serif", category: "عصري" },
  { key: "changa", label: "تشانجا", cssVar: "var(--font-changa), sans-serif", category: "عصري" },
  { key: "katibeh", label: "كاتبة", cssVar: "var(--font-katibeh), serif", category: "زخرفي" },
  { key: "lalezar", label: "لاله زار", cssVar: "var(--font-lalezar), sans-serif", category: "زخرفي" },
];

export const DEFAULT_FONT: FontKey = "naskh";

export const FONT_KEY_STORAGE = "reader-font-family";
export const FONT_SIZE_STORAGE = "reader-font-size";

export function getFontCssVar(key: FontKey): string {
  return FONTS.find((f) => f.key === key)?.cssVar || FONTS[0].cssVar;
}

export function getFontLabel(key: FontKey): string {
  return FONTS.find((f) => f.key === key)?.label || "";
}

export function isValidFont(key: string): key is FontKey {
  return FONTS.some((f) => f.key === key);
}
