"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import type { Character } from "@/lib/characters";

/**
 * Shows character portraits mentioned in the chapter, as a horizontal strip
 * at the top of the reader (like anime/manga chapter intro cards).
 */
export function ChapterCharactersStrip({
  characters,
}: {
  characters: Character[];
}) {
  if (characters.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5 text-gold/60" />
        <span>الشخصيات في هذا الفصل</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {characters.map((char) => (
          <Link
            key={char.id}
            href="/characters"
            className="group flex w-20 shrink-0 flex-col items-center"
          >
            <div className="relative h-24 w-20 overflow-hidden rounded-md border border-gold/25 bg-accent transition-all group-hover:border-gold/60 group-hover:shadow-lg group-hover:shadow-gold/20">
              {char.imageUrl ? (
                <img
                  src={char.imageUrl}
                  alt={char.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-naskh text-3xl font-bold text-gold/30">
                    {char.name.charAt(0)}
                  </span>
                </div>
              )}
              {char.isMain && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold shadow" />
              )}
            </div>
            <span className="mt-1.5 w-full truncate text-center text-[11px] font-medium text-foreground/80 transition-colors group-hover:text-gold">
              {char.name}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-4" />
    </div>
  );
}
