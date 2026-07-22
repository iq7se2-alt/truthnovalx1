"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { toArabicDigits } from "@/lib/format";

const NOTIF_KEY = "notif-last-seen";
const CHECK_INTERVAL_MS = 60000; // check every 60s

/**
 * Notification permission manager + push trigger.
 * Uses the browser Notification API (no service worker needed for basic push).
 * Periodically checks /api/chapters?sort=desc for new chapters since last seen,
 * and shows a real system notification if new chapters exist.
 */
export function PushNotificationManager() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  // Lazy init: check localStorage on first render (no effect needed)
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("push-notif-enabled");
    const perm =
      typeof Notification !== "undefined" ? Notification.permission : "denied";
    return stored === "true" && perm === "granted";
  });

  async function requestPermission() {
    if (typeof Notification === "undefined") {
      toast({
        title: "غير مدعوم",
        description: "متصفحك لا يدعم الإشعارات",
        variant: "destructive",
      });
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      setEnabled(true);
      localStorage.setItem("push-notif-enabled", "true");
      // Initialize lastSeen to current newest chapter (so we only notify about FUTURE chapters)
      try {
        const res = await fetch("/api/chapters?page=1&pageSize=1&sort=desc", {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.chapters?.[0]) {
          localStorage.setItem(NOTIF_KEY, String(data.chapters[0].number));
        }
      } catch {}
      toast({
        title: "تم تفعيل الإشعارات ✓",
        description: "ستصلك إشعارات حقيقية عند نشر فصول جديدة",
      });
      // Show a test notification
      new Notification("سيد الحقيقة", {
        body: "تم تفعيل الإشعارات بنجاح! ستصلك تنبيهات الفصول الجديدة هنا.",
        icon: "/cover.jpg",
        tag: "notif-enabled",
      });
    } else {
      toast({
        title: "تم رفض الإذن",
        description: "لن تصل إشعارات. يمكنك تفعيلها لاحقاً من إعدادات المتصفح.",
        variant: "destructive",
      });
    }
  }

  function disable() {
    setEnabled(false);
    localStorage.setItem("push-notif-enabled", "false");
    toast({ title: "تم إيقاف الإشعارات" });
  }

  // Periodic check for new chapters
  useEffect(() => {
    if (!enabled || permission !== "granted") return;

    let cancelled = false;

    async function checkForNewChapters() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/chapters?page=1&pageSize=5&sort=desc", {
          cache: "no-store",
        });
        const data = await res.json();
        const chapters = data.chapters || [];
        if (chapters.length === 0) return;

        const lastSeenStr = localStorage.getItem(NOTIF_KEY);
        const lastSeen = lastSeenStr ? Number(lastSeenStr) : chapters[0].number;

        const newChapters = chapters.filter(
          (ch: { number: number; title: string }) => ch.number > lastSeen
        );

        if (newChapters.length > 0) {
          const newest = newChapters[0];
          localStorage.setItem(NOTIF_KEY, String(newest.number));

          // Show system notification
          if (newChapters.length === 1) {
            new Notification("فصل جديد: سيد الحقيقة", {
              body: `الفصل ${toArabicDigits(newest.number)}: ${newest.title}`,
              icon: "/cover.jpg",
              tag: `chapter-${newest.number}`,
              data: { url: `/chapters/${newest.number}` },
            });
          } else {
            new Notification(`${toArabicDigits(newChapters.length)} فصول جديدة`, {
              body: `من الفصل ${toArabicDigits(newChapters[newChapters.length - 1].number)} إلى ${toArabicDigits(newest.number)}`,
              icon: "/cover.jpg",
              tag: "new-chapters",
            });
          }
        }
      } catch {
        // ignore
      }
    }

    // Check immediately, then every 60s
    checkForNewChapters();
    const interval = setInterval(checkForNewChapters, CHECK_INTERVAL_MS);

    // Also check when the tab becomes visible again
    const onVisibility = () => {
      if (!document.hidden) checkForNewChapters();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, permission]);

  // Handle notification click → navigate to chapter
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const onClick = (e: Event) => {
      const n = e.target as Notification;
      const url = (n.data as { url?: string })?.url;
      if (url) {
        window.focus();
        window.location.href = url;
      }
      n.close();
    };
    // This only works if we have a service worker; for basic Notification API,
    // the click handler is set per-notification. This is a fallback.
    return () => {};
  }, []);

  if (!enabled) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={requestPermission}
        className="border-gold/25 text-gold/70 hover:border-gold/50 hover:text-gold"
      >
        <Bell className="ml-2 h-4 w-4" />
        تفعيل الإشعارات
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={disable}
      className="border-gold/40 text-gold hover:border-red-500/50 hover:text-red-400"
      title="الإشعارات مفعّلة — اضغط للإيقاف"
    >
      <BellRing className="ml-2 h-4 w-4" />
      إشعارات مفعّلة
    </Button>
  );
}
