"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { MapPin, ZoomIn, ZoomOut, Maximize2, Compass } from "lucide-react";

type Location = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  posX: number;
  posY: number;
  startChapter: number;
  endChapter: number | null;
};

type Props = {
  locations: Location[];
};

export function WorldMapInteractive({ locations }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    loc: Location;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [readChapters, setReadChapters] = useState<number[]>([]);

  // Load reading progress from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lord-of-truth-stats");
      if (raw) {
        const stats = JSON.parse(raw);
        if (Array.isArray(stats.readChapters)) {
          setReadChapters(stats.readChapters);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // A location is "discovered" if the user has read a chapter within its range
  const discoveredIds = useMemo(() => {
    const ids = new Set<number>();
    for (const loc of locations) {
      const start = loc.startChapter;
      const end = loc.endChapter ?? 99999;
      const discovered = readChapters.some((ch) => ch >= start && ch <= end);
      if (discovered) ids.add(loc.id);
    }
    return ids;
  }, [locations, readChapters]);

  // Sort by startChapter for path drawing
  const sorted = useMemo(
    () => [...locations].sort((a, b) => a.startChapter - b.startChapter),
    [locations]
  );

  const resetFilter = () => {
    setSelectedId(null);
    setHoveredId(null);
  };

  return (
    <div className="gold-card relative overflow-hidden rounded-xl cosmic-bg">
      <div className="starfield absolute inset-0" />

      {/* ═══ ZOOM CONTROLS ═══ */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold"
          title="تكبير"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold"
          title="تصغير"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold"
          title="إعادة ضبط"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* ═══ COMPASS ═══ */}
      <div className="absolute top-3 right-3 z-20">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 bg-black/60 backdrop-blur-sm">
          <span className="font-naskh text-xs font-bold text-gold">شمال</span>
        </div>
      </div>

      {/* ═══ RESET ═══ */}
      {selectedId && (
        <button
          onClick={resetFilter}
          className="absolute left-3 bottom-3 z-20 rounded-md border border-gold/30 bg-black/70 px-3 py-1.5 text-xs text-gold backdrop-blur-sm transition-colors hover:bg-gold/20"
        >
          إلغاء التحديد ✕
        </button>
      )}

      {/* ═══ LOCATION COUNT ═══ */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1">
        <div className="rounded-md border border-gold/15 bg-black/60 px-2.5 py-1 text-[10px] text-gold/60 backdrop-blur-sm">
          {locations.length} أماكن
        </div>
        <div className="rounded-md border border-gold/30 bg-black/70 px-2.5 py-1 text-[10px] text-gold backdrop-blur-sm">
          ✦ {discoveredIds.size} مكتشفة
        </div>
      </div>

      {/* ═══ MAP CANVAS ═══ */}
      <div
        className="relative z-10 overflow-hidden rounded-xl"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
          transition: "transform 0.3s ease",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="aspect-[16/10] w-full"
          style={{ minHeight: "450px" }}
        >
          {/* Background grid */}
          <defs>
            <pattern
              id="grid"
              width="5"
              height="5"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 5 0 L 0 0 0 5"
                fill="none"
                stroke="rgba(212,168,67,0.04)"
                strokeWidth="0.1"
              />
            </pattern>
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d4a843" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#d4a843" stopOpacity="0" />
            </radialGradient>
            <filter id="pinGlow">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          <circle cx="50" cy="50" r="45" fill="url(#mapGlow)" />

          {/* ═══ PATHS between locations ═══ */}
          {sorted.map((loc, i) => {
            if (i === sorted.length - 1) return null;
            const next = sorted[i + 1];
            const isActive =
              selectedId === loc.id ||
              selectedId === next.id ||
              hoveredId === loc.id ||
              hoveredId === next.id;
            const dimmed =
              selectedId !== null &&
              selectedId !== loc.id &&
              selectedId !== next.id;

            // Curved path
            const mx = (loc.posX + next.posX) / 2;
            const my = (loc.posY + next.posY) / 2;
            const dx = next.posX - loc.posX;
            const dy = next.posY - loc.posY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const offset = dist * 0.12;
            const cpx = mx + (dy / (dist || 1)) * offset;
            const cpy = my - (dx / (dist || 1)) * offset;

            return (
              <g key={`path-${loc.id}-${next.id}`}>
                {/* Glow path */}
                {isActive && (
                  <path
                    d={`M${loc.posX},${loc.posY} Q${cpx},${cpy} ${next.posX},${next.posY}`}
                    fill="none"
                    stroke="#d4a843"
                    strokeWidth="0.8"
                    opacity="0.3"
                    filter="url(#pinGlow)"
                  />
                )}
                {/* Main path */}
                <path
                  d={`M${loc.posX},${loc.posY} Q${cpx},${cpy} ${next.posX},${next.posY}`}
                  fill="none"
                  stroke={isActive ? "#d4a843" : "rgba(212,168,67,0.25)"}
                  strokeWidth={isActive ? "0.4" : "0.2"}
                  strokeDasharray="1.5,1"
                  opacity={dimmed ? 0.1 : 1}
                  style={{ transition: "all 0.3s" }}
                />
                {/* Animated particle */}
                {isActive && (
                  <circle r="0.4" fill="#d4a843" opacity="0.8">
                    <animateMotion
                      dur="3s"
                      repeatCount="indefinite"
                      path={`M${loc.posX},${loc.posY} Q${cpx},${cpy} ${next.posX},${next.posY}`}
                    />
                  </circle>
                )}
                {/* Arrow direction indicator at midpoint */}
                <text
                  x={`${((loc.posX + next.posX) / 2) + (dy / (dist || 1)) * 1.5}%`}
                  y={`${((loc.posY + next.posY) / 2) - (dx / (dist || 1)) * 1.5}%`}
                  fill={isActive ? "#d4a843" : "rgba(212,168,67,0.2)"}
                  fontSize="1.5"
                  textAnchor="middle"
                  dominantBaseline="central"
                  opacity={dimmed ? 0.1 : 0.5}
                >
                  →
                </text>
              </g>
            );
          })}

          {/* ═══ LOCATION PINS ═══ */}
          {locations.map((loc, i) => {
            const isSelected = selectedId === loc.id;
            const isHovered = hoveredId === loc.id;
            const dimmed =
              selectedId !== null && !isSelected;

            return (
              <g
                key={loc.id}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setSelectedId(isSelected ? null : loc.id)
                }
                onMouseEnter={(e) => {
                  setHoveredId(loc.id);
                  setTooltip({ x: e.clientX, y: e.clientY, loc });
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  setTooltip(null);
                }}
              >
                {/* Pulsing ring for selected */}
                {isSelected && (
                  <circle
                    cx={`${loc.posX}%`}
                    cy={`${loc.posY}%`}
                    r="3%"
                    fill="none"
                    stroke="#d4a843"
                    strokeWidth="0.2"
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      values="3%;5%;3%"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.5;0.15;0.5"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Glow for hovered */}
                {(isHovered || isSelected) && (
                  <circle
                    cx={`${loc.posX}%`}
                    cy={`${loc.posY}%`}
                    r="3.5%"
                    fill="rgba(212,168,67,0.1)"
                    filter="url(#pinGlow)"
                  />
                )}

                {/* Pin icon or image */}
                {(() => {
                  const isDiscovered = discoveredIds.has(loc.id);
                  const pinColor = isSelected
                    ? "#ffd700"
                    : isHovered
                      ? "#d4a843"
                      : isDiscovered
                        ? "#d4a843"
                        : "#555";
                  const pinOpacity = dimmed
                    ? 0.15
                    : isDiscovered
                      ? 1
                      : 0.4;
                  return loc.imageUrl ? (
                  <>
                    <clipPath id={`loc-${loc.id}`}>
                      <circle
                        cx={`${loc.posX}%`}
                        cy={`${loc.posY}%`}
                        r="2.5%"
                      />
                    </clipPath>
                    <image
                      href={loc.imageUrl}
                      x={`${loc.posX - 2.5}%`}
                      y={`${loc.posY - 2.5}%`}
                      width="5%"
                      height="5%"
                      clipPath={`url(#loc-${loc.id})`}
                      opacity={dimmed ? 0.2 : isDiscovered ? 1 : 0.35}
                      style={{ transition: "opacity 0.3s", filter: isDiscovered ? "none" : "grayscale(1)" }}
                      preserveAspectRatio="xMidYMid slice"
                    />
                    <circle
                      cx={`${loc.posX}%`}
                      cy={`${loc.posY}%`}
                      r="2.5%"
                      fill="none"
                      stroke={pinColor}
                      strokeWidth={isSelected ? "0.35" : "0.2"}
                      opacity={pinOpacity}
                      style={{ transition: "all 0.3s" }}
                    />
                  </>
                ) : (
                  <>
                    {/* Pin shadow */}
                    <ellipse
                      cx={`${loc.posX}%`}
                      cy={`${loc.posY + 2.8}%`}
                      rx="1.5%"
                      ry="0.4%"
                      fill="rgba(0,0,0,0.3)"
                      opacity={dimmed ? 0.1 : 0.5}
                    />
                    {/* Pin body */}
                    <circle
                      cx={`${loc.posX}%`}
                      cy={`${loc.posY}%`}
                      r="2%"
                      fill={
                        isSelected
                          ? "rgba(255,215,0,0.2)"
                          : isDiscovered
                            ? "rgba(212,168,67,0.2)"
                            : "rgba(30,15,0,0.85)"
                      }
                      stroke={pinColor}
                      strokeWidth={isSelected ? "0.35" : "0.2"}
                      opacity={pinOpacity}
                      style={{ transition: "all 0.3s" }}
                      filter={isHovered ? "url(#pinGlow)" : undefined}
                    />
                    {/* Pin icon */}
                    <text
                      x={`${loc.posX}%`}
                      y={`${loc.posY}%`}
                      fill={pinColor}
                      fontSize="2"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none"
                      opacity={pinOpacity}
                    >
                      {isDiscovered ? "📍" : "❓"}
                    </text>
                  </>
                );
                })()}

                {/* Name label */}
                <rect
                  x={`${loc.posX - 5}%`}
                  y={`${loc.posY + 2.5}%`}
                  width="10%"
                  height="3%"
                  rx="0.8"
                  fill="rgba(0,0,0,0.7)"
                  opacity={dimmed ? 0 : isSelected || isHovered ? 0.95 : 0.7}
                  style={{ transition: "opacity 0.3s" }}
                />
                <text
                  x={`${loc.posX}%`}
                  y={`${loc.posY + 4.2}%`}
                  fill={
                    isSelected
                      ? "#ffd700"
                      : isHovered
                        ? "#d4a843"
                        : "#c9a84c"
                  }
                  fontSize="1.8"
                  textAnchor="middle"
                  className="pointer-events-none font-naskh font-bold"
                  opacity={dimmed ? 0.1 : 1}
                  style={{ transition: "opacity 0.3s" }}
                >
                  {loc.name}
                </text>

                {/* Chapter badge */}
                <rect
                  x={`${loc.posX - 2.5}%`}
                  y={`${loc.posY + 5.5}%`}
                  width="5%"
                  height="2%"
                  rx="0.5"
                  fill="rgba(212,168,67,0.2)"
                  opacity={dimmed ? 0 : isSelected || isHovered ? 1 : 0.6}
                  style={{ transition: "opacity 0.3s" }}
                />
                <text
                  x={`${loc.posX}%`}
                  y={`${loc.posY + 6.8}%`}
                  fill="#d4a843"
                  fontSize="1.3"
                  textAnchor="middle"
                  className="pointer-events-none"
                  opacity={dimmed ? 0.1 : 0.8}
                >
                  ف{loc.startChapter}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ═══ TOOLTIP ═══ */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-gold/30 bg-black/90 p-3 shadow-xl backdrop-blur-sm"
          style={{ left: tooltip.x + 16, top: tooltip.y - 12 }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gold" />
            <h3 className="font-naskh text-sm font-bold text-gold">
              {tooltip.loc.name}
            </h3>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-gold/60">
            <span>
              فصل {toArabicDigits(tooltip.loc.startChapter)}
            </span>
            {tooltip.loc.endChapter && (
              <span>
                → {toArabicDigits(tooltip.loc.endChapter)}
              </span>
            )}
          </div>
          {tooltip.loc.description && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-gold/70">
              {tooltip.loc.description.length > 120
                ? tooltip.loc.description.slice(0, 120) + "…"
                : tooltip.loc.description}
            </p>
          )}
          <p className="mt-1.5 text-[9px] text-gold/40">
            اضغط للانتقال للفصل
          </p>
        </div>
      )}
    </div>
  );
}
