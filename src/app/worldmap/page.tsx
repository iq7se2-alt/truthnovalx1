import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, MapPin, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toArabicDigits } from "@/lib/format";
import { WorldMapInteractive } from "@/components/site/world-map-interactive";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "خريطة العالم | سيد الحقيقة",
  description: "استكشف عالم رواية سيد الحقيقة",
};

export default async function WorldMapPage() {
  const locations = await db.location.findMany({
    orderBy: { startChapter: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      {/* ═══ HEADER ═══ */}
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <Compass className="h-3.5 w-3.5" />
          عالم الرواية
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient sm:text-5xl">
          خريطة العالم
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {locations.length > 0
            ? `${toArabicDigits(locations.length)} مكان`
            : "لم تُضف أماكن بعد"}
        </p>
      </div>

      {locations.length === 0 ? (
        <div className="gold-card animate-float-in rounded-lg p-12 text-center">
          <MapPin className="mx-auto mb-4 h-12 w-12 text-gold/30" />
          <p className="font-naskh text-lg text-muted-foreground">
            لا توجد أماكن بعد.
          </p>
          <p className="mt-2 text-sm text-muted-foreground/70">
            يمكن إضافة الأماكن من لوحة الإدارة.
          </p>
          <Link href="/admin" className="mt-6 inline-block">
            <Button className="bg-gold text-[#1a0a00] hover:bg-gold-soft">
              الذهاب للإدارة
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ═══ INTERACTIVE MAP ═══ */}
          <WorldMapInteractive locations={locations} />

          {/* ═══ LOCATION CARDS ═══ */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc, i) => (
              <div
                key={loc.id}
                className="gold-card animate-float-in group overflow-hidden rounded-lg transition-all hover:border-gold/40 hover:shadow-lg hover:shadow-gold/10"
                style={{ animationDelay: `${Math.min(i, 15) * 60}ms` }}
              >
                {/* Image header */}
                {loc.imageUrl ? (
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={loc.imageUrl}
                      alt={loc.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-2 right-3 left-3">
                      <h3 className="font-naskh text-lg font-bold text-white drop-shadow-lg">
                        {loc.name}
                      </h3>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-20 items-center justify-center bg-accent/50">
                    <MapPin className="h-8 w-8 text-gold/30" />
                    <h3 className="mr-2 font-naskh text-lg font-bold text-gold">
                      {loc.name}
                    </h3>
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs text-gold/70">
                    <span className="rounded-md border border-gold/20 bg-gold/10 px-1.5 py-0.5 font-bold">
                      فصل {toArabicDigits(loc.startChapter)}
                    </span>
                    {loc.endChapter && (
                      <span className="text-muted-foreground">
                        → فصل {toArabicDigits(loc.endChapter)}
                      </span>
                    )}
                  </div>
                  {loc.description && (
                    <p className="text-sm leading-relaxed text-foreground/75 line-clamp-3">
                      {loc.description}
                    </p>
                  )}
                  <Link
                    href={`/chapters/${loc.startChapter}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-gold/70 transition-colors hover:text-gold"
                  >
                    اقرأ من هذا الفصل
                    <ArrowLeft className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Back */}
      <div className="mt-10 flex justify-center">
        <Link href="/">
          <Button
            variant="outline"
            className="border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold"
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}
