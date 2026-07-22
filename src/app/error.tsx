"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="cosmic-bg relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="starfield absolute inset-0" />
      <div className="relative">
        <p className="font-naskh text-5xl font-bold text-gold-gradient">عذراً</p>
        <h1 className="mt-4 font-naskh text-2xl font-bold text-foreground">
          حدث خطأ ما
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          حدث خطأ غير متوقع. يمكنك المحاولة مرة أخرى أو العودة للرئيسية.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            onClick={reset}
            className="bg-gold text-[#1a0a00] hover:bg-gold-soft"
          >
            إعادة المحاولة
          </Button>
          <Link href="/">
            <Button
              variant="outline"
              className="border-gold/25 text-gold hover:border-gold/50 hover:bg-gold/10"
            >
              الرئيسية
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
