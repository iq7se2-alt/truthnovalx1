"use client";

import { Play, Pause, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

export type AutoScrollSpeed = 0.3 | 0.8 | 1.5;

const SPEED_LABELS: Record<AutoScrollSpeed, string> = {
  0.3: "بطيء",
  0.8: "متوسط",
  1.5: "سريع",
};

const SPEED_ORDER: AutoScrollSpeed[] = [0.3, 0.8, 1.5];

/**
 * Compact toolbar button for the auto-scroll feature.
 * Clicking the icon toggles auto-scroll on/off.
 * Clicking the speed pill cycles through slow → medium → fast.
 */
export function AutoScrollControl({
  active,
  onToggle,
  speed,
  onSpeedChange,
}: {
  active: boolean;
  onToggle: () => void;
  speed: AutoScrollSpeed;
  onSpeedChange: (s: AutoScrollSpeed) => void;
}) {
  function cycleSpeed(e: React.MouseEvent) {
    e.stopPropagation();
    const idx = SPEED_ORDER.indexOf(speed);
    const next = SPEED_ORDER[(idx + 1) % SPEED_ORDER.length];
    onSpeedChange(next);
  }

  return (
    <div
      className={cn(
        "inline-flex h-9 items-center gap-0 overflow-hidden rounded-md border transition-colors",
        active
          ? "border-gold/60 bg-gold/15 text-gold"
          : "border-gold/25 text-gold/60 hover:border-gold/50 hover:text-gold"
      )}
    >
      <button
        onClick={onToggle}
        title={active ? "إيقاف التمرير التلقائي" : "تفعيل التمرير التلقائي"}
        aria-pressed={active}
        className="inline-flex h-full items-center gap-1 px-2 text-xs font-medium"
      >
        {active ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">{active ? "إيقاف" : "تمرير"}</span>
      </button>
      <button
        onClick={cycleSpeed}
        title={`السرعة: ${SPEED_LABELS[speed]}`}
        className={cn(
          "inline-flex h-full items-center gap-1 border-r border-gold/20 px-2 text-[10px] font-medium transition-colors",
          active ? "bg-gold/10" : "hover:bg-gold/5"
        )}
      >
        <Gauge className="h-3 w-3" />
        {SPEED_LABELS[speed]}
      </button>
    </div>
  );
}
