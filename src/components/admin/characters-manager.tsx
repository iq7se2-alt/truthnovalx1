"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  RefreshCw,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from "@/hooks/use-toast";
import { toArabicDigits } from "@/lib/format";
import type { Character } from "@/lib/characters";

type FormState = {
  name: string;
  nameEn: string;
  description: string;
  imageUrl: string;
  color: string;
  isMain: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  nameEn: "",
  description: "",
  imageUrl: "",
  color: "#c9a84c",
  isMain: false,
};

export function CharactersManager() {
  const { toast } = useToast();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/characters", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCharacters(data.characters || []);
    } catch {
      toast({
        title: "خطأ",
        description: "تعذّر تحميل الشخصيات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(ch: Character) {
    setEditing(ch);
    setForm({
      name: ch.name,
      nameEn: ch.nameEn || "",
      description: ch.description || "",
      imageUrl: ch.imageUrl || "",
      color: ch.color || "#c9a84c",
      isMain: ch.isMain,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-character", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "تعذّر الرفع",
          description: data?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      setForm((f) => ({ ...f, imageUrl: data.url as string }));
      toast({ title: "تم الرفع", description: "تم رفع صورة الشخصية" });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameEn: form.nameEn.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        color: form.color.trim(),
        isMain: form.isMain,
      };
      const url = editing
        ? `/api/characters/${editing.id}`
        : "/api/characters";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: editing ? "تعذّر الحفظ" : "تعذّر الإضافة",
          description: json?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: editing ? "تم الحفظ" : "تمت الإضافة",
        description: form.name,
      });
      closeDialog();
      await loadCharacters();
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/characters/${deleteTarget.id}`, {
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
      toast({ title: "تم الحذف", description: deleteTarget.name });
      setDeleteTarget(null);
      await loadCharacters();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-naskh text-lg font-bold text-gold-gradient">
            الشخصيات
          </h2>
          <p className="text-xs text-muted-foreground">
            إدارة شخصيات الرواية — {toArabicDigits(characters.length)} شخصية
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCharacters}
            className="border-gold/25 text-gold/80 hover:border-gold/50 hover:text-gold"
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            تحديث
          </Button>
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-gold text-[#1a0a00] hover:bg-gold-soft"
          >
            <Plus className="ml-2 h-4 w-4" />
            إضافة شخصية
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full bg-white/5" />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="gold-card rounded-lg p-10 text-center">
          <p className="text-sm text-muted-foreground">
            لا توجد شخصيات بعد. اضغط «إضافة شخصية» لإنشاء أول شخصية.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {characters.map((ch) => (
            <div
              key={ch.id}
              className="gold-card group relative overflow-hidden rounded-lg"
            >
              {/* Image */}
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                {ch.imageUrl ? (
                  <img
                    src={ch.imageUrl}
                    alt={ch.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-accent/40">
                    <span className="font-naskh text-4xl font-bold text-gold-gradient">
                      {ch.name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Color dot */}
                <div className="absolute top-2 right-2">
                  <span
                    className="block h-3 w-3 rounded-full border border-white/30 shadow"
                    style={{ backgroundColor: ch.color || "#c9a84c" }}
                    title="لون الشخصية"
                  />
                </div>

                {/* isMain badge */}
                {ch.isMain && (
                  <div className="absolute top-2 left-2">
                    <Badge className="border-gold/30 bg-gold/90 text-[#1a0a00] hover:bg-gold-soft">
                      <Star className="ml-1 h-3 w-3 fill-current" />
                      رئيسي
                    </Badge>
                  </div>
                )}

                {/* Action buttons — always visible */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                  <button
                    type="button"
                    onClick={() => openEdit(ch)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gold/30 text-gold backdrop-blur-sm transition hover:bg-gold/60"
                    title="تعديل"
                    aria-label="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(ch)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-600/40 text-red-200 backdrop-blur-sm transition hover:bg-red-600/80 hover:text-white"
                    title="حذف"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Name footer */}
              <div className="border-t border-gold/15 p-3 text-center">
                <div className="font-naskh font-bold text-foreground">
                  {ch.name}
                </div>
                {ch.nameEn && (
                  <div
                    className="mt-0.5 text-xs text-muted-foreground"
                    dir="ltr"
                  >
                    {ch.nameEn}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input for upload (used by the dialog) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className="hidden"
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl border-gold/25 bg-popover">
          <DialogHeader>
            <DialogTitle className="font-naskh text-gold">
              {editing ? "تعديل شخصية" : "إضافة شخصية جديدة"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image preview + upload */}
            <div className="flex gap-4">
              <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-md border border-gold/25 bg-muted">
                {form.imageUrl ? (
                  <img
                    key={form.imageUrl}
                    src={form.imageUrl}
                    alt="معاينة"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-accent/40">
                    <span className="font-naskh text-2xl font-bold text-gold-gradient">
                      {(form.name || "؟").charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-gold/30 text-gold/80 hover:border-gold/60 hover:text-gold"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="ml-2 h-4 w-4" />
                  )}
                  رفع صورة
                </Button>
                <Label
                  htmlFor="ch-image-url"
                  className="text-xs text-muted-foreground"
                >
                  أو رابط الصورة
                </Label>
                <Input
                  id="ch-image-url"
                  dir="ltr"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                  className="border-gold/25 bg-muted text-left text-xs"
                  placeholder="/uploads/characters/char-1.jpg"
                />
              </div>
            </div>

            {/* Names */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="ch-name"
                  className="text-xs text-muted-foreground"
                >
                  الاسم (عربي) *
                </Label>
                <Input
                  id="ch-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="border-gold/25 bg-muted font-naskh"
                  placeholder="روبين بورتون"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="ch-name-en"
                  className="text-xs text-muted-foreground"
                >
                  الاسم (إنجليزي)
                </Label>
                <Input
                  id="ch-name-en"
                  dir="ltr"
                  value={form.nameEn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nameEn: e.target.value }))
                  }
                  className="border-gold/25 bg-muted text-left"
                  placeholder="Robin Burton"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label
                htmlFor="ch-desc"
                className="text-xs text-muted-foreground"
              >
                الوصف
              </Label>
              <Textarea
                id="ch-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
                className="resize-y border-gold/25 bg-muted font-naskh leading-loose"
                placeholder="نبذة عن الشخصية..."
              />
            </div>

            {/* Color + isMain */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  لون الشخصية
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="h-10 w-14 cursor-pointer rounded border border-gold/25 bg-muted p-1"
                    aria-label="اختيار اللون"
                  />
                  <Input
                    dir="ltr"
                    value={form.color}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="w-28 border-gold/25 bg-muted text-left text-xs"
                    aria-label="كود اللون"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={form.isMain}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, isMain: v }))
                  }
                  id="ch-ismain"
                />
                <Label htmlFor="ch-ismain" className="text-sm">
                  شخصية رئيسية
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeDialog}
                className="text-muted-foreground"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="bg-gold text-[#1a0a00] hover:bg-gold-soft"
              >
                {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {editing ? "حفظ التعديلات" : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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
              سيتم حذف الشخصية «{deleteTarget?.name}» نهائياً. لا يمكن التراجع.
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
