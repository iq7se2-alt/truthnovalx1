"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, BookOpen, Star, X, Network } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toArabicDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

type Character = {
  id: number;
  name: string;
  nameEn: string | null;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  isMain: boolean;
  appearanceCount: number;
  chapters: number[];
};

type Relation = {
  id: number;
  fromId: number;
  toId: number;
  type: string;
  description: string | null;
  fromName: string;
  toName: string;
};

const REL_STYLES: Record<string, { color: string; label: string }> = {
  أب: { color: "#d4b05e", label: "أب" },
  أم: { color: "#e3c878", label: "أم" },
  صديق: { color: "#22c55e", label: "صديق" },
  عدو: { color: "#ef4444", label: "عدو" },
  معلم: { color: "#3b82f6", label: "معلم" },
  تلميذ: { color: "#60a5fa", label: "تلميذ" },
  عائلة: { color: "#fbbf24", label: "عائلة" },
  حليف: { color: "#a78bfa", label: "حليف" },
  زوج: { color: "#ec4899", label: "زوج" },
  أخ: { color: "#06b6d4", label: "أخ" },
  ابن: { color: "#f59e0b", label: "ابن" },
  تابع: { color: "#8b5cf6", label: "تابع" },
  سيده: { color: "#dc2626", label: "سيده" },
};

/**
 * Characters grid — responsive, searchable, filterable.
 * Lightweight: no network graph (was heavy), clean modal with chapter links.
 */
