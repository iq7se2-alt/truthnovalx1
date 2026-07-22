"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, BookOpen, Home, Lock, X, Bell, Users, Trophy, MapPin, MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, readMore } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { WordOceanToggle } from "./word-ocean";
import {
  SearchDialog,
  SearchTrigger,
} from "@/components/site/search-dialog";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية", labelEn: "Home", icon: Home },
  { href: "/chapters", label: "الفصول", labelEn: "Chapters", icon: BookOpen },
  { href: "/characters", label: "الشخصيات", labelEn: "Characters", icon: Users },
  { href: "/comments", label: "التعليقات", labelEn: "Comments", icon: MessageSquare },
  { href: "/worldmap", label: "الخريطة", labelEn: "World Map", icon: MapPin },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoRotating, setLogoRotating] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { t } = useLanguage();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScroll = () => {
      const currentY = window.scrollY;
      // Always show at the very top
      if (currentY < 50) {
        setHidden(false);
      } else if (currentY > lastScrollY + 8) {
        // Scrolling DOWN
        setHidden(true);
      } else if (currentY < lastScrollY - 8) {
        // Scrolling UP
        setHidden(false);
      }
      lastScrollY = currentY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="glass-nav fixed top-0 right-0 left-0 z-50 transition-transform duration-300 ease-in-out"
      style={{ transform: hidden ? "translateY(-100%)" : "translateY(0)" }}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        {/* Logo with hover rotation */}
        <Link
          href="/"
          className="group flex items-center gap-3"
          onMouseEnter={() => setLogoRotating(true)}
          onMouseLeave={() => setLogoRotating(false)}
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-md border border-gold/40 bg-muted">
            <span
              className="text-gold-gradient font-bold text-lg leading-none"
              style={{
                transform: logoRotating ? "rotate(360deg)" : "rotate(0deg)",
                transition: "transform 0.4s ease",
              }}
            >
              س
            </span>
            <span className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-gold/0 transition group-hover:ring-gold/40" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-naskh text-base font-bold text-foreground">
              سيد الحقيقة
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-gold/70">
              Lord of the Truth
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-active={isActive(l.href)}
              className={cn(
                "nav-link-underline rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150",
                isActive(l.href)
                  ? "text-gold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(l.label)}
            </Link>
          ))}

          {/* Search */}
          <SearchDialog>
            <SearchTrigger />
          </SearchDialog>

          {/* Notifications */}
          <NotificationsBell />

          {/* Language toggle */}
          <LanguageToggle />

          {/* Word Ocean theme toggle */}
          <WordOceanToggle />

          {/* Theme toggle */}
          <ThemeToggle />

          <Link
            href="/admin"
            className={cn(
              "mr-1 flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive("/admin")
                ? "border-gold/60 text-gold"
                : "border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold"
            )}
          >
            <Lock className="h-3.5 w-3.5" />
            {t("الإدارة")}
          </Link>
        </div>

        {/* Mobile: search + notifications + theme + menu */}
        <div className="flex items-center gap-1 md:hidden">
          <SearchDialog>
            <SearchTrigger />
          </SearchDialog>
          <NotificationsBell />
          <LanguageToggle />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="القائمة"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gold/25 text-gold/80"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 border-gold/20 bg-background p-0"
            >
              <SheetTitle className="px-5 pt-5 font-naskh text-lg text-gold">
                القائمة
              </SheetTitle>
              <div className="gold-divider mt-4" />
              <div className="flex flex-col gap-1 p-4">
                {NAV_LINKS.map((l, i) => {
                  const Icon = l.icon;
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                        isActive(l.href)
                          ? "bg-gold/10 text-gold"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      )}
                      style={{
                        animation: open
                          ? `float-in 0.3s ease forwards ${i * 0.05}s`
                          : undefined,
                        opacity: open ? undefined : 1,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      {t(l.label)}
                    </Link>
                  );
                })}
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "mt-2 flex items-center gap-3 rounded-md border border-gold/25 px-4 py-3 text-sm font-medium text-gold/80",
                    isActive("/admin") && "border-gold/60 text-gold"
                  )}
                  style={{
                    animation: open
                      ? `float-in 0.3s ease forwards ${NAV_LINKS.length * 0.05}s`
                      : undefined,
                    opacity: open ? undefined : 1,
                  }}
                >
                  <Lock className="h-4 w-4" />
                  {t("الإدارة")}
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

// ====== Notifications Bell ======

type LatestChapter = {
  number: number;
  title: string;
  createdAt: string;
};

function NotificationsBell() {
  const [newCount, setNewCount] = useState(0);
  const [latest, setLatest] = useState<LatestChapter[]>([]);
  const [open, setOpen] = useState(false);
  const { t, formatNumber } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chapters?page=1&pageSize=5&sort=desc", {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        const chapters: LatestChapter[] = data.chapters || [];
        setLatest(chapters);

        const lastSeenStr = localStorage.getItem("lastSeenChapterNumber");
        const lastSeen = lastSeenStr ? Number(lastSeenStr) : 0;
        const newest = chapters.length > 0 ? chapters[0].number : 0;

        if (newest > lastSeen) {
          setNewCount(newest - lastSeen);
        } else {
          setNewCount(0);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o && latest.length > 0) {
      localStorage.setItem(
        "lastSeenChapterNumber",
        String(latest[0].number)
      );
      setNewCount(0);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          aria-label="الإشعارات"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-gold/70 transition-colors hover:bg-white/5 hover:text-gold"
        >
          <Bell className="h-4 w-4" />
          {newCount > 0 && (
            <span className="pulse-gold absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-[#1a0a00]">
              {formatNumber(newCount > 99 ? "+99" : newCount)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        className="w-72 border-gold/25 bg-popover p-0"
      >
        <div className="border-b border-gold/15 px-4 py-3">
          <h3 className="font-naskh text-sm font-bold text-gold">{t("آخر الفصول")}</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {latest.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {t("لا توجد فصول بعد")}
            </p>
          ) : (
            latest.map((ch) => (
              <Link
                key={ch.number}
                href={`/chapters/${ch.number}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-muted/70 font-mono text-xs font-bold text-gold">
                  {formatNumber(ch.number)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-naskh text-sm font-medium text-foreground">
                    {readMore(ch.title, 30)}
                  </p>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">
                    {formatShortDate(ch.createdAt)}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
