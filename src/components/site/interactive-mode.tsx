"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Zap,
  X,
  ShoppingBag,
  Users,
  Diamond,
  Loader2,
  Sparkles,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  TIERS,
  TIER5_STYLES,
  getTier5Style,
  getTierColors,
  normalizeTier,
  type TierKey,
} from "@/lib/truth-coins";
import {
  getDailyDiscount,
  getDiscountedPrice,
  isTierDiscountedToday,
} from "@/lib/daily-discount";
import { getUserId, getNickname, setNickname } from "@/lib/user-identity";

// ─── Types ──────────────────────────────────────────────────

type OwnedWord = {
  wordIndex: number;
  wordText: string;
  tier: number;
  color: string | null;
  styleId: string | null;
  owner: { nickname: string; userId: string };
};

type LiveFeedItem = {
  id: string;
  nickname: string;
  wordText: string;
  tier: number;
  timestamp: number;
};

type WordToken = {
  index: number;
  text: string;
  isSpace: boolean;
};

// ─── Word Tokenizer ─────────────────────────────────────────

function tokenizeContent(content: string, startIndex: number = 0): WordToken[] {
  const tokens: WordToken[] = [];
  const parts = content.split(/(\s+)/);
  let wordIndex = startIndex;
  for (const part of parts) {
    if (part === "") continue;
    const isSpace = /^\s+$/.test(part);
    tokens.push({
      index: isSpace ? -1 : wordIndex++,
      text: part,
      isSpace,
    });
  }
  return tokens;
}

/** Split content into paragraphs (by blank lines), tokenize each.
 *  Word indices are CONTINUOUS across paragraphs (0, 1, 2, ...). */
function tokenizeParagraphs(content: string): WordToken[][] {
  const paragraphs = content
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const result: WordToken[][] = [];
  let globalIndex = 0;
  for (const p of paragraphs) {
    const tokens = tokenizeContent(p, globalIndex);
    // Advance globalIndex by the number of non-space tokens
    for (const t of tokens) {
      if (!t.isSpace) globalIndex++;
    }
    result.push(tokens);
  }
  return result;
}

// ─── Word Style Renderer ────────────────────────────────────

function getWordClassName(tier: number): string {
  const t = normalizeTier(tier);
  if (t === 3) return "tier-3-word";
  if (t === 5) return "tier-5-word";
  return "";
}

function getWordInlineStyle(
  tier: number,
  color: string | null,
  styleId: string | null
): React.CSSProperties {
  const t = normalizeTier(tier);
  if (t === 1) {
    return { color: color || "#d4b05e", cursor: "pointer" };
  }
  if (t === 3) {
    const style = styleId ? getTier5Style(styleId) : TIER5_STYLES[0];
    return {
      backgroundImage: style.gradient,
      backgroundSize: "200% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      fontWeight: 800,
      filter: `drop-shadow(0 0 8px ${style.glow})`,
      cursor: "pointer",
    };
  }
  if (t === 5) {
    const style = styleId ? getTier5Style(styleId) : TIER5_STYLES[0];
    return {
      backgroundImage: style.gradient,
      backgroundSize: "200% auto",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      fontWeight: 900,
      filter: `drop-shadow(0 0 12px ${style.glow}) drop-shadow(0 0 24px ${style.glow}) drop-shadow(0 0 36px ${style.glow})`,
      padding: "0 6px",
      borderRadius: "6px",
      textShadow: `0 0 20px ${style.glow}`,
      cursor: "pointer",
    };
  }
  return { cursor: "pointer" };
}

// ─── Main Component ─────────────────────────────────────────