export function CharactersGrid({
  characters,
  relations,
}: {
  characters: Character[];
  relations: Relation[];
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "main" | "withRelations">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let result = characters;
    const query = q.trim();
    if (query) {
      result = result.filter(
        (c) =>
          c.name.includes(query) ||
          (c.nameEn || "").toLowerCase().includes(query.toLowerCase())
      );
    }
    if (filter === "main") result = result.filter((c) => c.isMain);
    if (filter === "withRelations") {
      const charsWithRels = new Set<number>();
      relations.forEach((r) => {
        charsWithRels.add(r.fromId);
        charsWithRels.add(r.toId);
      });
      result = result.filter((c) => charsWithRels.has(c.id));
    }
    return result;
  }, [characters, q, filter, relations]);

  const selected = selectedId
    ? characters.find((c) => c.id === selectedId)
    : null;
  const selectedRelations = selectedId
    ? relations.filter((r) => r.fromId === selectedId || r.toId === selectedId)
    : [];

  return (
    <>
      {/* ═══ FILTER BAR ═══ */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن شخصية..."
            className="border-gold/25 bg-muted pr-10 font-naskh"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gold"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {[
            { id: "all", label: "الكل" },
            { id: "main", label: "رئيسية" },
            { id: "withRelations", label: "بها علاقات" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                filter === f.id
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-gold/20 text-gold/60 hover:border-gold/40"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {toArabicDigits(filtered.length)} شخصية
        </span>
      </div>

      {/* ═══ GRID ═══ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((char) => {
          const charRels = relations.filter(
            (r) => r.fromId === char.id || r.toId === char.id
          );
          return (
            <button
              key={char.id}
              onClick={() => setSelectedId(char.id)}
              className={cn(
                "group relative flex flex-col items-center rounded-2xl border bg-muted/20 p-4 text-center transition-all hover:scale-[1.03] hover:border-gold/50 hover:shadow-xl hover:shadow-gold/10",
                char.isMain
                  ? "border-gold/40 ring-1 ring-gold/20"
                  : "border-gold/15"
              )}
            >
              {/* Circular avatar with gradient ring */}
              <div className="relative mb-3 h-28 w-28 sm:h-32 sm:w-32">
                <div
                  className={cn(
                    "absolute inset-0 rounded-full bg-gradient-to-br from-gold/40 via-purple/30 to-gold/40 opacity-60 blur-sm transition-opacity group-hover:opacity-100",
                    char.isMain && "opacity-80"
                  )}
                />
                <div className="absolute inset-[3px] overflow-hidden rounded-full border-2 border-gold/30 bg-muted">
                  {char.imageUrl ? (
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <span className="font-naskh text-4xl font-bold text-gold/40">
                        {char.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                {char.isMain && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[8px] font-bold text-[#1a0a00] shadow-lg whitespace-nowrap">
                    <Star className="h-2 w-2 fill-current" />
                    رئيسي
                  </span>
                )}
                {char.color && (
                  <span
                    className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-background shadow-md"
                    style={{ backgroundColor: char.color }}
                  />
                )}
              </div>

              <h3 className="font-naskh text-sm font-bold text-foreground line-clamp-1 group-hover:text-gold transition-colors">
                {char.name}
              </h3>
              {char.nameEn && (
                <p className="text-[9px] text-muted-foreground/70 line-clamp-1">
                  {char.nameEn}
                </p>
              )}

              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-2.5 w-2.5" />
                  {toArabicDigits(char.appearanceCount)}
                </span>
                {charRels.length > 0 && (
                  <span className="flex items-center gap-1 text-gold/60">
                    <Users className="h-2.5 w-2.5" />
                    {toArabicDigits(charRels.length)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ DETAIL MODAL ═══ */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold/30 bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with image — FULL image, not cropped */}
            <div className="relative overflow-hidden rounded-t-2xl bg-muted">
              {selected.imageUrl ? (
                <img
                  src={selected.imageUrl}
                  alt={selected.name}
                  className="max-h-[40vh] w-full object-contain"
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <span className="font-naskh text-7xl font-bold text-gold/30">
                    {selected.name.charAt(0)}
                  </span>
                </div>
              )}
              <button
                onClick={() => setSelectedId(null)}
                className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:bg-background hover:text-gold"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {/* Name + badges */}
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-naskh text-2xl font-bold text-gold">
                  {selected.name}
                </h2>
                {selected.isMain && (
                  <span className="flex items-center gap-1 rounded-full bg-gold/90 px-2 py-0.5 text-[10px] font-bold text-[#1a0a00]">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    رئيسي
                  </span>
                )}
              </div>
              {selected.nameEn && (
                <p className="mb-3 text-xs text-gold/60">{selected.nameEn}</p>
              )}

              {/* Description */}
              {selected.description && (
                <p className="mb-4 text-sm leading-loose text-foreground/80">
                  {selected.description}
                </p>
              )}

              {/* Stats */}
              <div className="mb-4 flex gap-3">
                <div className="flex-1 rounded-lg border border-gold/20 bg-muted/50 p-3 text-center">
                  <div className="font-bold text-gold">
                    {toArabicDigits(selected.appearanceCount)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">فصل</div>
                </div>
                <div className="flex-1 rounded-lg border border-gold/20 bg-muted/50 p-3 text-center">
                  <div className="font-bold text-gold">
                    {toArabicDigits(selectedRelations.length)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">علاقة</div>
                </div>
              </div>

              {/* Chapter appearances — clickable, links to chapter with flash */}
              {selected.chapters.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gold/80">
                    <BookOpen className="h-4 w-4" />
                    ظهر في {toArabicDigits(selected.chapters.length)} فصل
                  </h3>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {selected.chapters
                      .sort((a, b) => a - b)
                      .slice(0, 100)
                      .map((chNum) => (
                        <Link
                          key={chNum}
                          href={`/chapters/${chNum}?char=${selected.id}#char-flash`}
                          className="group inline-flex items-center gap-1 rounded-md border border-gold/20 bg-gold/5 px-2 py-1 text-[11px] text-gold/80 transition-all hover:border-gold/50 hover:bg-gold/15 hover:text-gold"
                          title={`الفصل ${chNum} — اضغط للذهاب للفصل وتظليل اسم الشخصية`}
                        >
                          <span className="font-bold">
                            {toArabicDigits(chNum)}
                          </span>
                        </Link>
                      ))}
                    {selected.chapters.length > 100 && (
                      <span className="text-[10px] text-muted-foreground p-1">
                        +{toArabicDigits(selected.chapters.length - 100)} أخرى
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    اضغط رقم الفصل للذهاب إليه وتظليل اسم الشخصية ٣ ثواني
                  </p>
                </div>
              )}

              {/* Relations — compact list */}
              {selectedRelations.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gold/80">
                    <Users className="h-4 w-4" />
                    العلاقات
                  </h3>
                  <div className="space-y-1.5">
                    {selectedRelations.map((rel) => {
                      const isFrom = rel.fromId === selected.id;
                      const otherName = isFrom ? rel.toName : rel.fromName;
                      const style = REL_STYLES[rel.type] || {
                        color: "#888",
                        label: rel.type,
                      };
                      return (
                        <div
                          key={rel.id}
                          className="flex items-center gap-2 rounded-lg border border-gold/15 bg-muted/30 p-2"
                        >
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: `${style.color}20`,
                              color: style.color,
                            }}
                          >
                            {style.label}
                          </span>
                          <span className="text-sm text-foreground/80">
                            {isFrom ? "→" : "←"} {otherName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
