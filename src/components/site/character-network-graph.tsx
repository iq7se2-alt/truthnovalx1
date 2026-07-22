"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

type CharNode = {
  id: number;
  name: string;
  imageUrl: string | null;
  isMain: boolean;
  color: string | null;
};

type RelationEdge = {
  id: number;
  fromId: number;
  toId: number;
  type: string;
  description: string | null;
};

type Props = {
  characters: CharNode[];
  relations: RelationEdge[];
};

const REL_STYLES: Record<string, { color: string; label: string }> = {
  أب: { color: "#d4b05e", label: "أب" },
  أم: { color: "#e3c878", label: "أم" },
  صديق: { color: "#22c55e", label: "صديق" },
  عدو: { color: "#ef4444", label: "عدو" },
  معلم: { color: "#3b82f6", label: "معلم" },
  تلميذ: { color: "#60a5fa", label: "تلميذ" },
  عائلة: { color: "#fbbf24", label: "عائلة" },
  حليف: { color: "#a78bfa", label: "حليف" },
  زوج: { color: "#ec4899", label: "زوج" },
  زوجة: { color: "#ec4899", label: "زوجة" },
  أخ: { color: "#06b6d4", label: "أخ" },
  أخت: { color: "#06b6d4", label: "أخت" },
  ابن: { color: "#f59e0b", label: "ابن" },
  ابنة: { color: "#f59e0b", label: "ابنة" },
  تابع: { color: "#8b5cf6", label: "تابع" },
  سيده: { color: "#dc2626", label: "سيده" },
};

function getRelStyle(type: string) {
  return REL_STYLES[type] || { color: "#888", label: type };
}

