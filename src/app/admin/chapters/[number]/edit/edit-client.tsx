"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChapterEditor,
  type ChapterEditorInitial,
} from "@/components/admin/chapter-editor";
import { useToast } from "@/hooks/use-toast";

type Chapter = {
  id: number;
  number: number;
  title: string;
  content: string;
  coverImageUrl: string | null;
  recap: string | null;
};

type CharacterLite = {
  id: number;
  name: string;
  imageUrl: string | null;
};

export function EditChapterClient({
  chapter,
  characters,
}: {
  chapter: Chapter;
  characters: CharacterLite[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const initial: ChapterEditorInitial = {
    number: chapter.number,
    title: chapter.title,
    content: chapter.content,
    coverImageUrl: chapter.coverImageUrl,
    recap: chapter.recap,
  };

  async function handleSave(data: {
    number: number;
    title: string;
    content: string;
    coverImageUrl?: string | null;
    recap?: string | null;
  }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/chapters/${chapter.number}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "تعذّر الحفظ",
          description: json?.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "تم الحفظ ✓",
        description: `الفصل ${data.number}: ${data.title}`,
      });
      router.push("/admin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-gold"
            >
              <ArrowRight className="ml-1 h-4 w-4" />
              رجوع
            </Button>
          </Link>
          <div>
            <h1 className="font-naskh text-2xl font-bold text-gold-gradient">
              تعديل الفصل {chapter.number}
            </h1>
            <p className="text-sm text-muted-foreground">
              عدّل المحتوى بحرية — أضف ألوان، اربط بشخصيات، نسّق النص
            </p>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="gold-card rounded-lg p-6 sm:p-8">
        <ChapterEditor
          initial={initial}
          submitLabel="حفظ التعديلات"
          onSubmit={handleSave}
          characters={characters}
          onCancel={() => router.push("/admin")}
        />
      </div>

      {/* Loading overlay */}
      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
            <p className="font-naskh text-sm text-gold">جارٍ الحفظ...</p>
          </div>
        </div>
      )}
    </div>
  );
}
