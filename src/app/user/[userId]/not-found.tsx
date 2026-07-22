import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UserNotFound() {
  return (
    <div className="cosmic-bg relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="starfield absolute inset-0" />
      <div className="relative">
        <p className="font-naskh text-7xl font-bold text-gold-gradient">٤٠٤</p>
        <h1 className="mt-4 font-naskh text-2xl font-bold text-foreground">
          القارئ غير موجود
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          لم نتمكن من العثور على هذا القارئ. ربما تم حذفه أو أن الرابط خاطئ.
        </p>
        <Link href="/leaderboard" className="mt-6 inline-block">
          <Button className="bg-gold text-[#1a0a00] hover:bg-gold-soft">
            العودة إلى لوحة المتصدرين
          </Button>
        </Link>
      </div>
    </div>
  );
}