function computePositions(
  chars: CharNode[],
  rels: RelationEdge[],
  size: number
): Map<number, { x: number; y: number }> {
  const pos = new Map<number, { x: number; y: number }>();
  const cx = size / 2;
  const cy = size / 2;

  const mains = chars.filter((c) => c.isMain);
  const others = chars.filter((c) => !c.isMain);

  const connections = new Map<number, number>();
  for (const c of chars) connections.set(c.id, 0);
  for (const r of rels) {
    connections.set(r.fromId, (connections.get(r.fromId) || 0) + 1);
    connections.set(r.toId, (connections.get(r.toId) || 0) + 1);
  }

  const innerR = size * 0.15;
  mains.forEach((ch, i) => {
    const angle = (i / Math.max(mains.length, 1)) * 2 * Math.PI - Math.PI / 2;
    pos.set(ch.id, { x: cx + innerR * Math.cos(angle), y: cy + innerR * Math.sin(angle) });
  });

  const sorted = [...others].sort((a, b) => (connections.get(b.id) || 0) - (connections.get(a.id) || 0));
  const outerMinR = size * 0.28;
  const outerMaxR = size * 0.44;
  const perRing = 10;
  const ringCount = Math.max(1, Math.ceil(sorted.length / perRing));

  sorted.forEach((ch, i) => {
    const ring = Math.floor(i / perRing);
    const ringTotal = Math.min(perRing, sorted.length - ring * perRing);
    const idxInRing = i % perRing;
    const r = ringCount === 1 ? (outerMinR + outerMaxR) / 2 : outerMinR + ((outerMaxR - outerMinR) * ring) / (ringCount - 1 || 1);
    const angle = (idxInRing / ringTotal) * 2 * Math.PI - Math.PI / 2 + ring * 0.35;
    pos.set(ch.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  });

  return pos;
}

export function CharacterNetworkGraph({ characters, relations }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredRel, setHoveredRel] = useState<number | null>(null);
  const [hoveredChar, setHoveredChar] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; desc?: string | null; imageUrl?: string | null } | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const SIZE = 800;
  const positions = useMemo(() => computePositions(characters, relations, SIZE), [characters, relations]);

  const activeRelIds = useMemo(() => {
    const target = selectedId ?? hoveredChar;
    if (target === null) return null;
    return new Set(relations.filter((r) => r.fromId === target || r.toId === target).map((r) => r.id));
  }, [selectedId, hoveredChar, relations]);

  const activeCharIds = useMemo(() => {
    if (activeRelIds === null) return null;
    const ids = new Set<number>();
    for (const r of relations) {
      if (activeRelIds.has(r.id)) { ids.add(r.fromId); ids.add(r.toId); }
    }
    return ids;
  }, [activeRelIds, relations]);

  const hasFilter = activeRelIds !== null;

  const toSvg = useCallback((x: number, y: number) => ({ x: (x / SIZE) * 100, y: (y / SIZE) * 100 }), []);

  const curvePath = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = dist * 0.18;
      const cxp = mx + (dy / dist) * offset;
      const cyp = my - (dx / dist) * offset;
      const p1 = toSvg(x1, y1), pc = toSvg(cxp, cyp), p2 = toSvg(x2, y2);
      return `M${p1.x},${p1.y} Q${pc.x},${pc.y} ${p2.x},${p2.y}`;
    },
    [toSvg]
  );

  const handleRelHover = useCallback(
    (rel: RelationEdge, e: React.MouseEvent, entering: boolean) => {
      if (entering) {
        setHoveredRel(rel.id);
        const from = characters.find((c) => c.id === rel.fromId);
        const to = characters.find((c) => c.id === rel.toId);
        const style = getRelStyle(rel.type);
        setTooltip({ x: e.clientX, y: e.clientY, text: `${from?.name || "?"} ← ${style.label} → ${to?.name || "?"}`, desc: rel.description });
      } else {
        setHoveredRel(null);
        setTooltip(null);
      }
    },
    [characters]
  );

  const resetFilter = () => { setSelectedId(null); setHoveredChar(null); };

  // Find currently hovered character for image in tooltip
  const hoveredCharData = hoveredChar ? characters.find((c) => c.id === hoveredChar) : null;

  return (
    <div ref={containerRef} className="gold-card relative overflow-hidden rounded-xl cosmic-bg">
      <div className="starfield absolute inset-0" />

      {/* ZOOM CONTROLS */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
        <button onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))} className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold" title="تكبير">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))} className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold" title="تصغير">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom(1)} className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/30 bg-black/60 text-gold/80 backdrop-blur-sm transition-colors hover:bg-gold/20 hover:text-gold" title="إعادة ضبط">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* LEGEND */}
      <div className="absolute right-3 bottom-3 z-20 flex flex-wrap gap-1.5 rounded-lg border border-gold/15 bg-black/70 p-2.5 backdrop-blur-sm">
        {Object.entries(REL_STYLES)
          .filter(([key]) => relations.some((r) => r.type === key))
          .map(([key, val]) => (
            <span key={key} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: `${val.color}20`, color: val.color }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: val.color }} />
              {val.label}
            </span>
          ))}
      </div>

      {/* RESET BUTTON */}
      {hasFilter && (
        <button onClick={resetFilter} className="absolute left-3 bottom-3 z-20 rounded-md border border-gold/30 bg-black/70 px-3 py-1.5 text-xs text-gold backdrop-blur-sm transition-colors hover:bg-gold/20">
          إلغاء التحديد ✕
        </button>
      )}

      {/* SELECTED CHARACTER INFO */}
      {selectedId && (() => {
        const ch = characters.find((c) => c.id === selectedId);
        if (!ch) return null;
        const charRels = relations.filter((r) => r.fromId === selectedId || r.toId === selectedId);
        return (
          <div className="absolute top-3 right-3 z-20 max-w-xs rounded-lg border border-gold/25 bg-black/80 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {ch.imageUrl ? (
                <img src={ch.imageUrl} alt={ch.name} className="h-10 w-10 rounded-full border border-gold/40 object-cover" loading="lazy" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-accent">
                  <span className="font-naskh text-lg font-bold text-gold/60">{ch.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <h3 className="font-naskh text-sm font-bold text-gold">{ch.name}</h3>
                <p className="text-[10px] text-gold/60">{charRels.length} علاقة</p>
              </div>
            </div>
            {charRels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {charRels.map((r) => {
                  const otherId = r.fromId === selectedId ? r.toId : r.fromId;
                  const other = characters.find((c) => c.id === otherId);
                  const style = getRelStyle(r.type);
                  return (
                    <span key={r.id} className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: `${style.color}20`, color: style.color }}>
                      {r.fromId === selectedId ? "→" : "←"} {style.label}: {other?.name ?? "?"}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* SVG GRAPH */}
      <div className="relative z-10 overflow-hidden rounded-xl" style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.3s ease" }}>
        <svg viewBox="0 0 100 100" className="aspect-[4/3] w-full" style={{ minHeight: "500px" }}>
          <defs>
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d4a843" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#d4a843" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#centerGlow)" />

          {/* RELATION LINES */}
          {relations.map((rel) => {
            const fromPos = positions.get(rel.fromId);
            const toPos = positions.get(rel.toId);
            if (!fromPos || !toPos) return null;
            const style = getRelStyle(rel.type);
            const isActive = activeRelIds?.has(rel.id) ?? false;
            const isHovered = hoveredRel === rel.id;
            const dimmed = hasFilter && !isActive;
            return (
              <g key={rel.id}>
                <path d={curvePath(fromPos.x, fromPos.y, toPos.x, toPos.y)} fill="none" stroke="transparent" strokeWidth="4" style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handleRelHover(rel, e, true)}
                  onMouseMove={(e) => { if (tooltip) setTooltip({ ...tooltip, x: e.clientX, y: e.clientY }); }}
                  onMouseLeave={(e) => handleRelHover(rel, e, false)} />
                <path d={curvePath(fromPos.x, fromPos.y, toPos.x, toPos.y)} fill="none" stroke={style.color}
                  strokeWidth={isHovered ? "0.7" : isActive ? "0.5" : "0.3"}
                  opacity={dimmed ? 0.06 : isHovered ? 1 : isActive ? 0.8 : 0.35}
                  strokeDasharray={style.color === "#ef4444" ? "1.2,0.6" : "none"}
                  filter={isHovered || isActive ? "url(#glow)" : undefined}
                  style={{ transition: "all 0.3s ease" }} />
                {(isHovered || (isActive && hasFilter)) && (
                  <>
                    <circle r="0.5" fill={style.color} opacity="0.9">
                      <animateMotion dur="2s" repeatCount="indefinite" path={curvePath(fromPos.x, fromPos.y, toPos.x, toPos.y)} />
                    </circle>
                    <text x={`${((fromPos.x + toPos.x) / 2 / SIZE) * 100}%`} y={`${((fromPos.y + toPos.y) / 2 / SIZE) * 100}%`}
                      fill={style.color} fontSize="2.2" textAnchor="middle" dy="-1.2"
                      className="pointer-events-none font-naskh font-bold" style={{ filter: "drop-shadow(0 0 3px black)" }}>
                      {style.label}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* CHARACTER NODES — letter circles only, no SVG images */}
          {characters.map((ch) => {
            const pos = positions.get(ch.id);
            if (!pos) return null;
            const sx = (pos.x / SIZE) * 100;
            const sy = (pos.y / SIZE) * 100;
            const isSelected = selectedId === ch.id;
            const isCharActive = activeCharIds?.has(ch.id) ?? true;
            const dimmed = hasFilter && !isCharActive && !isSelected;
            const nodeR = ch.isMain ? 4.2 : 3.0;
            const glowR = ch.isMain ? 4.8 : 3.4;

            return (
              <g key={ch.id} style={{ cursor: "pointer" }}
                onClick={() => setSelectedId(isSelected ? null : ch.id)}
                onMouseEnter={() => {
                  if (!selectedId) setHoveredChar(ch.id);
                  setTooltip({ x: 0, y: 0, text: ch.name, imageUrl: ch.imageUrl });
                }}
                onMouseMove={(e) => setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
                onMouseLeave={() => { if (!selectedId) setHoveredChar(null); setTooltip(null); }}
              >
                {/* Glow — only for selected or hovered */}
                {(isSelected || (hoveredChar === ch.id)) && (
                  <circle cx={`${sx}%`} cy={`${sy}%`} r={`${glowR}%`} fill="none" stroke="#d4a843" strokeWidth="0.25" opacity="0.4">
                    <animate attributeName="r" values={`${glowR}%;${glowR + 0.5}%;${glowR}%`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.2;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Filled circle with gradient */}
                <circle cx={`${sx}%`} cy={`${sy}%`} r={`${nodeR}%`}
                  fill={ch.color ? `${ch.color}30` : ch.isMain ? "rgba(30,15,0,0.9)" : "rgba(20,10,0,0.85)"}
                  stroke={isSelected ? "#ffd700" : ch.isMain ? "#d4a843" : "rgba(212,168,67,0.35)"}
                  strokeWidth={isSelected ? "0.4" : ch.isMain ? "0.3" : "0.15"}
                  opacity={dimmed ? 0.15 : 1}
                  filter={isSelected ? "url(#glow)" : undefined}
                  style={{ transition: "all 0.3s" }} />

                {/* Letter */}
                <text x={`${sx}%`} y={`${sy}%`}
                  fill={ch.color || (ch.isMain ? "#d4a843" : "rgba(212,168,67,0.7)")}
                  fontSize={ch.isMain ? "3.5" : "2.8"}
                  textAnchor="middle" dominantBaseline="central"
                  className="pointer-events-none font-naskh font-bold"
                  opacity={dimmed ? 0.1 : 1}>
                  {ch.name.charAt(0)}
                </text>

                {/* Name label */}
                <rect x={`${sx - 4}%`} y={`${sy + nodeR + 0.3}%`} width="8%" height="2.8%" rx="0.8" fill="rgba(0,0,0,0.6)" opacity={dimmed ? 0 : 0.85} style={{ transition: "opacity 0.3s" }} />
                <text x={`${sx}%`} y={`${sy + nodeR + 1.8}%`}
                  fill={isSelected ? "#ffd700" : ch.isMain ? "#d4a843" : "#c9a84c"}
                  fontSize="1.8" textAnchor="middle"
                  className="pointer-events-none font-naskh font-bold"
                  opacity={dimmed ? 0.1 : 1}>
                  {ch.name.length > 14 ? ch.name.slice(0, 14) + "…" : ch.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* TOOLTIP */}
      {tooltip && tooltip.x > 0 && (
        <div className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-gold/30 bg-black/90 px-3 py-2 shadow-xl backdrop-blur-sm"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div className="flex items-center gap-2">
            {tooltip.imageUrl && (
              <img src={tooltip.imageUrl} alt="" className="h-8 w-8 rounded-full border border-gold/40 object-cover" loading="lazy" />
            )}
            <p className="font-naskh text-sm font-bold text-gold">{tooltip.text}</p>
          </div>
          {tooltip.desc && (
            <p className="mt-1 text-[11px] leading-relaxed text-gold/70">
              {tooltip.desc.length > 100 ? tooltip.desc.slice(0, 100) + "…" : tooltip.desc}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
