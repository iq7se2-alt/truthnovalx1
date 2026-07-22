import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-gold/15 bg-background">
      {/* Shimmer divider */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--gold), transparent)",
          backgroundSize: "200% 100%",
          animation: "shimmer 4s linear infinite",
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Quote from the novel */}
        <div className="mb-8 text-center">
          <p className="mx-auto max-w-2xl font-naskh text-base italic leading-loose text-foreground/60">
            «روبين بورتون، شاب وُلد فوجد نفسه لديه الموهبة — ما عدا شيء واحد..
            الرغبة في استعمال كل هذا»
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-naskh font-bold text-gold">سيد الحقيقة</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Lord of the Truth
            </span>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            © {year} — جميع الحقوق محفوظة. رواية سيد الحقيقة.
          </p>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/chapters"
              className="text-muted-foreground transition-colors hover:text-gold"
            >
              الفصول
            </Link>
            <Link
              href="/characters"
              className="text-muted-foreground transition-colors hover:text-gold"
            >
              الشخصيات والعلاقات
            </Link>
            <Link
              href="/comments"
              className="text-muted-foreground transition-colors hover:text-gold"
            >
              التعليقات
            </Link>
            <Link
              href="/worldmap"
              className="text-muted-foreground transition-colors hover:text-gold"
            >
              الخريطة
            </Link>
            <Link
              href="/admin"
              className="text-muted-foreground transition-colors hover:text-gold"
            >
              لوحة الإدارة
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
