"use client";

import { BookPageReader } from "@/components/site/book-page-reader";
import {
  type ReaderChapter,
  type ChapterLink,
} from "@/components/site/reader-view";
import type { Character } from "@/lib/characters";

/**
 * ReaderRouter — all themes use the same standalone chapter page
 * with prev/next navigation. No infinite scroll.
 */
export function ReaderRouter({
  chapter,
  prev,
  next,
  characters,
  searchQuery,
}: {
  chapter: ReaderChapter;
  prev: ChapterLink;
  next: ChapterLink;
  characters: Character[];
  searchQuery: string;
}) {
  return (
    <BookPageReader
      chapter={chapter}
      prev={prev}
      next={next}
      characters={characters}
    />
  );
}
