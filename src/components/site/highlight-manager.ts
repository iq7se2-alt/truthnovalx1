// Paragraph highlight memory — persists per chapter in localStorage.
// Toggling a highlight adds/removes a gold-glow style on the paragraph.

export type Highlight = {
  paragraphIndex: number;
  text: string; // first 50 chars for identification
};

const HL_KEY = (chapterNumber: number) => `highlights-${chapterNumber}`;

export function getHighlights(chapterNumber: number): Highlight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HL_KEY(chapterNumber));
    return raw ? (JSON.parse(raw) as Highlight[]) : [];
  } catch {
    return [];
  }
}

export function toggleHighlight(
  chapterNumber: number,
  paraIndex: number,
  text: string
): Highlight[] {
  const current = getHighlights(chapterNumber);
  const existing = current.findIndex((h) => h.paragraphIndex === paraIndex);
  if (existing >= 0) {
    current.splice(existing, 1);
  } else {
    current.push({ paragraphIndex: paraIndex, text: text.substring(0, 50) });
  }
  try {
    localStorage.setItem(HL_KEY(chapterNumber), JSON.stringify(current));
  } catch {
    // ignore quota / private mode errors
  }
  return current;
}

/** Returns the set of highlighted paragraph indices for a chapter (lookup-friendly). */
export function getHighlightIndices(chapterNumber: number): Set<number> {
  return new Set(getHighlights(chapterNumber).map((h) => h.paragraphIndex));
}
