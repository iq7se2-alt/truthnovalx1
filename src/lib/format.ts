/** Format a date for Arabic display (Gregorian, Arabic month names). */
export function formatArabicDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return d.toLocaleDateString("ar", {
      year: "numeric",
      month: "long",
      day: "numeric",
      calendar: "gregory",
    });
  } catch {
    return d.toLocaleDateString();
  }
}

/** Short numeric date like 2024/05/01 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/** Convert western digits to Arabic-Indic for display flair */
export function toArabicDigits(input: number | string): string {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(input).replace(/[0-9]/g, (d) => map[Number(d)]);
}

/** Time ago in Arabic */
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `منذ ${toArabicDigits(years)} ${years === 1 ? "سنة" : "سنوات"}`;
  if (months > 0) return `منذ ${toArabicDigits(months)} ${months === 1 ? "شهر" : "أشهر"}`;
  if (weeks > 0) return `منذ ${toArabicDigits(weeks)} ${weeks === 1 ? "أسبوع" : "أسابيع"}`;
  if (days > 0) return `منذ ${toArabicDigits(days)} ${days === 1 ? "يوم" : "أيام"}`;
  if (hours > 0) return `منذ ${toArabicDigits(hours)} ${hours === 1 ? "ساعة" : "ساعات"}`;
  if (minutes > 0) return `منذ ${toArabicDigits(minutes)} ${minutes === 1 ? "دقيقة" : "دقائق"}`;
  return "الآن";
}

/** Count words in a (possibly Arabic) text blob. */
export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/** Reading time in minutes (avg ~200 wpm for Arabic). */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}
