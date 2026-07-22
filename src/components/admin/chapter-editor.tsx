"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Upload,
  X,
  Eye,
  Pencil,
  Palette,
  Link2,
  Users,
  Bold,
  Italic,
  Quote,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { countWords } from "@/lib/format";

export type ChapterEditorInitial = {
  number: number | string;
  title: string;
  content: string;
  coverImageUrl?: string | null;
  recap?: string | null;
};

// Markers for special formatting (stored in content, rendered in reader)
// [color:#hex]text[/color]  — colored text
// [char:CharacterName]text[/char]  — linked to character
// **text**  — bold
// *text*    — italic

type CharacterLite = {
  id: number;
  name: string;
  imageUrl: string | null;
};

export function ChapterEditor({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  characters = [],
}: {
  initial?: ChapterEditorInitial;
  submitLabel: string;
  onSubmit: (
    data: {
      number: number;
      title: string;
      content: string;
      coverImageUrl?: string | null;
      recap?: string | null;
    }
  ) => Promise<void>;
  onCancel?: () => void;
  characters?: CharacterLite[];
}) {
  const { toast } = useToast();
  const [number, setNumber] = useState(initial?.number?.toString() ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(
    initial?.coverImageUrl ?? null
  );
  const [recap, setRecap] = useState<string>(initial?.recap ?? "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNumber(initial?.number?.toString() ?? "");
    setTitle(initial?.title ?? "");
    setContent(initial?.content ?? "");
    setCoverUrl(initial?.coverImageUrl ?? null);
    setRecap(initial?.recap ?? "");
  }, [initial]);

  async function handleUploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "تعذّر الرفع",
          description: data?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      setCoverUrl(data.url);
      toast({ title: "تم الرفع" });
    } catch {
      toast({ title: "خطأ", description: "تعذّر رفع الملف", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // --- Text formatting helpers ---
  function getSelection() {
    const ta = textareaRef.current;
    if (!ta) return null;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return null;
    return { start, end, selected: content.substring(start, end) };
  }

  function wrapSelection(before: string, after: string) {
    const sel = getSelection();
    const ta = textareaRef.current;
    if (!sel || !ta) {
      toast({ title: "حدد النص أولاً", description: "ظلل الكلمة أو الجملة ثم اضغط الزر" });
      return;
    }
    const newContent =
      content.substring(0, sel.start) +
      before +
      sel.selected +
      after +
      content.substring(sel.end);
    setContent(newContent);
    // Restore selection to include the markers
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(sel.start + before.length, sel.end + before.length);
    }, 0);
  }

  function applyColor(color: string) {
    wrapSelection(`[color:${color}]`, "[/color]");
  }

  function applyCharacter(charName: string) {
    wrapSelection(`[char:${charName}]`, "[/char]");
  }

  function applyBold() {
    wrapSelection("**", "**");
  }

  function applyItalic() {
    wrapSelection("*", "*");
  }

  function applyQuote() {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const newContent =
      content.substring(0, lineStart) + "> " + content.substring(lineStart);
    setContent(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + 2, start + 2);
    }, 0);
  }

  // --- Preview rendering ---
  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderPreview(text: string): string {
    // First escape ALL HTML to prevent XSS
    const escaped = escapeHtml(text);
    return escaped
      .replace(/\[color:([#a-fA-F0-9]+)\]/g, '<span style="color:$1;font-weight:600">')
      .replace(/\[\/color\]/g, "</span>")
      .replace(
        /\[char:([^\]]+)\]/g,
        '<span style="color:#d4b05e;text-decoration:underline dotted;text-underline-offset:3px;font-weight:600" title="شخصية: $1">'
      )
      .replace(/\[\/char\]/g, "</span>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/^&gt; (.+)$/gm, '<blockquote style="border-right:3px solid #d4b05e;padding-right:1rem;color:#888;font-style:italic">$1</blockquote>')
      .split(/\n\s*\n+/)
      .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(number);
    if (!Number.isFinite(num) || num < 1) return;
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        number: num,
        title: title.trim(),
        content,
        coverImageUrl: coverUrl,
        recap: recap.trim() || null,
      });
    } finally {
      setLoading(false);
    }
  }

  const colors = [
    "#d4b05e", "#e3c878", "#8b6db5", "#c0392b",
    "#27ae60", "#2980b9", "#e67e22", "#8e44ad",
    "#16a085", "#f39c12", "#d35400", "#7f8c8d",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Number + Title */}
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="space-y-2">
          <Label htmlFor="ch-number" className="text-xs text-muted-foreground">
            رقم الفصل
          </Label>
          <Input
            id="ch-number"
            type="number"
            min={1}
            dir="ltr"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="border-gold/25 bg-muted"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ch-title" className="text-xs text-muted-foreground">
            عنوان الفصل
          </Label>
          <Input
            id="ch-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-gold/25 bg-muted font-naskh text-lg"
            placeholder="عبقري"
          />
        </div>
      </div>

      {/* Per-chapter cover */}
      <div className="flex items-center gap-4 rounded-md border border-gold/20 bg-muted/50 p-3">
        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded border border-gold/20 bg-muted">
          {coverUrl ? (
            <>
              <img
                key={coverUrl}
                src={coverUrl}
                alt="غلاف الفصل"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setCoverUrl(null)}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-white hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground/50">
              بدون غلاف
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">غلاف الفصل (اختياري)</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUploadCover}
              className="hidden"
              id="ch-cover-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="border-gold/25 text-xs text-gold/70 hover:border-gold/50 hover:text-gold"
            >
              {uploading ? (
                <Loader2 className="ml-1 h-3 w-3 animate-spin" />
              ) : (
                <Upload className="ml-1 h-3 w-3" />
              )}
              رفع صورة
            </Button>
            <Input
              dir="ltr"
              value={coverUrl || ""}
              onChange={(e) => setCoverUrl(e.target.value || null)}
              className="h-8 border-gold/25 bg-muted text-left text-xs"
              placeholder="أو رابط الصورة"
            />
          </div>
        </div>
      </div>

      {/* Smart Recap — manual summary of THIS chapter for the next chapter's reader */}
      <div className="space-y-2">
        <Label htmlFor="ch-recap" className="text-xs text-muted-foreground">
          📖 ملخص الفصل (يطلع للقارئ في الفصل التالي)
        </Label>
        <Textarea
          id="ch-recap"
          value={recap}
          onChange={(e) => setRecap(e.target.value)}
          rows={2}
          dir="rtl"
          className="resize-y border-gold/25 bg-muted font-naskh text-sm leading-relaxed"
          placeholder="اكتب ملخص 2-3 جمل عما حدث في هذا الفصل..."
        />
      </div>

      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-gold/20 bg-muted/50 p-2">
        {/* Mode toggle */}
        <div className="ml-2 flex items-center gap-1 border-l border-gold/15 pl-2">
          <Button
            type="button"
            variant={mode === "edit" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("edit")}
            className="h-8 px-2 text-xs"
          >
            <Pencil className="ml-1 h-3 w-3" />
            تحرير
          </Button>
          <Button
            type="button"
            variant={mode === "preview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("preview")}
            className="h-8 px-2 text-xs"
          >
            <Eye className="ml-1 h-3 w-3" />
            معاينة
          </Button>
        </div>

        {mode === "edit" && (
          <>
            {/* Bold */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={applyBold}
              className="h-8 w-8 p-0"
              title="عريض"
            >
              <Bold className="h-4 w-4" />
            </Button>
            {/* Italic */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={applyItalic}
              className="h-8 w-8 p-0"
              title="مائل"
            >
              <Italic className="h-4 w-4" />
            </Button>
            {/* Quote */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={applyQuote}
              className="h-8 w-8 p-0"
              title="اقتباس"
            >
              <Quote className="h-4 w-4" />
            </Button>

            {/* Color popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs"
                  title="تلوين الكلمة"
                >
                  <Palette className="h-4 w-4" />
                  لون
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 border-gold/25 bg-popover p-2">
                <div className="mb-2 text-xs text-muted-foreground">اختر لوناً للنص المحدد</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => applyColor(c)}
                      className="h-6 w-6 rounded border border-white/20 transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Character link popover */}
            {characters.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs"
                    title="ربط بشخصية"
                  >
                    <Users className="h-4 w-4" />
                    ربط بشخصية
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 border-gold/25 bg-popover p-2">
                  <div className="mb-2 text-xs text-muted-foreground">
                    اختر شخصية لربط النص المحدد بها
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {characters.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => applyCharacter(ch.name)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-right text-xs transition-colors hover:bg-gold/10"
                      >
                        {ch.imageUrl ? (
                          <img
                            src={ch.imageUrl}
                            alt={ch.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-gold">
                            {ch.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-naskh">{ch.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </>
        )}

        {/* Word count */}
        <span className="mr-auto text-[11px] text-muted-foreground/70">
          {countWords(content)} كلمة
        </span>
      </div>

      {/* Content area */}
      {mode === "edit" ? (
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          dir="rtl"
          className="resize-y border-gold/25 bg-muted font-naskh text-base leading-loose"
          placeholder="اكتب محتوى الفصل هنا... حدد كلمة ثم استخدم أزرار الأدوات لتلوينها أو ربطها بشخصية"
        />
      ) : (
        <div
          className="min-h-[24rem] rounded-md border border-gold/25 bg-muted p-6 font-naskh text-base leading-loose"
          dangerouslySetInnerHTML={{
            __html:
              renderPreview(content) ||
              '<p class="text-muted-foreground">المحتوى فارغ</p>',
          }}
        />
      )}

      {/* Format help */}
      {mode === "edit" && (
        <div className="rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground">
          <span className="font-bold text-gold/70">تلميحات:</span>{" "}
          حدد كلمة ثم اضغط زر «لون» أو «ربط بشخصية». يمكنك أيضاً استخدام:
          <code dir="ltr" className="mx-1 text-gold/70">**عريض**</code>
          <code dir="ltr" className="mx-1 text-gold/70">*مائل*</code>
          <code dir="ltr" className="mx-1 text-gold/70">{"> اقتباس"}</code>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-muted-foreground"
          >
            إلغاء
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || !title.trim() || !number}
          className="bg-gold text-[#1a0a00] hover:bg-gold-soft"
        >
          {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
