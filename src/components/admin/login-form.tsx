"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "فشل تسجيل الدخول",
          description: data?.error || "كلمة السر غير صحيحة",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "أهلاً بك", description: "تم تسجيل الدخول بنجاح" });
      router.refresh();
    } catch {
      toast({
        title: "خطأ",
        description: "تعذّر الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cosmic-bg relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4">
      <div className="starfield absolute inset-0" />
      <div className="relative w-full max-w-md">
        <div className="gold-card rounded-lg p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-muted">
              <Lock className="h-6 w-6 text-gold" />
            </div>
            <h1 className="font-naskh text-2xl font-bold text-foreground">
              لوحة الإدارة
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              سيد الحقيقة — أدخل كلمة السر للمتابعة
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">
                كلمة السر
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/60" />
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-gold/30 bg-muted pr-10 text-left font-mono"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-gold text-[#1a0a00] hover:bg-gold-soft"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "دخول"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground/70">
            كلمة السر الافتراضية مضبوطة في ملف{" "}
            <code dir="ltr" className="text-gold/80">
              .env
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
