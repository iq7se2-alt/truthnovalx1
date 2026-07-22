// سيد الحقيقة — Character utilities (reader integration)
// NOT a component. Pure helpers for processing Arabic content with character names.

export type Character = {
  id: number;
  name: string;
  nameEn: string | null;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  isMain: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type CharacterSegment =
  | { type: "text"; value: string }
  | { type: "character"; name: string; characterId: number };

/**
 * Arabic letter test — used for word-boundary checks since JavaScript's
 * \b does NOT work for Arabic letters (they are not in [a-zA-Z]).
 * Covers basic Arabic block (٠-ي), Tatweel, Arabic-Indic digits, and
 * Arabic supplement / extension ranges.
 */
const ARABIC_LETTER = /[\u0621-\u064A\u0660-\u0669\u0640\u0671-\u06D3\u06D5\u06E1-\u06FF]/;

function isArabicLetter(ch: string | undefined): boolean {
  if (!ch) return false;
  return ARABIC_LETTER.test(ch);
}

/**
 * Process Arabic content and split into segments, marking character name
 * occurrences as `character` segments and the surrounding text as `text`.
 *
 * - Characters are sorted by name length DESCENDING so longer names match
 *   first (e.g. "روبين بورتون" before "روبين").
 * - Word boundaries are respected: the characters immediately before/after
 *   a match must NOT be Arabic letters — this prevents partial matches
 *   inside larger words.
 * - Once a position is consumed by a longer match, shorter overlapping
 *   matches are skipped (no double-counting).
 */
export function processContentWithCharacters(
  content: string,
  characters: Character[]
): CharacterSegment[] {
  if (!content) return [];
  if (!characters || characters.length === 0) {
    return [{ type: "text", value: content }];
  }

  // Sort by name length descending so longer names match first.
  const sorted = [...characters]
    .filter((c) => c.name && c.name.length > 0)
    .sort((a, b) => b.name.length - a.name.length);

  type Match = { start: number; end: number; characterId: number; name: string };
  const matches: Match[] = [];
  const used = new Array(content.length).fill(false);

  for (const ch of sorted) {
    let idx = 0;
    while (idx < content.length) {
      const pos = content.indexOf(ch.name, idx);
      if (pos === -1) break;
      const end = pos + ch.name.length;

      const beforeChar = pos > 0 ? content[pos - 1] : "";
      const afterChar = end < content.length ? content[end] : "";
      const boundaryOk =
        !isArabicLetter(beforeChar) && !isArabicLetter(afterChar);

      // Skip if any of these positions are already consumed by a longer match.
      let conflict = false;
      for (let i = pos; i < end; i++) {
        if (used[i]) {
          conflict = true;
          break;
        }
      }

      if (boundaryOk && !conflict) {
        matches.push({
          start: pos,
          end,
          characterId: ch.id,
          name: ch.name,
        });
        for (let i = pos; i < end; i++) used[i] = true;
      }

      idx = end; // advance past this position regardless
    }
  }

  if (matches.length === 0) {
    return [{ type: "text", value: content }];
  }

  matches.sort((a, b) => a.start - b.start);

  const segments: CharacterSegment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ type: "text", value: content.slice(cursor, m.start) });
    }
    segments.push({
      type: "character",
      name: m.name,
      characterId: m.characterId,
    });
    cursor = m.end;
  }
  if (cursor < content.length) {
    segments.push({ type: "text", value: content.slice(cursor) });
  }

  return segments;
}

/** Arabic dialogue detection patterns: "..." "..." «...» (at least 1 char inside). */
const DIALOGUE_REGEXES = [
  /"[^"]{1,}"/, // ASCII straight quotes
  /\u201C[^\u201D]{1,}\u201D/, // curly double quotes (open/close)
  /«[^»]{1,}»/, // French guillemets
];

/**
 * Detects dialogue in an Arabic paragraph and returns a hex color for it.
 *
 * Rules:
 *  - No dialogue present → return null.
 *  - Dialogue + paragraph mentions a character name (with word boundary) →
 *      return that character's color. If the matched character isMain,
 *      override with bright gold #e3c878.
 *  - Dialogue exists but no character name match → default gold-soft #c9a84c.
 */
export function detectDialogueColor(
  paragraph: string,
  characters: Character[]
): string | null {
  if (!paragraph) return null;

  const hasDialogue = DIALOGUE_REGEXES.some((re) => re.test(paragraph));
  if (!hasDialogue) return null;

  for (const ch of characters) {
    if (!ch.name) continue;
    const idx = paragraph.indexOf(ch.name);
    if (idx === -1) continue;
    const beforeChar = idx > 0 ? paragraph[idx - 1] : "";
    const afterChar =
      idx + ch.name.length < paragraph.length
        ? paragraph[idx + ch.name.length]
        : "";
    if (!isArabicLetter(beforeChar) && !isArabicLetter(afterChar)) {
      if (ch.isMain) return "#e3c878";
      return ch.color || "#c9a84c";
    }
  }

  // Dialogue exists but no character matched.
  return "#c9a84c";
}

/**
 * Detect which characters are mentioned in the given text.
 * Returns characters sorted: isMain first, then by first appearance.
 */
export function getMentionedCharacters(
  content: string,
  characters: Character[]
): Character[] {
  const mentioned: Array<{ character: Character; index: number }> = [];

  for (const ch of characters) {
    const idx = content.indexOf(ch.name);
    if (idx >= 0) {
      // Verify word boundary
      const before = content[idx - 1];
      const after = content[idx + ch.name.length];
      if (!isArabicLetter(before) && !isArabicLetter(after)) {
        mentioned.push({ character: ch, index: idx });
      }
    }
  }

  // Sort: isMain first, then by first appearance
  mentioned.sort((a, b) => {
    if (a.character.isMain !== b.character.isMain) {
      return a.character.isMain ? -1 : 1;
    }
    return a.index - b.index;
  });

  return mentioned.map((m) => m.character);
}
