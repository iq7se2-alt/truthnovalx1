/**
 * Search utilities — pure functions used by the search API, the search dialog,
 * and the reader page (for in-page highlight + scroll-to-match).
 *
 * Paragraph splitting matches ReaderView's logic (`/\n\s*\n+/` then trim + filter)
 * so paragraph indices are stable across the API, dialog, and reader.
 */

export type HighlightSegment = { type: "text" | "mark"; value: string };

/**
 * Split `text` into segments, wrapping every (case-insensitive) occurrence of
 * `query` in a 'mark' segment. Returns the full text as a single 'text'
 * segment when `query` is empty/whitespace.
 *
 * Example:
 *   highlightSearchTerm("Hello world", "world")
 *   => [{type:'text', value:'Hello '}, {type:'mark', value:'world'}]
 */
export function highlightSearchTerm(
  text: string,
  query: string
): HighlightSegment[] {
  const q = (query || "").trim();
  if (!q) return [{ type: "text", value: text }];

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const segments: HighlightSegment[] = [];

  let i = 0;
  while (i < text.length) {
    const idx = lowerText.indexOf(lowerQuery, i);
    if (idx === -1) {
      segments.push({ type: "text", value: text.slice(i) });
      break;
    }
    if (idx > i) {
      segments.push({ type: "text", value: text.slice(i, idx) });
    }
    segments.push({ type: "mark", value: text.slice(idx, idx + q.length) });
    i = idx + q.length;
  }

  // Drop empty segments (defensive — shouldn't normally happen)
  return segments.filter((s) => s.value.length > 0);
}

/**
 * Find all positions of `query` in `content`. Splits content into paragraphs
 * using the same logic as ReaderView (`/\n\s*\n+/` + trim + filter(Boolean)),
 * then `indexOf` (case-insensitive) within each paragraph.
 *
 * Returns one entry per occurrence: `{ paragraphIndex, charOffset }` where
 * `charOffset` is relative to the trimmed paragraph (so it can be used
 * directly by the reader when highlighting that paragraph).
 *
 * Used by the reader to scroll to the first match.
 */
export function findSearchPositions(
  content: string,
  query: string
): Array<{ paragraphIndex: number; charOffset: number }> {
  const q = (query || "").trim();
  if (!q) return [];

  // Same paragraph-splitting logic as ReaderView — keep indices in sync.
  const paragraphs = content
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const lowerQuery = q.toLowerCase();
  const positions: Array<{ paragraphIndex: number; charOffset: number }> = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const lowerP = p.toLowerCase();
    let from = 0;
    for (;;) {
      const idx = lowerP.indexOf(lowerQuery, from);
      if (idx === -1) break;
      positions.push({ paragraphIndex: i, charOffset: idx });
      from = idx + lowerQuery.length;
    }
  }

  return positions;
}
