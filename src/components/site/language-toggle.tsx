"use client";

import { useSyncExternalStore } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

// Mount detection without setState-in-effect (matches ThemeToggle pattern)
const emptySubscribe = () => () => {};
function getClientSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

/**
 * LanguageToggle — a compact button with a Globe icon that cycles between
 * Arabic (ع) and English (EN). Styled to match ThemeToggle: gold border,
 * small, rounded, sits next to the theme toggle in the navbar.
 *
 * The HTML dir attribute stays "rtl" (Arabic novel content is always RTL) —
 * only the UI chrome (labels + digit system) switches.
 */
export function LanguageToggle() {
  const { lang, toggle } = useLanguage();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!mounted) {
    // Placeholder to avoid hydration mismatch
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-gold/60"
        aria-label="Switch language"
      >
        <Globe className="h-4 w-4" />
      </Button>
    );
  }

  const isArabic = lang === "ar";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="h-9 gap-1 rounded-md border border-gold/25 px-2 text-xs font-bold text-gold/80 transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-gold"
      aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}
      title={isArabic ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="font-mono uppercase leading-none">
        {isArabic ? "ع" : "EN"}
      </span>
    </Button>
  );
}
