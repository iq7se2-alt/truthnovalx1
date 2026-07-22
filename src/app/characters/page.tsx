import { db } from "@/lib/db";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import { toArabicDigits } from "@/lib/format";
import { CharactersGrid } from "@/components/site/characters-grid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الشخصيات | سيد الحقيقة",
  description: "تعرف على شخصيات رواية سيد الحقيقة وعلاقاتهم",
};

export default async function CharactersPage() {
  // Single efficient query — get characters with appearance info
  const [characters, relations, appearanceData] = await Promise.all([
    db.character.findMany({
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        description: true,
        imageUrl: true,
        color: true,
        isMain: true,
      },
    }),
    db.characterRelation.findMany({
      select: {
        id: true,
        fromId: true,
        toId: true,
        type: true,
        description: true,
        from: { select: { name: true } },
        to: { select: { name: true } },
      },
    }),
    // Get appearance data: characterId → list of chapter numbers
    db.chapterCharacter.findMany({
      select: {
        characterId: true,
        chapter: { select: { number: true } },
      },
    }),
  ]);

  // Build appearance map: characterId → { count, chapters: number[] }
  const appearanceMap = new Map<number, { count: number; chapters: number[] }>();
  for (const app of appearanceData) {
    const existing = appearanceMap.get(app.characterId);
    if (existing) {
      if (!existing.chapters.includes(app.chapter.number)) {
        existing.chapters.push(app.chapter.number);
        existing.count++;
      }
    } else {
      appearanceMap.set(app.characterId, {
        count: 1,
        chapters: [app.chapter.number],
      });
    }
  }

  // Show ALL characters (even without appearances) — they all have images from Discord
  const visibleCharacters = characters;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      {/* ═══ HEADER ═══ */}
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <Users className="h-3.5 w-3.5" />
          شخصيات وعلاقات الرواية
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
          لوحة الشخصيات
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {visibleCharacters.length > 0 ? (
            <>
              <span className="font-bold text-gold">
                {toArabicDigits(visibleCharacters.length)}
              </span>{" "}
              شخصية ·{" "}
              <span className="font-bold text-gold">
                {toArabicDigits(relations.length)}
              </span>{" "}
              علاقة
            </>
          ) : (
            "لم تُضف شخصيات بعد"
          )}
        </p>
      </div>

      {visibleCharacters.length === 0 ? (
        <div className="gold-card rounded-lg p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-gold/30" />
          <p className="font-naskh text-lg text-muted-foreground">
            لا توجد شخصيات بعد.
          </p>
        </div>
      ) : (
        <CharactersGrid
          characters={visibleCharacters.map((c) => ({
            ...c,
            appearanceCount: appearanceMap.get(c.id)?.count || 0,
            chapters: appearanceMap.get(c.id)?.chapters || [],
          }))}
          relations={relations.map((r) => ({
            id: r.id,
            fromId: r.fromId,
            toId: r.toId,
            type: r.type,
            description: r.description,
            fromName: r.from.name,
            toName: r.to.name,
          }))}
        />
      )}
    </div>
  );
}
