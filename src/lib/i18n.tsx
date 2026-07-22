"use client";

/**
 * Language provider + hook for switching UI chrome between
 * Arabic (default) and English. The novel content itself stays
 * Arabic RTL — only the UI chrome (labels, numbers) switches.
 *
 * - `lang`    : current language ("ar" | "en")
 * - `setLang` : switch language (persisted to localStorage)
 * - `toggle`  : convenience toggle between "ar" and "en"
 * - `t(key)`  : translate an Arabic UI string → English when lang === "en".
 *               Keys are the Arabic source strings (so call sites read naturally).
 * - `formatNumber(n)` : format a number with Arabic-Indic digits when lang === "ar",
 *                       Western digits when lang === "en".
 *
 * The state is backed by a module-level external store (kept in sync with
 * localStorage) and exposed to React via `useSyncExternalStore`. This avoids
 * setState-in-effect (which the React hooks lint rule forbids) and avoids
 * hydration mismatches by returning "ar" on the server and the first client
 * render — the actual localStorage value is read on the first subscription.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Language = "ar" | "en";

const STORAGE_KEY = "site-language";

/** Dictionary: Arabic source → English translation. */
const TRANSLATIONS: Record<string, string> = {
  // Nav + general chrome
  الرئيسية: "Home",
  الفصول: "Chapters",
  الشخصيات: "Characters",
  التعليقات: "Comments",
  الخريطة: "Map",
  الإدارة: "Admin",
  "لوحة الإدارة": "Admin Panel",

  // Hero / CTA
  "ابدأ القراءة": "Start Reading",
  "تصفّح الفصول": "Browse Chapters",
  "فصل منشور": "Published Chapters",
  "فصل · فلر": "Chapter · Filler",
  كلمة: "Words",
  "وقت القراءة الكلي": "Total Reading Time",
  "آخر فصل": "Latest Chapter",
  "آخر الفصول": "Latest Chapters",
  "قائمة الفصول": "Chapter List",
  "فهرس الرواية": "Novel Index",
  فلر: "Filler",
  فصل: "Chapter",
  "كل الفصول": "All Chapters",
  "ابحث برقم الفصل أو عنوانه": "Search by chapter number or title",
  "ابحث برقم الفصل أو عنوانه...": "Search by chapter number or title...",
  تنازلي: "Descending",
  تصاعدي: "Ascending",
  مسح: "Clear",
  محدد: "selected",
  "نتائج البحث عن": "Search results for",
  "عرض تصاعدي (1 → الأعلى)": "Ascending view (1 → Top)",
  "عرض تنازلي (الأعلى → 1)": "Descending view (Top → 1)",
  "ابدأ من الفصل الأول": "Start from the first chapter",
  "اغرق في عالم سيد الحقيقة": "Dive into the world of Lord of the Truth",

  // Loading / empty states
  "تحميل هذا الفصل PDF": "Download this chapter as PDF",
  "لا توجد فصول بعد": "No chapters yet",
  "لا توجد فصول بعد.": "No chapters yet.",
  "لا توجد نتائج مطابقة": "No matching results",
  "وصلت لنهاية الفصول": "Reached the end of chapters",
  "تحميل المزيد": "Loading more",
  "تحميل المزيد...": "Loading more...",
  "✦ وصلت لنهاية الفصول ✦": "✦ Reached the end of chapters ✦",

  // Settings
  "إعدادات القراءة": "Reading Settings",

  // Ambient sounds (matching ambient-sounds.tsx labels)
  مطر: "Rain",
  نار: "Fire",
  رياح: "Wind",
  أمواج: "Ocean",
  رعد: "Thunder",
  غابة: "Forest",
  مكتبة: "Library",
  كون: "Cosmic",
};

// ===== External store (module-level) =====
//
// All consumers share a single store. The initial value is "ar" (matches SSR);
// on the client, the first `subscribe()` call reads localStorage and updates
// the value if needed, then notifies listeners.

let currentLang: Language = "ar";
const listeners = new Set<() => void>();
let storeInitialized = false;

function initStore() {
  if (storeInitialized || typeof window === "undefined") return;
  storeInitialized = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") {
      currentLang = stored;
    }
  } catch {
    // ignore (private mode etc.)
  }
}

function subscribe(listener: () => void) {
  // First subscription reads localStorage. This happens after hydration so
  // it cannot cause hydration mismatches.
  initStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Language {
  return currentLang;
}

function getServerSnapshot(): Language {
  return "ar";
}

function setLangInternal(l: Language) {
  if (currentLang === l) return;
  currentLang = l;
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

// ===== Helpers =====

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicDigitsLocal(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)]);
}

// ===== Context =====

type LanguageContextValue = {
  lang: Language;
  setLang: (l: Language) => void;
  toggle: () => void;
  t: (key: string) => string;
  formatNumber: (n: number | string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLang = useCallback((l: Language) => {
    setLangInternal(l);
  }, []);

  const toggle = useCallback(() => {
    setLangInternal(currentLang === "ar" ? "en" : "ar");
  }, []);

  const t = useCallback(
    (key: string) => {
      if (lang === "en") {
        const translated = TRANSLATIONS[key];
        if (translated) return translated;
      }
      return key;
    },
    [lang]
  );

  const formatNumber = useCallback(
    (n: number | string) => {
      if (lang === "ar") return toArabicDigitsLocal(n);
      return String(n);
    },
    [lang]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, toggle, t, formatNumber }),
    [lang, setLang, toggle, t, formatNumber]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}
