// Scroll-position memory for the reader — persists per chapter in localStorage.
// No accounts required; everything is client-side.

const SCROLL_KEY = (chapterNumber: number) => `scroll-pos-${chapterNumber}`;
const LAST_READ_KEY = "last-read-chapter";

export function saveScrollPosition(chapterNumber: number, scrollY: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SCROLL_KEY(chapterNumber), String(scrollY));
    localStorage.setItem(LAST_READ_KEY, String(chapterNumber));
  } catch {
    // localStorage may be unavailable (private mode, etc.) — ignore.
  }
}

export function getScrollPosition(chapterNumber: number): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(SCROLL_KEY(chapterNumber));
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export function getLastReadChapter(): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(LAST_READ_KEY);
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export function clearScrollPosition(chapterNumber: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SCROLL_KEY(chapterNumber));
  } catch {
    // ignore
  }
}
