"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search, BookOpen, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatArabicDate, formatTimeAgo, toArabicDigits } from "@/lib/format";

type CommentItem = {
  id: number;
  author: string;
  content: string;
  wordAnchor: string | null;
  createdAt: string;
  chapter: { number: number; title: string };
};

type Response = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  comments: CommentItem[];
};

export default function CommentsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [chapterFilter, setChapterFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedQ) params.set("q", debouncedQ);
      if (chapterFilter) params.set("chapter", chapterFilter);
      const res = await fetch(`/api/comments?${params}`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, chapterFilter]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 px-4 py-1 text-xs text-gold/80">
          <MessageSquare className="h-3.5 w-3.5" />
          تعليقات القراء
        </div>
        <h1 className="font-naskh text-4xl font-bold text-gold-gradient">
          التعليقات
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data ? `${toArabicDigits(data.total)} تعليق` : "—"}
        </p>
      </div>

      {/* Search + Chapter filter */}
      <div className="mb-8 flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في التعليقات أو الأسماء..."
            className="border-gold/25 bg-muted pr-10 font-naskh"
          />
        </div>
        <input
          type="number"
          value={chapterFilter}
          onChange={(e) => { setChapterFilter(e.target.value); setPage(1); }}
          placeholder="رقم الفصل"
          min={1}
          className="w-28 rounded-lg border border-gold/25 bg-muted px-3 font-naskh text-center text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
        />
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="gold-card space-y-2 rounded-lg p-4 animate-pulse">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-12 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : !data || data.comments.length === 0 ? (
        <div className="gold-card rounded-lg p-12 text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gold/30" />
          <p className="font-naskh text-lg text-muted-foreground">
            {debouncedQ || chapterFilter ? "لا توجد نتائج" : "لا توجد تعليقات بعد"}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.comments.map((c) => (
            <li key={c.id} className="gold-card rounded-lg p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 border-b border-gold/15 pb-2">
                <div className="min-w-0">
                  <div className="truncate font-naskh text-sm font-bold text-gold">
                    {c.author}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span title={formatArabicDate(c.createdAt)}>{formatTimeAgo(c.createdAt)}</span>
                    <span>·</span>
                    <Link
                      href={`/chapters/${c.chapter.number}`}
                      className="flex items-center gap-1 text-gold/70 hover:text-gold"
                    >
                      <BookOpen className="h-3 w-3" />
                      فصل {toArabicDigits(c.chapter.number)} — {c.chapter.title}
                    </Link>
                  </div>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words font-naskh text-sm leading-relaxed text-foreground/90">
                {c.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {!loading && data && data.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-gold/25 text-gold/80 hover:border-gold/50 hover:text-gold disabled:opacity-30"
          >
            <ChevronRight className="ml-1 h-4 w-4" /> السابق
          </Button>
          <div className="flex items-center gap-1 px-2">
            <span className="font-mono text-sm text-gold">{toArabicDigits(page)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-sm text-muted-foreground">{toArabicDigits(totalPages)}</span>
          </div>
          <Button
            variant="outline" size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border-gold/25 text-gold/80 hover:border-gold/50 hover:text-gold disabled:opacity-30"
          >
            التالي <ChevronLeft className="mr-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
