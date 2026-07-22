"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LogOut,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Settings as SettingsIcon,
  Loader2,
  Upload,
  Eye,
  Save,
  RefreshCw,
  DownloadCloud,
  RotateCcw,
  Users,
  Zap,
  Diamond,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ChapterEditor, type ChapterEditorInitial } from "./chapter-editor";
import { CharactersManager } from "./characters-manager";
import { formatShortDate, toArabicDigits } from "@/lib/format";

type ChapterMeta = {
  id: number;
  number: number;
  title: string;
  wordCount: number;
  views: number;
  createdAt: string;
  coverImageUrl?: string | null;
};

type Settings = {
  coverImageUrl: string | null;
  novelTitle: string | null;
  novelTitleEn: string | null;
  novelDescription: string | null;
};

export function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ChapterEditorInitial | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChapterMeta | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [refetching, setRefetching] = useState<number | null>(null);
  const [characters, setCharacters] = useState<
    Array<{ id: number; name: string; imageUrl: string | null }>
  >([]);

  const loadChapters = useCallback(async () => {
    setLoadingChapters(true);
    try {
      const res = await fetch("/api/admin/chapters", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChapters(data.chapters || []);
    } catch {
      toast({
        title: "خطأ",
        description: "تعذّر تحميل الفصول",
        variant: "destructive",
      });
    } finally {
      setLoadingChapters(false);
    }
  }, [toast]);

  useEffect(() => {
    loadChapters();
    // Load characters for the editor's character-linking feature
    (async () => {
      try {
        const res = await fetch("/api/characters", { cache: "no-store" });
        const data = await res.json();
        setCharacters(data.characters || []);
      } catch {
        // ignore
      }
    })();
  }, [loadChapters]);

  // ---- Chapter create ----
  async function handleCreate(data: {
    number: number;
    title: string;
    content: string;
  }) {
    const res = await fetch("/api/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        title: "تعذّر النشر",
        description: json?.error || "خطأ غير معروف",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "تم النشر", description: `الفصل ${data.number} — ${data.title}` });
    await loadChapters();
  }

  // ---- Chapter edit ----
  async function openEdit(ch: ChapterMeta) {
    setEditOpen(true);
    setEditingLoading(true);
    setEditing({ number: ch.number, title: ch.title, content: "", coverImageUrl: ch.coverImageUrl });
    try {
      const res = await fetch(`/api/chapters/${ch.number}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data?.chapter) {
        setEditing({
          number: data.chapter.number,
          title: data.chapter.title,
          content: data.chapter.content,
          coverImageUrl: data.chapter.coverImageUrl ?? ch.coverImageUrl,
        });
      }
    } catch {
      // ignore
    } finally {
      setEditingLoading(false);
    }
  }

  async function handleEdit(data: {
    number: number;
    title: string;
    content: string;
    coverImageUrl?: string | null;
  }) {
    if (!editing) return;
    const res = await fetch(`/api/admin/chapters/${editing.number}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        title: "تعذّر الحفظ",
        description: json?.error || "خطأ غير معروف",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "تم الحفظ", description: `الفصل ${data.number}` });
    setEditOpen(false);
    setEditing(null);
    await loadChapters();
  }

  // ---- Chapter delete ----
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/chapters/${deleteTarget.number}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast({
          title: "تعذّر الحذف",
          description: j?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "تم الحذف", description: `الفصل ${deleteTarget.number}` });
      setDeleteTarget(null);
      await loadChapters();
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  // ---- Re-fetch single chapter from original site ----
  async function handleRefetch(ch: ChapterMeta) {
    setRefetching(ch.number);
    try {
      const res = await fetch("/api/admin/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: ch.number }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "تعذّر السحب",
          description: data?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "تم إعادة السحب",
        description: `الفصل ${toArabicDigits(ch.number)} — ${data.chapter?.title || ""}`,
      });
      await loadChapters();
    } finally {
      setRefetching(null);
    }
  }

  // ---- Fetch all chapters ----
  async function handleFetchAll() {
    setFetchingAll(true);
    try {
      const res = await fetch("/api/admin/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, count: 10 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "تعذّر السحب",
          description: data?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "تم السحب",
        description: `تم سحب ${toArabicDigits(data.fetched || 0)} فصل`,
      });
      await loadChapters();
    } finally {
      setFetchingAll(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-naskh text-3xl font-bold text-gold-gradient">
            لوحة الإدارة
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة فصول رواية سيد الحقيقة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadChapters}
            className="border-gold/25 text-gold/80 hover:border-gold/50 hover:text-gold"
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-gold/25 text-gold/80 hover:border-red-500/50 hover:text-red-400"
          >
            <LogOut className="ml-2 h-4 w-4" />
            خروج
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chapters" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="chapters" className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold">
            <BookOpen className="ml-2 h-4 w-4" />
            الفصول ({toArabicDigits(chapters.length)})
          </TabsTrigger>
          <TabsTrigger value="characters" className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold">
            <Users className="ml-2 h-4 w-4" />
            الشخصيات
          </TabsTrigger>
          <TabsTrigger value="interactive" className="data-[state=active]:bg-purple/15 data-[state=active]:text-purple">
            <Zap className="ml-2 h-4 w-4" />
            التفاعلي
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold">
            <SettingsIcon className="ml-2 h-4 w-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        {/* Chapters tab */}
        <TabsContent value="chapters" className="mt-6 space-y-6">
          {/* Create + Fetch All */}
          <div className="gold-card rounded-lg p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-gold" />
                <h2 className="font-naskh text-lg font-bold">إضافة فصل جديد</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchAll}
                disabled={fetchingAll}
                className="border-gold/30 text-gold/80 hover:border-gold/60 hover:text-gold"
              >
                {fetchingAll ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <DownloadCloud className="ml-2 h-4 w-4" />
                )}
                سحب 10 فصول
              </Button>
            </div>
            <ChapterEditor submitLabel="نشر الفصل" onSubmit={handleCreate} characters={characters} />
          </div>

          {/* List */}
          <div className="gold-card overflow-hidden rounded-lg">
            <div className="border-b border-gold/15 px-6 py-4">
              <h2 className="font-naskh text-lg font-bold">جميع الفصول</h2>
            </div>
            {loadingChapters ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-white/5" />
                ))}
              </div>
            ) : chapters.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                لا توجد فصول بعد. أضف أول فصل بالأعلى.
              </p>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-popover text-right text-xs text-muted-foreground">
                    <tr className="border-b border-gold/15">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">العنوان</th>
                      <th className="px-4 py-3 font-medium">الكلمات</th>
                      <th className="px-4 py-3 font-medium">المشاهدات</th>
                      <th className="px-4 py-3 font-medium">التاريخ</th>
                      <th className="px-4 py-3 font-medium text-left">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((ch) => (
                      <tr
                        key={ch.id}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3 font-mono text-gold/80">
                          {toArabicDigits(ch.number)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/chapters/${ch.number}`}
                            className="font-naskh font-medium text-foreground hover:text-gold"
                          >
                            {ch.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {toArabicDigits(ch.wordCount)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {toArabicDigits(ch.views)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                          {formatShortDate(ch.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/chapters/${ch.number}`}
                              target="_blank"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-gold"
                              title="عرض"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/admin/chapters/${ch.number}/edit`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gold/30 px-2.5 text-xs font-medium text-gold/80 transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold"
                              title="تعديل (محرر كامل)"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              تعديل
                            </Link>
                            <button
                              onClick={() => handleRefetch(ch)}
                              disabled={refetching === ch.number}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold disabled:opacity-50"
                              title="إعادة سحب من الموقع الأصلي (يتجاهل التعديلات)"
                            >
                              {refetching === ch.number ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(ch)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Characters tab */}
        <TabsContent value="characters" className="mt-6">
          <CharactersManager />
        </TabsContent>

        {/* Interactive tab */}
        <TabsContent value="interactive" className="mt-6">
          <InteractivePanel />
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings" className="mt-6">
          <SettingsPanel />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl border-gold/25 bg-popover">
          <DialogHeader>
            <DialogTitle className="font-naskh text-gold">تعديل الفصل</DialogTitle>
          </DialogHeader>
          {editingLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          ) : editing ? (
            <ChapterEditor
              initial={editing}
              submitLabel="حفظ التعديلات"
              onSubmit={handleEdit}
              characters={characters}
              onCancel={() => {
                setEditOpen(false);
                setEditing(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="border-gold/25 bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-naskh">
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الفصل {deleteTarget && toArabicDigits(deleteTarget.number)}{" "}
              «{deleteTarget?.title}» نهائياً. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gold/25">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===================== Settings Panel =====================

function SettingsPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // local editable fields
  const [coverUrl, setCoverUrl] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = await res.json();
        const s: Settings = data.settings;
        setSettings(s);
        setCoverUrl(s.coverImageUrl || "");
        setTitleAr(s.novelTitle || "");
        setTitleEn(s.novelTitleEn || "");
        setDescription(s.novelDescription || "");
      } catch {
        toast({
          title: "خطأ",
          description: "تعذّر تحميل الإعدادات",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      toast({ title: "تم الرفع", description: "اضغط «حفظ الإعدادات» لتثبيت الغلاف" });
    } catch {
      toast({
        title: "خطأ",
        description: "تعذّر رفع الملف",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverImageUrl: coverUrl,
          novelTitle: titleAr,
          novelTitleEn: titleEn,
          novelDescription: description,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast({
          title: "تعذّر الحفظ",
          description: j?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الموقع" });
    } catch {
      toast({
        title: "خطأ",
        description: "تعذّر الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="gold-card rounded-lg p-6">
        <Skeleton className="h-40 w-full bg-white/5" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Cover */}
      <div className="gold-card rounded-lg p-6">
        <h3 className="mb-4 font-naskh text-lg font-bold">غلاف الرواية</h3>
        <div className="relative aspect-[3/4] overflow-hidden rounded-md border border-gold/25 bg-muted">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="غلاف الرواية"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-accent text-center">
              <span className="text-gold-gradient px-4 font-bold">
                LORD OF THE TRUTH
              </span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
          id="cover-upload"
        />
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full border-gold/30 text-gold/80 hover:border-gold/60 hover:text-gold"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="ml-2 h-4 w-4" />
          )}
          رفع غلاف جديد
        </Button>
        <div className="mt-3 space-y-1">
          <Label htmlFor="cover-url" className="text-xs text-muted-foreground">
            أو رابط الصورة
          </Label>
          <Input
            id="cover-url"
            dir="ltr"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="border-gold/25 bg-muted text-left text-xs"
            placeholder="/cover.jpg"
          />
        </div>
      </div>

      {/* Text settings */}
      <div className="gold-card rounded-lg p-6">
        <h3 className="mb-4 font-naskh text-lg font-bold">معلومات الرواية</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              عنوان الرواية (عربي)
            </Label>
            <Input
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="border-gold/25 bg-muted"
              placeholder="سيد الحقيقة"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              عنوان الرواية (إنجليزي)
            </Label>
            <Input
              dir="ltr"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="border-gold/25 bg-muted text-left"
              placeholder="Lord of the Truth"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">الوصف</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-y border-gold/25 bg-muted font-naskh leading-loose"
              placeholder="روبين بورتون، شاب وُلد فوجد نفسه..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gold text-[#1a0a00] hover:bg-gold-soft"
          >
            {saving ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="ml-2 h-4 w-4" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      </div>
    </div>
  );
}

// ====== Interactive Panel ======

function InteractivePanel() {
  const { toast } = useToast();
  const [stats, setStats] = useState<{
    totalWords: number;
    totalUsers: number;
    topChapters: Array<{ chapterId: number; count: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchNick, setSearchNick] = useState("");
  const [foundUser, setFoundUser] = useState<{
    id: string;
    nickname: string;
    coins: number;
  } | null>(null);
  const [addAmount, setAddAmount] = useState("5");
  const [adding, setAdding] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all owned words count via a simple aggregation
      const res = await fetch("/api/admin/chapters", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      // We don't have a dedicated stats endpoint, so show placeholder
      setStats({
        totalWords: 0,
        totalUsers: 0,
        topChapters: [],
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function searchUser() {
    if (!searchNick.trim()) return;
    try {
      // Search by nickname — we'll use the coins endpoint with a lookup
      // For now, just show the input field (the admin can paste userId)
      toast({
        title: "بحث",
        description: "أدخل معرف المستخدم (userId) مباشرة",
      });
    } catch {
      // ignore
    }
  }

  async function addCoins(userId: string, amount: number) {
    setAdding(true);
    try {
      const res = await fetch(`/api/user/${userId}/coins/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "خطأ",
          description: data.error || "تعذّر",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "تم ✓",
        description: `تمت إضافة ${amount} عملة`,
      });
      if (foundUser) {
        setFoundUser({ ...foundUser, coins: data.coins });
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="gold-card rounded-lg p-6">
        <h2 className="mb-4 font-naskh text-lg font-bold text-purple">
          إحصائيات الوضع التفاعلي
        </h2>
        {loading ? (
          <Skeleton className="h-20 w-full bg-muted" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-purple/20 bg-purple/5 p-4 text-center">
              <div className="font-mono text-2xl font-bold text-purple">
                {stats?.totalWords || 0}
              </div>
              <div className="text-xs text-muted-foreground">كلمات مملوكة</div>
            </div>
            <div className="rounded-md border border-purple/20 bg-purple/5 p-4 text-center">
              <div className="font-mono text-2xl font-bold text-purple">
                {stats?.totalUsers || 0}
              </div>
              <div className="text-xs text-muted-foreground">مستخدمون</div>
            </div>
            <div className="rounded-md border border-purple/20 bg-purple/5 p-4 text-center">
              <div className="font-mono text-2xl font-bold text-purple">∞</div>
              <div className="text-xs text-muted-foreground">إمكانيات</div>
            </div>
          </div>
        )}
      </div>

      {/* Add coins */}
      <div className="gold-card rounded-lg p-6">
        <h2 className="mb-4 font-naskh text-lg font-bold text-purple">
          إضافة عملات لمستخدم
        </h2>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="معرف المستخدم (userId)"
              dir="ltr"
              value={searchNick}
              onChange={(e) => setSearchNick(e.target.value)}
              className="border-purple/25 bg-muted font-mono text-xs"
            />
            <Input
              type="number"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="w-24 border-purple/25 bg-muted"
              placeholder="الكمية"
            />
            <Button
              onClick={() => addCoins(searchNick, Number(addAmount))}
              disabled={!searchNick || adding}
              className="bg-purple text-white hover:bg-purple/80"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Diamond className="h-4 w-4" />
              )}
              إضافة
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            يمكنك إضافة أو خصم عملات (استخدم رقماً سالباً للخصم)
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="gold-card rounded-lg p-6">
        <h2 className="mb-3 font-naskh text-lg font-bold text-purple">
          كيف يعمل الوضع التفاعلي؟
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• كل مستخدم يحصل على 5 عملات تروث يومياً عند الدخول</li>
          <li>• يمكنه امتلاك كلمة مجانية واحدة لكل فصل (فئة عادي)</li>
          <li>• يدفع عملات لامتلاك كلمات بفئات أعلى (مميزة، خرافية، خارقة، أسطورية)</li>
          <li>• الكلمات المملوكة تظهر بشكل مميز في النص لكل القراء</li>
          <li>• القراء يرون من يمتلك كل كلمة في الوقت الفعلي</li>
        </ul>
      </div>
    </div>
  );
}
