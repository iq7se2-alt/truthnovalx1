"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { highlightSearchTerm } from "@/lib/search-utils";
import { toArabicDigits } from "@/lib/format";

type Match = { paragraphIndex: number; snippet: string };
type SearchResult = {
  chapterNumber: number;
  chapterTitle: string;
  matchCount: number;
  matches: Match[];
};
type SearchResponse = {
  query: string;
  totalChapters: number;
  totalMatches: number;
  results: SearchResult[];
};

type SearchDialogContextValue = {
  setOpen: (open: boolean) => void;
};
const SearchDialogContext = createContext<SearchDialogContextValue | null>(
  null
);

/**
 * Internal hook: debounce a value by `delay` ms. setState happens inside a
 * setTimeout callback (NOT in the effect body) so it's lint-safe.
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * SearchDialogContent — the actual dialog UI (input + results list).
 * Mounted only while the Dialog is open. Owns its own search state.
 */
function SearchDialogContent({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setTotalMatches(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}&limit=20`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error();
      const data: SearchResponse = await res.json();
      setResults(data.results || []);
      setTotalMatches(data.totalMatches || 0);
    } catch {
      setResults([]);
      setTotalMatches(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Call the memoized search function from useEffect (NOT setState directly).
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // While the user is still typing (query != debouncedQuery), show a
  // "debouncing" loading state without an extra setState in the effect body.
  const isDebouncing = query !== debouncedQuery;
  const isLoading = loading || isDebouncing;
  const trimmedQuery = query.trim();
  const showEmptyHint = trimmedQuery.length < 2;
  const showNoResults =
    !showEmptyHint && !isLoading && results.length === 0;

  // Build the ?q= query param for result links (use trimmed query so the
  // reader highlights what was actually searched).
  const resultQuery = debouncedQuery.trim() || trimmedQuery;

  const handleResultClick = () => {
    onClose();
  };

  return (
    <DialogContent
      className="max-w-2xl border-gold/25 bg-popover p-0 sm:max-w-2xl"
      onOpenAutoFocus={(e) => {
        // Focus the search input instead of the close button when dialog opens.
        e.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <DialogTitle className="sr-only">بحث في المحتوى</DialogTitle>
      <DialogDescription className="sr-only">
        ابحث في محتوى الرواية
      </DialogDescription>

      {/* Search input row */}
      <div className="flex items-center gap-2 border-b border-gold/20 p-3">
        <Search className="h-5 w-5 shrink-0 text-gold/60" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في محتوى الرواية..."
          aria-label="بحث"
          className="font-naskh min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold/60" />
        )}
      </div>

      {/* Results */}
      <div className="max-h-[60vh] overflow-y-auto p-3">
        {showEmptyHint ? (
          <div className="py-12 text-center font-naskh text-sm text-muted-foreground">
            ابدأ الكتابة للبحث
          </div>
        ) : showNoResults ? (
          <div className="py-12 text-center font-naskh text-sm text-muted-foreground">
            لا توجد نتائج
          </div>
        ) : results.length === 0 ? (
          // Loading state with no prior results
          <div className="flex items-center justify-center gap-2 py-12 font-naskh text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-gold/60" />
            جارٍ البحث...
          </div>
        ) : (
          <>
          {/* Grand total summary */}
          {totalMatches > 0 && (
            <div className="mb-3 rounded-md border border-gold/20 bg-gold/5 px-3 py-2 text-center">
              <span className="font-naskh text-sm text-foreground/80">
                تم العثور على{" "}
                <span className="font-bold text-gold">{toArabicDigits(totalMatches)}</span>{" "}
                ذكر لكلمة «<span className="font-bold text-gold">{resultQuery}</span>» في{" "}
                <span className="font-bold text-gold">{toArabicDigits(results.length)}</span>{" "}
                فصل
              </span>
            </div>
          )}
          <ul className="space-y-3">
            {results.map((r) => {
              const href = `/chapters/${r.chapterNumber}?q=${encodeURIComponent(
                resultQuery
              )}#search`;
              return (
                <li key={r.chapterNumber} className="gold-card rounded-lg p-3 sm:p-4">
                  {/* Chapter header row */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Link
                      href={href}
                      onClick={handleResultClick}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="shrink-0 text-xs text-gold/60">
                          الفصل {toArabicDigits(r.chapterNumber)}
                        </span>
                        <span className="truncate font-naskh text-sm font-bold text-gold">
                          {r.chapterTitle}
                        </span>
                      </div>
                    </Link>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-gold/30 bg-gold/10 text-gold"
                    >
                      {toArabicDigits(r.matchCount)} نتيجة
                    </Badge>
                  </div>

                  {/* Snippets (up to 3) */}
                  <ul className="space-y-1.5">
                    {r.matches.slice(0, 3).map((m, i) => (
                      <li key={i}>
                        <Link
                          href={href}
                          onClick={handleResultClick}
                          className="block font-naskh text-xs leading-relaxed text-foreground/70 transition-colors hover:text-foreground"
                        >
                          {highlightSearchTerm(m.snippet, resultQuery).map(
                            (seg, j) =>
                              seg.type === "mark" ? (
                                <mark
                                  key={j}
                                  className="bg-gold/30 text-gold px-0.5 rounded"
                                >
                                  {seg.value}
                                </mark>
                              ) : (
                                <span key={j}>{seg.value}</span>
                              )
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
          </>
        )}
      </div>
    </DialogContent>
  );
}

/**
 * SearchDialog — self-contained dialog host. Manages its own open state and
 * exposes it via context so any descendant `SearchTrigger` can open the dialog.
 *
 * Usage:
 *   <SearchDialog>
 *     <SearchTrigger />
 *   </SearchDialog>
 */
export function SearchDialog({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SearchDialogContext.Provider value={{ setOpen }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <SearchDialogContent onClose={() => setOpen(false)} />
      </Dialog>
    </SearchDialogContext.Provider>
  );
}

/**
 * SearchTrigger — a search-icon button that opens the nearest enclosing
 * `SearchDialog`. Must be rendered inside a `<SearchDialog>` wrapper.
 */
export function SearchTrigger({ className }: { className?: string }) {
  const ctx = useContext(SearchDialogContext);
  return (
    <button
      type="button"
      onClick={() => ctx?.setOpen(true)}
      aria-label="بحث"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md border border-gold/25 text-gold/80 transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-gold",
        className
      )}
    >
      <Search className="h-5 w-5" />
    </button>
  );
}
