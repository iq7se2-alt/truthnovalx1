"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Trash2, MessageSquare, Send, Link2, X, Bold, Italic, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatArabicDate, formatTimeAgo, toArabicDigits } from "@/lib/format";

type Comment = {
  id: number;
  chapterId: number;
  author: string;
  content: string;
  wordAnchor: string | null;
  createdAt: string;
};

/** Render comment text with **bold**, *italic*, and ||spoiler|| formatting */
function SpoilerText({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setRevealed(!revealed)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setRevealed(!revealed); }}
      className={`inline cursor-pointer select-none rounded px-1.5 py-0.5 transition-all ${
        revealed
          ? "bg-gold/15 text-gold italic"
          : "bg-muted text-muted pointer-events-none text-[0] hover:opacity-80 before:pointer-events-auto before:content-['🔒_اضغط_لإظهار']"
      }`}
      title={revealed ? "اضغط لإخفاء" : "اضغط لإظهار"}
    >
      {revealed ? children : <>&nbsp;</>}
    </span>
  );
}

function renderFormattedText(text: string): React.ReactNode {
  // If content contains HTML tags (from WordPress import), render as HTML
  if (/<p>|<br|<img|<strong|<em|<a\s|<blockquote|<ul|<ol|<li/i.test(text)) {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: text
            // Remove WordPress-specific classes/styles but keep structure
            .replace(/class="[^"]*"/g, "")
            .replace(/style="[^"]*"/g, "")
            // Make images responsive
            .replace(/<img/g, '<img class="max-w-full rounded-lg my-2" loading="lazy"')
            // Style blockquotes
            .replace(/<blockquote/g, '<blockquote class="border-r-2 border-gold/30 pr-3 my-2 italic text-muted-foreground"')
            // Style links
            .replace(/<a/g, '<a class="text-gold underline hover:text-gold-soft" target="_blank" rel="noopener noreferrer"')
            // Style lists
            .replace(/<ul/g, '<ul class="list-disc pr-5 my-2"')
            .replace(/<ol/g, '<ol class="list-decimal pr-5 my-2"'),
        }}
      />
    );
  }

  // Plain text with markdown-like formatting (original behavior)
  const parts: React.ReactNode[] = [];
  const re = /\|\|(.+?)\|\||\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(<SpoilerText key={key++}>{match[1]}</SpoilerText>);
    } else if (match[2] !== undefined) {
      parts.push(<strong key={key++} className="font-bold">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={key++} className="italic">{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

export function CommentsSection({ chapterNumber, limit }: { chapterNumber: number; limit?: number }) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [wordAnchor, setWordAnchor] = useState("");
  const [showAnchorField, setShowAnchorField] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chapters/${chapterNumber}/comments`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      toast({
        title: "خطأ",
        description: "تعذّر تحميل التعليقات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [chapterNumber, toast]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const canSubmit =
    author.trim().length >= 1 &&
    content.trim().length >= 1 &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/chapters/${chapterNumber}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: author.trim(),
          content: content.trim(),
          wordAnchor: wordAnchor.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "تعذّر النشر",
          description: json?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      setComments((prev) => [json.comment as Comment, ...prev]);
      setAuthor("");
      setContent("");
      setWordAnchor("");
      setShowAnchorField(false);
      toast({ title: "تم النشر", description: "تم نشر تعليقك بنجاح" });
    } catch {
      toast({
        title: "خطأ",
        description: "تعذّر نشر التعليق",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast({
          title: "تعذّر الحذف",
          description: j?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "تم الحذف", description: "تم حذف التعليق" });
    } finally {
      setDeletingId(null);
    }
  }

  /** Scroll to the word in the chapter content and highlight it. */
  function scrollToWord(word: string) {
    // Dispatch a custom event that the reader-view listens for
    window.dispatchEvent(
      new CustomEvent("comment-scroll-to-word", { detail: { word } })
    );
  }

  function insertFormatting(before: string, after: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const newText = content.substring(0, start) + before + selected + after + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }

  return (
    <section className="mx-auto mt-14 max-w-3xl px-4 sm:px-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-naskh text-xl font-bold text-gold-gradient">
          <MessageSquare className="h-5 w-5 text-gold/70" />
          التعليقات
        </h2>
        <Badge
          variant="outline"
          className="border-gold/30 bg-gold/10 text-gold"
        >
          {toArabicDigits(comments.length)} تعليق
        </Badge>
      </div>

      {/* Comment form */}
      <form
        onSubmit={handleSubmit}
        className="gold-card mb-6 space-y-3 rounded-lg p-4 sm:p-5"
      >
        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="اسمك"
          maxLength={50}
          className="border-gold/25 bg-muted font-naskh"
          aria-label="اسمك"
        />
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="اكتب تعليقك... (يدعم **غامق** و *مائل* و ||حرق||)"
          maxLength={2000}
          rows={3}
          className="resize-y border-gold/25 bg-muted font-naskh leading-relaxed"
          aria-label="تعليقك"
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertFormatting("**", "**")}
            className="inline-flex h-7 items-center gap-1 rounded border border-gold/20 px-2 text-xs text-gold/60 transition-colors hover:border-gold/50 hover:text-gold"
            title="نص غامق (Bold)"
          >
            <Bold className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("*", "*")}
            className="inline-flex h-7 items-center gap-1 rounded border border-gold/20 px-2 text-xs text-gold/60 transition-colors hover:border-gold/50 hover:text-gold"
            title="نص مائل (Italic)"
          >
            <Italic className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting("||", "||")}
            className="inline-flex h-7 items-center gap-1 rounded border border-gold/20 px-2 text-xs text-gold/60 transition-colors hover:border-gold/50 hover:text-gold"
            title="نص مخفي - حرق (Spoiler)"
          >
            <EyeOff className="h-3 w-3" />
          </button>
        </div>

        {/* Word anchor field */}
        {showAnchorField ? (
          <div className="flex items-center gap-2 rounded-md border border-gold/25 bg-muted/70 p-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-gold/60" />
            <Input
              value={wordAnchor}
              onChange={(e) => setWordAnchor(e.target.value)}
              placeholder="اكتب كلمة من الفصل للربط بها..."
              maxLength={100}
              className="h-8 border-0 bg-transparent font-naskh text-sm shadow-none focus-visible:ring-0"
              aria-label="كلمة الربط"
            />
            {wordAnchor && (
              <button
                type="button"
                onClick={() => setWordAnchor("")}
                className="shrink-0 text-muted-foreground hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowAnchorField(false);
                setWordAnchor("");
              }}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              إخفاء
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAnchorField(true)}
            className="flex items-center gap-1.5 text-xs text-gold/60 transition-colors hover:text-gold"
          >
            <Link2 className="h-3.5 w-3.5" />
            ربط التعليق بكلمة في الفصل
          </button>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-muted-foreground">
            {toArabicDigits(content.length)} / {toArabicDigits(2000)}
          </span>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="bg-gold text-[#1a0a00] hover:bg-gold-soft"
          >
            {submitting ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="ml-2 h-4 w-4" />
            )}
            نشر التعليق
          </Button>
        </div>
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="gold-card space-y-2 rounded-lg p-4">
              <Skeleton className="h-4 w-32 bg-white/5" />
              <Skeleton className="h-3 w-24 bg-white/5" />
              <Skeleton className="h-12 w-full bg-white/5" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="gold-card rounded-lg p-10 text-center">
          <p className="font-naskh text-sm text-muted-foreground">
            لا توجد تعليقات بعد. كن أول من يعلّق!
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.slice(0, limit).map((c) => (
            <li key={c.id} className="gold-card rounded-lg p-4 sm:p-5">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 border-b border-gold/15 pb-2">
                <div className="min-w-0">
                  <div className="truncate font-naskh text-sm font-bold text-gold">
                    {c.author}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    <span title={formatArabicDate(c.createdAt)}>{formatTimeAgo(c.createdAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  aria-label="حذف التعليق"
                  title="حذف"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-red-600/20 hover:text-red-300 disabled:opacity-50"
                >
                  {deletingId === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Content */}
              <p className="mt-3 whitespace-pre-wrap break-words font-naskh text-sm leading-relaxed text-foreground/90">
                {renderFormattedText(c.content)}
              </p>

              {/* Word anchor badge — clickable */}
              {c.wordAnchor && (
                <button
                  type="button"
                  onClick={() => scrollToWord(c.wordAnchor!)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold/80 transition-colors hover:border-gold/60 hover:bg-gold/20 hover:text-gold"
                  title="اضغط للذهاب إلى الكلمة في الفصل"
                >
                  <Link2 className="h-3 w-3" />
                  مرتبط بـ: «{c.wordAnchor.substring(0, 40)}
                  {c.wordAnchor.length > 40 ? "…" : ""}»
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
