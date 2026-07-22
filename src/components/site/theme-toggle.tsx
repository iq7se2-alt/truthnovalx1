"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, BookOpen, Film, BookMarked } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Mount detection without setState-in-effect
const emptySubscribe = () => () => {};
function getClientSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 text-gold/60">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";
  const isSepia = theme === "sepia";
  const isCinematic = theme === "cinematic";
  const isBook = theme === "book";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-gold/70 hover:text-gold"
          aria-label="تبديل المظهر"
        >
          {isCinematic ? (
            <Film className="h-4 w-4" />
          ) : isBook ? (
            <BookMarked className="h-4 w-4" />
          ) : isDark ? (
            <Moon className="h-4 w-4" />
          ) : isSepia ? (
            <BookOpen className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="ml-2 h-4 w-4" />
          فاتح
          {!isDark && !isSepia && !isCinematic && !isBook && theme !== "system" && (
            <span className="mr-auto text-gold">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("sepia")}>
          <BookOpen className="ml-2 h-4 w-4" />
          أصفر فاتح
          {isSepia && <span className="mr-auto text-gold">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="ml-2 h-4 w-4" />
          داكن
          {isDark && <span className="mr-auto text-gold">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("cinematic")}>
          <Film className="ml-2 h-4 w-4" />
          سينمائي
          {isCinematic && <span className="mr-auto text-gold">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("book")}>
          <BookMarked className="ml-2 h-4 w-4" />
          كتاب
          {isBook && <span className="mr-auto text-gold">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="ml-2 h-4 w-4" />
          النظام
          {theme === "system" && <span className="mr-auto text-gold">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