export function InteractiveMode({
  chapterNumber,
  chapterContent,
  fontSize = "20px",
  fontFamily = "var(--font-naskh), serif",
  lineHeight = "2.5",
}: {
  chapterNumber: number;
  chapterContent: string;
  fontSize?: string;
  fontFamily?: string;
  lineHeight?: string;
}) {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [nickname, setLocalNickname] = useState<string>("");
  const [coins, setCoins] = useState(0);
  const [ownedWords, setOwnedWords] = useState<Map<number, OwnedWord>>(
    new Map()
  );
  const [readerCount, setReaderCount] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{
    index: number;
    text: string;
  } | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  const paragraphs = tokenizeParagraphs(chapterContent);

  // ─── Init user + load words ───────────────────────────────

  const initUser = useCallback(async () => {
    const id = getUserId();
    const name = getNickname();
    if (!id || !name) return false;
    setUserId(id);
    setLocalNickname(name);
    try {
      const res = await fetch("/api/user/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, nickname: name }),
      });
      const data = await res.json();
      if (res.ok) {
        setCoins(data.coins || 0);
        if (data.receivedBonus) {
          toast({
            title: "💎 مكافأة يومية!",
            description: `حصلت على 5 عملات تروث`,
          });
        }
      }
    } catch {
      // ignore
    }
    return true;
  }, [toast]);

  const loadWords = useCallback(async () => {
    try {
      const res = await fetch(`/api/chapters/${chapterNumber}/words`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.words) {
        const map = new Map<number, OwnedWord>();
        for (const w of data.words) {
          map.set(w.wordIndex, w);
        }
        setOwnedWords(map);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [chapterNumber]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await initUser();
      if (!ok || cancelled) return;
      await loadWords();
    })();
    return () => {
      cancelled = true;
    };
  }, [initUser, loadWords]);

  // ─── Socket.io connection ─────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      const { io } = await import("socket.io-client");
      if (cancelled) return;

      const socket = io({
        path: "/",
        transports: ["websocket", "polling"],
        query: { XTransformPort: "3003" },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-chapter", {
          chapterId: chapterNumber,
          userId,
          nickname,
        });
      });

      socket.on("connect_error", (err) => {
        console.warn("Socket.io connection error:", err.message);
      });

      socket.on("reader-count", (data: { chapterId: number; count: number }) => {
        if (data.chapterId === chapterNumber) {
          setReaderCount(data.count);
        }
      });

      socket.on(
        "word-update",
        (data: {
          wordIndex: number;
          wordText: string;
          tier: number;
          color: string | null;
          styleId: string | null;
          nickname: string;
          userId: string;
        }) => {
          setOwnedWords((prev) => {
            const next = new Map(prev);
            next.set(data.wordIndex, {
              wordIndex: data.wordIndex,
              wordText: data.wordText,
              tier: data.tier,
              color: data.color,
              styleId: data.styleId,
              owner: { nickname: data.nickname, userId: data.userId },
            });
            return next;
          });
          setLiveFeed((prev) =>
            [
              {
                id: `${Date.now()}-${data.wordIndex}`,
                nickname: data.nickname,
                wordText: data.wordText,
                tier: data.tier,
                timestamp: Date.now(),
              },
              ...prev,
            ].slice(0, 10)
          );
        }
      );

      socket.on("word-removed", (data: { wordIndex: number }) => {
        setOwnedWords((prev) => {
          const next = new Map(prev);
          next.delete(data.wordIndex);
          return next;
        });
      });
    })();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, chapterNumber, nickname]);

  // ─── Word click handler ───────────────────────────────────

  function handleWordClick(index: number, text: string) {
    const owned = ownedWords.get(index);
    if (owned) {
      toast({
        title: `💎 ${owned.wordText}`,
        description: `هذه الكلمة ملك «${owned.owner.nickname}» — فئة ${TIERS[owned.tier as TierKey]?.name}`,
      });
      return;
    }
    setSelectedWord({ index, text });
    setPurchaseOpen(true);
  }

  // ─── Free claim ───────────────────────────────────────────

  // ─── Purchase ─────────────────────────────────────────────

  async function handlePurchase(tier: number, color?: string, styleId?: string) {
    if (!selectedWord || !userId) return;
    // Use today's discounted price (matches the server's calculation).
    const price = getDiscountedPrice(tier);
    if (coins < price) {
      toast({
        title: "رصيد غير كافٍ",
        description: `تحتاج ${price}💎 — لديك ${coins}💎`,
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await fetch(
        `/api/chapters/${chapterNumber}/words/purchase`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            wordIndex: selectedWord.index,
            wordText: selectedWord.text,
            tier,
            color: color || null,
            styleId: styleId || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "تعذّر الشراء",
          description: data.error || "خطأ",
          variant: "destructive",
        });
        return;
      }
      setCoins(data.remainingCoins);
      toast({
        title: "✓ تم الشراء!",
        description: `امتلكت «${selectedWord.text}» بفئة ${TIERS[tier as TierKey].name}`,
      });
      setPurchaseOpen(false);
    } catch {
      toast({ title: "خطأ", description: "تعذّر الاتصال", variant: "destructive" });
    }
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Interactive article — uses same reader-prose styling as story mode */}
      <article
        className="mx-auto max-w-3xl px-4 pt-14 pb-10 sm:px-6"
      >
        <div
          className="reader-prose"
          style={{ fontFamily, fontSize, lineHeight }}
        >
          {paragraphs.map((tokens, paraIdx) => (
            <p key={paraIdx}>
              {tokens.map((token, i) => {
                if (token.isSpace) {
                  return <span key={i}>{token.text}</span>;
                }
                const owned = ownedWords.get(token.index);
                if (owned) {
                  return (
                    <TooltipProvider key={i}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={getWordClassName(owned.tier)}
                            style={getWordInlineStyle(
                              owned.tier,
                              owned.color,
                              owned.styleId
                            )}
                            onClick={() => handleWordClick(token.index, token.text)}
                          >
                            {token.text}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="font-naskh text-xs">
                            <p>
                              💎{" "}
                              <Link
                                href={`/user/${owned.owner.userId}`}
                                className="font-bold text-gold underline-offset-2 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {owned.owner.nickname}
                              </Link>{" "}
                              — {TIERS[owned.tier as TierKey]?.name}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              انقر لعرض الملف الشخصي
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                return (
                  <span
                    key={i}
                    onClick={() => handleWordClick(token.index, token.text)}
                    className="cursor-pointer rounded transition-colors hover:bg-purple/10"
                    style={{ color: "var(--foreground)" }}
                  >
                    {token.text}
                  </span>
                );
              })}
            </p>
          ))}
        </div>

        {/* End ornament */}
        <div className="my-14 text-center">
          <div className="gold-divider mb-6" />
          <p className="font-naskh text-sm text-purple/60">انتهى الفصل</p>
        </div>
      </article>

      {/* Panel toggle button */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="fixed right-0 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-l-lg border border-purple/30 bg-[#0D0D1A] text-purple shadow-lg transition hover:bg-purple/20"
        aria-label="الوضع التفاعلي"
      >
        <Zap className="h-5 w-5" />
      </button>

      {/* Side panel */}
      {panelOpen && (
        <div
          className="fixed right-0 top-16 bottom-0 z-40 w-full max-w-sm overflow-y-auto border-l border-purple/20 bg-[#0D0D1A] p-4"
          style={{ animation: "float-in 0.3s ease forwards" }}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between border-b border-purple/15 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple" />
              <h2 className="font-naskh text-lg font-bold text-purple">
                الوضع التفاعلي
              </h2>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-purple/20 bg-purple/5 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-purple/70">
                <Users className="h-3 w-3" />
                قراء
              </div>
              <div className="font-mono text-lg font-bold text-purple">
                {readerCount}
              </div>
            </div>
            <div className="rounded-md border border-purple/20 bg-purple/5 p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-purple/70">
                <Diamond className="h-3 w-3" />
                تروث
              </div>
              <div className="font-mono text-lg font-bold text-purple">
                {coins}
              </div>
            </div>
          </div>

          {/* Purchase hint */}
          <div className="mb-4 rounded-md border border-purple/20 bg-purple/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-purple" />
              <h3 className="font-naskh text-sm font-bold text-purple">
                امتلك كلمة
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              انقر على أي كلمة في النص لشرائها بعملات تروث
            </p>
          </div>

          {/* Live feed */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple" />
              <h3 className="font-naskh text-sm font-bold text-purple">
                آخر الأحداث
              </h3>
            </div>
            {liveFeed.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا أحداث بعد</p>
            ) : (
              <ul className="space-y-1.5">
                {liveFeed.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md bg-purple/5 p-2 text-xs"
                  >
                    <span className="font-bold text-purple">{item.nickname}</span>
                    {" امتلك "}
                    <span className="font-naskh text-foreground">
                      {item.wordText}
                    </span>
                    <span className="text-muted-foreground">
                      {" — "}
                      {TIERS[item.tier as TierKey]?.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}


      {/* Purchase dialog */}
      <PurchaseDialog
        key={selectedWord ? `word-${selectedWord.index}` : "none"}
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        word={selectedWord}
        coins={coins}
        onPurchase={handlePurchase}
      />
    </div>
  );
}

// ─── Purchase Dialog ────────────────────────────────────────

function PurchaseDialog({
  open,
  onOpenChange,
  word,
  coins,
  onPurchase,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  word: { index: number; text: string } | null;
  coins: number;
  onPurchase: (tier: number, color?: string, styleId?: string) => void;
}) {
  const [tier, setTier] = useState<number>(1);
  const [color, setColor] = useState<string>("#ef4444");
  const [styleId, setStyleId] = useState<string>(TIER5_STYLES[0].id);

  // For tiers 3 + 5, we use styleId (gradient styles) not color
  const usesStyle = tier === 3 || tier === 5;
  const effectiveColor = color;

  // Today's daily discount (so we can badge the discounted tier)
  const dailyDiscount = getDailyDiscount();

  // Use the discounted price for both display and purchase — matches the
  // server-side /api/chapters/[id]/words/purchase calculation.
  const price = getDiscountedPrice(tier);
  const basePrice = TIERS[tier as TierKey]?.price || 0;
  const isDiscounted = isTierDiscountedToday(tier);
  const canAfford = coins >= price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto border-purple/25 bg-[#0D0D1A]">
        <DialogHeader>
          <DialogTitle className="font-naskh text-purple">امتلك كلمة</DialogTitle>
        </DialogHeader>
        {word && (
          <div className="space-y-4">
            {/* Word preview */}
            <div className="rounded-md border border-purple/20 bg-purple/5 p-4 text-center">
              <span
                className={getWordClassName(tier)}
                style={getWordInlineStyle(tier, effectiveColor, styleId)}
              >
                {word.text}
              </span>
            </div>

            {/* Tier selector — 3 tiers only */}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TIERS).map(([k, t]) => {
                const tierNum = Number(k);
                const active = tier === tierNum;
                const discounted = isTierDiscountedToday(tierNum);
                const displayPrice = getDiscountedPrice(tierNum);
                const originalPrice = t.price;
                return (
                  <button
                    key={k}
                    onClick={() => setTier(tierNum)}
                    className={`relative rounded-md border p-3 text-center transition ${
                      active
                        ? "border-purple bg-purple/20"
                        : "border-purple/20 hover:border-purple/50"
                    }`}
                  >
                    {/* Daily discount badge — shown on the discounted tier */}
                    {discounted && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-orange-400/50 bg-orange-500/90 px-2 py-0.5 text-[9px] font-bold text-white shadow-[0_0_12px_-2px_rgba(249,115,22,0.7)]">
                        🔥 خصم اليوم!
                      </span>
                    )}
                    <div className="text-xs font-bold text-purple">
                      {t.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {discounted ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground/60 line-through">
                            {originalPrice}💎
                          </span>
                          <span className="font-bold text-orange-400">
                            {displayPrice}💎
                          </span>
                        </span>
                      ) : (
                        <span>{t.price}💎</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Daily discount announcement banner */}
            {dailyDiscount.discount > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
                <Flame className="h-4 w-4 shrink-0" />
                <span>
                  عرض اليوم ({dailyDiscount.dayName}):{" "}
                  <span className="font-bold">
                    خصم {Math.round(dailyDiscount.discount * 100)}٪
                  </span>{" "}
                  على الفئة{" "}
                  <span className="font-bold">
                    {TIERS[dailyDiscount.tier as TierKey]?.name}
                  </span>
                </span>
              </div>
            )}

            {/* Color picker for tier 1 only */}
            {tier === 1 && (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">اختر لوناً:</p>
                <div className="grid grid-cols-10 gap-1.5">
                  {getTierColors(tier).map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
                        effectiveColor === c ? "border-white ring-2 ring-purple" : "border-white/20"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Style picker for tiers 3 + 5 — shows actual word preview per style */}
            {(tier === 3 || tier === 5) && (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">اختر ستايل — المعاينة بكلمتك:</p>
                <div className="grid grid-cols-2 gap-2">
                  {TIER5_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyleId(s.id)}
                      className={`overflow-hidden rounded-md border p-3 text-center transition ${
                        styleId === s.id
                          ? "border-purple bg-purple/20"
                          : "border-purple/20 hover:border-purple/50"
                      }`}
                    >
                      {/* Word preview with this style — tier 5 gets full animation */}
                      <span
                        className={
                          tier === 5
                            ? "tier-5-word text-base font-bold"
                            : "tier-3-word text-base font-bold"
                        }
                        style={{
                          backgroundImage: s.gradient,
                          backgroundSize: "200% auto",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          color: "transparent",
                          WebkitTextFillColor: "transparent",
                          display: "inline-block",
                          filter: tier === 5
                            ? `drop-shadow(0 0 8px ${s.glow}) drop-shadow(0 0 16px ${s.glow})`
                            : `drop-shadow(0 0 6px ${s.glow})`,
                        }}
                      >
                        {word?.text || s.name}
                      </span>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {s.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 border-t border-purple/15 pt-3">
              <div className="text-xs text-muted-foreground">
                رصيدك: <span className="font-bold text-purple">{coins}💎</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    onPurchase(
                      tier,
                      usesStyle ? undefined : effectiveColor,
                      usesStyle ? styleId : undefined
                    )
                  }
                  disabled={!canAfford}
                  className="bg-purple text-white hover:bg-purple/80 disabled:opacity-50"
                >
                  {isDiscounted ? (
                    <span className="inline-flex items-center gap-1.5">
                      شراء
                      <span className="text-[10px] text-white/60 line-through">
                        {basePrice}💎
                      </span>
                      <span className="font-bold text-orange-300">
                        {price}💎
                      </span>
                    </span>
                  ) : (
                    `شراء (${price}💎)`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Nickname Dialog (for first-time users) ─────────────────

export function NicknameDialog({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: (nickname: string) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const id = getUserId();
      const res = await fetch("/api/user/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, nickname: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "خطأ",
          description: data.error || "تعذّر التسجيل",
          variant: "destructive",
        });
        return;
      }
      setNickname(name.trim());
      toast({ title: "أهلاً بك!", description: `تم تسجيلك كـ «${name.trim()}»` });
      onComplete(name.trim());
    } catch {
      toast({ title: "خطأ", description: "تعذّر الاتصال", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="border-purple/25 bg-[#0D0D1A]">
        <DialogHeader>
          <DialogTitle className="font-naskh text-purple">
            ابدأ رحلتك التفاعلية
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            اختر اسماً مستعاراً — سيظهر عند امتلاكك للكلمات. لا حاجة لتسجيل دخول.
          </p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك..."
            maxLength={20}
            className="border-purple/30 bg-purple/5 font-naskh"
            autoFocus
          />
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-purple text-white hover:bg-purple/80"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "ابدأ ⚡"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
