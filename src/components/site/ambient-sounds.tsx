"use client";

import { useEffect, useRef, useState } from "react";
import {
  CloudRain,
  Flame,
  Wind,
  Waves,
  CloudLightning,
  MoonStar,
  Library,
  Sparkles,
  VolumeX,
  Volume2,
  Music,
  type LucideIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toArabicDigits } from "@/lib/format";

type SoundType =
  | "rain"
  | "fire"
  | "wind"
  | "ocean"
  | "thunderstorm"
  | "nightForest"
  | "ancientLibrary"
  | "cosmic";

const VALID_SOUNDS: readonly SoundType[] = [
  "rain",
  "fire",
  "wind",
  "ocean",
  "thunderstorm",
  "nightForest",
  "ancientLibrary",
  "cosmic",
] as const;

const SOUND_OPTIONS: {
  id: SoundType;
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: "rain", label: "مطر", Icon: CloudRain },
  { id: "fire", label: "نار", Icon: Flame },
  { id: "wind", label: "رياح", Icon: Wind },
  { id: "ocean", label: "أمواج", Icon: Waves },
  { id: "thunderstorm", label: "رعد", Icon: CloudLightning },
  { id: "nightForest", label: "غابة", Icon: MoonStar },
  { id: "ancientLibrary", label: "مكتبة", Icon: Library },
  { id: "cosmic", label: "كون", Icon: Sparkles },
];

/** Fade duration (seconds) for crossfades between sounds. */
const FADE_DURATION = 0.2;

function isValidSound(s: string | null): s is SoundType {
  return s !== null && (VALID_SOUNDS as readonly string[]).includes(s);
}

/**
 * Floating ambient-sounds button (bottom-left, above the scroll-to-top button).
 * Generates 8 procedural ambient soundscapes via the Web Audio API — no
 * external files, no API calls, works offline. Sound + volume persist in
 * localStorage and continue playing across chapter navigation (the chapter
 * page never reloads — InfiniteReader updates the URL via history.replaceState).
 *
 * Audio architecture:
 *   AudioContext.destination
 *     ↑ master gain (volume)
 *       ↑ per-sound fade gain (200ms ramp in/out — crossfades between sounds)
 *         ↑ per-sound internal graph (noise sources, filters, LFOs, oscillators)
 */
export function AmbientSounds({ compact = false }: { compact?: boolean } = {}) {
  // Lazy initializers read localStorage once on the client; on the server
  // they return defaults so SSR + first client render match. (Same pattern
  // as the existing typingMode / autoScrollSpeed state in reader-view.tsx.)
  const [selectedSound, setSelectedSound] = useState<SoundType | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const s = localStorage.getItem("ambient-sound");
      if (isValidSound(s)) return s;
    } catch {
      // ignore
    }
    return null;
  });
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 0.5;
    try {
      const v = localStorage.getItem("ambient-volume");
      if (v) {
        const parsed = Number(v);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return 0.5;
  });
  const [open, setOpen] = useState(false);
  // Browsers block AudioContext until a user gesture happens, so we defer
  // audio creation until the first interaction anywhere on the page.
  const [audioReady, setAudioReady] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Wait for first user interaction before enabling audio (autoplay policy)
  useEffect(() => {
    if (audioReady) return;
    const handler = () => setAudioReady(true);
    const opts: AddEventListenerOptions = { once: true };
    document.addEventListener("click", handler, opts);
    document.addEventListener("touchstart", handler, opts);
    document.addEventListener("keydown", handler, opts);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [audioReady]);

  // Update master gain when volume changes (live, no audio restart)
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
    try {
      localStorage.setItem("ambient-volume", String(volume));
    } catch {
      // ignore
    }
  }, [volume]);

  // Persist sound choice
  useEffect(() => {
    try {
      if (selectedSound) {
        localStorage.setItem("ambient-sound", selectedSound);
      } else {
        localStorage.removeItem("ambient-sound");
      }
    } catch {
      // ignore
    }
  }, [selectedSound]);

  // Start / stop the actual audio when selectedSound or audioReady changes
  useEffect(() => {
    // Tear down previous sound with fade-out (the cleanup schedules a 200ms
    // ramp-down and stops sources 250ms later — so switching sounds crossfades
    // smoothly with the new sound fading in over the same window).
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!selectedSound || !audioReady) return;

    // Lazily create the AudioContext + master gain (only after user gesture)
    if (!audioCtxRef.current) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) return;
        audioCtxRef.current = new Ctor();
        masterGainRef.current = audioCtxRef.current.createGain();
        masterGainRef.current.gain.value = volume;
        masterGainRef.current.connect(audioCtxRef.current.destination);
      } catch {
        return;
      }
    }

    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    // Resume if suspended (some browsers create contexts suspended)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {
        // ignore
      });
    }

    cleanupRef.current = startSound(ctx, master, selectedSound);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
    // volume is intentionally NOT a dep — it's applied via master gain ref
  }, [selectedSound, audioReady]);

  // Cleanup the AudioContext on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {
          // ignore
        });
        audioCtxRef.current = null;
        masterGainRef.current = null;
      }
    };
  }, []);

  function handleSelect(sound: SoundType) {
    setSelectedSound((prev) => (prev === sound ? null : sound));
  }

  function handleStop() {
    setSelectedSound(null);
  }

  const currentOption = SOUND_OPTIONS.find((s) => s.id === selectedSound);
  const TriggerIcon = currentOption?.Icon ?? Music;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            currentOption ? `مشغّل الأجواء: ${currentOption.label}` : "أصوات الأجواء"
          }
          title={currentOption ? currentOption.label : "أصوات الأجواء"}
          className={cn(
            compact
              ? "flex h-7 w-7 items-center justify-center rounded-full text-gold/70 transition-colors hover:text-gold"
              : "fixed bottom-20 left-6 z-30 flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full border shadow-lg backdrop-blur transition-all duration-300 hover:scale-105",
            !compact && (selectedSound
              ? "border-gold/60 bg-gold/20 px-3 text-gold"
              : "w-12 border-gold/40 bg-background/90 text-gold/70 hover:bg-gold/10 hover:text-gold")
          )}
        >
          <TriggerIcon
            className={cn(compact ? "h-4 w-4" : "h-5 w-5", "shrink-0", selectedSound && "animate-pulse")}
          />
          {currentOption && !compact && (
            <span className="whitespace-nowrap pr-1 text-xs font-bold">
              {currentOption.label}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-72 border-gold/25 bg-popover p-3"
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gold/80">
              <Music className="h-3.5 w-3.5" />
              أصوات الأجواء
            </div>
            {currentOption && (
              <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                {currentOption.label}
              </span>
            )}
          </div>

          {/* Sound grid */}
          <div className="grid grid-cols-4 gap-2">
            {SOUND_OPTIONS.map((opt) => {
              const isActive = selectedSound === opt.id;
              const Icon = opt.Icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  aria-pressed={isActive}
                  title={opt.label}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors",
                    isActive
                      ? "border-gold/60 bg-gold/15 text-gold"
                      : "border-gold/15 text-muted-foreground hover:border-gold/40 hover:bg-gold/5 hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                  )}
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      isActive && "drop-shadow-[0_0_4px_var(--gold)]"
                    )}
                  />
                  <span className="text-[10px] font-medium leading-tight">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stop button */}
          <button
            type="button"
            onClick={handleStop}
            disabled={!selectedSound}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
              !selectedSound
                ? "cursor-not-allowed border-muted-foreground/30 bg-muted/40 text-muted-foreground/50"
                : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-foreground"
            )}
          >
            <VolumeX className="h-3.5 w-3.5" />
            إيقاف
          </button>

          {/* Volume slider */}
          <div className="pt-1">
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                مستوى الصوت
              </span>
              <span className="font-medium text-gold/80">
                {toArabicDigits(Math.round(volume * 100))}٪
              </span>
            </div>
            <Slider
              value={[volume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(v) => setVolume(v[0])}
              aria-label="مستوى الصوت"
              className="[&_[data-slot=slider-range]]:bg-gold [&_[data-slot=slider-thumb]]:border-gold"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ===== Procedural sound generators (Web Audio API) =====

type Cleanup = () => void;

/** White noise buffer — uniform random, full spectrum. */
function makeWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Brown noise — deeper, more natural than white noise. Generated by
 *  integrating white noise (lowpass-style rolloff of -6dB/octave). */
function makeBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5; // compensate gain
  }
  return buffer;
}

function makeBrownNoiseSource(ctx: AudioContext): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = makeBrownNoiseBuffer(ctx);
  source.loop = true;
  return source;
}

function makeWhiteNoiseSource(ctx: AudioContext): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = makeWhiteNoiseBuffer(ctx);
  source.loop = true;
  return source;
}

/** Safely stop an AudioScheduledSourceNode (oscillator or buffer source). */
function safeStop(node: { stop: (when?: number) => void } | null | undefined): void {
  if (!node) return;
  try {
    node.stop();
  } catch {
    // already stopped
  }
}

/** Safely disconnect an AudioNode. */
function safeDisconnect(node: AudioNode | null | undefined): void {
  if (!node) return;
  try {
    node.disconnect();
  } catch {
    // already disconnected
  }
}

/** Disconnect a list of nodes. */
function disconnectAll(nodes: Array<AudioNode | null | undefined>): void {
  nodes.forEach(safeDisconnect);
}

/**
 * Start a sound with a 200ms fade-in. Returns a cleanup function that fades
 * out (200ms ramp) then stops the inner sound and disconnects the fade gain.
 * Switching sounds therefore crossfades naturally — the old sound's fade-out
 * overlaps with the new sound's fade-in.
 */
function startSound(
  ctx: AudioContext,
  destination: AudioNode,
  type: SoundType
): Cleanup {
  const fadeGain = ctx.createGain();
  fadeGain.gain.value = 0;
  fadeGain.connect(destination);

  // Fade in
  const now = ctx.currentTime;
  fadeGain.gain.setValueAtTime(0, now);
  fadeGain.gain.linearRampToValueAtTime(1, now + FADE_DURATION);

  const innerStop = buildSound(ctx, fadeGain, type);

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const t = ctx.currentTime;
    try {
      // Capture the current automated value and hold it, then ramp to 0.
      // cancelAndHoldAtTime is supported in all modern browsers; fall back
      // to cancelScheduledValues + setValueAtTime for older Safari.
      const g = fadeGain.gain;
      if (typeof g.cancelAndHoldAtTime === "function") {
        g.cancelAndHoldAtTime(t);
      } else {
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
      }
      g.linearRampToValueAtTime(0, t + FADE_DURATION);
    } catch {
      // ignore — best-effort fade
    }
    // After the fade-out completes, stop sources & disconnect the fade gain.
    const stopDelayMs = (FADE_DURATION + 0.05) * 1000;
    window.setTimeout(() => {
      try {
        innerStop();
      } catch {
        // ignore
      }
      safeDisconnect(fadeGain);
    }, stopDelayMs);
  };
}

/** Build the actual sound graph (no fade logic — just the sound). */
function buildSound(
  ctx: AudioContext,
  destination: AudioNode,
  type: SoundType
): Cleanup {
  switch (type) {
    case "rain":
      return buildRain(ctx, destination);
    case "fire":
      return buildFire(ctx, destination);
    case "wind":
      return buildWind(ctx, destination);
    case "ocean":
      return buildOcean(ctx, destination);
    case "thunderstorm":
      return buildThunderstorm(ctx, destination);
    case "nightForest":
      return buildNightForest(ctx, destination);
    case "ancientLibrary":
      return buildAncientLibrary(ctx, destination);
    case "cosmic":
      return buildCosmic(ctx, destination);
    default:
      return () => {
        // no-op
      };
  }
}

/** Rain — brown noise lowpassed ~1.2kHz (deep, pleasant) + faint high-freq
 *  hiss for splash texture. */
function buildRain(ctx: AudioContext, dest: AudioNode): Cleanup {
  const source = makeBrownNoiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.value = 0.6;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  // Subtle high-freq hiss for "splash" texture (drops on leaves, etc.)
  const hiss = makeWhiteNoiseSource(ctx);
  const hissFilter = ctx.createBiquadFilter();
  hissFilter.type = "highpass";
  hissFilter.frequency.value = 4000;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.08;
  hiss.connect(hissFilter);
  hissFilter.connect(hissGain);
  hissGain.connect(dest);

  source.start();
  hiss.start();

  return () => {
    safeStop(source);
    safeStop(hiss);
    disconnectAll([source, filter, gain, hiss, hissFilter, hissGain]);
  };
}

/** Wind — brown noise through bandpass with two LFOs (center freq + volume
 *  gusts). */
function buildWind(ctx: AudioContext, dest: AudioNode): Cleanup {
  const source = makeBrownNoiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 400;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;

  // Gusts: slow LFO modulating bandpass center frequency
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  // Volume gusts: second slower LFO on gain
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.1;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 0.2;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(gain.gain);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start();
  lfo.start();
  lfo2.start();

  return () => {
    safeStop(source);
    safeStop(lfo);
    safeStop(lfo2);
    disconnectAll([source, filter, gain, lfo, lfoGain, lfo2, lfo2Gain]);
  };
}

/** Fire — low rumble (brown noise lowpassed ~300Hz) + mid band with flame
 *  flicker LFO + random crackle pops. Combines the warm continuous rumble
 *  of a fire with the percussive crackle of burning wood. */
function buildFire(ctx: AudioContext, dest: AudioNode): Cleanup {
  // Low rumble — the warm "bed" of the fire
  const rumbleSrc = makeBrownNoiseSource(ctx);
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 300;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.4;
  rumbleSrc.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(dest);

  // Mid band — flame texture with flicker LFO
  const midSrc = makeBrownNoiseSource(ctx);
  const midFilter = ctx.createBiquadFilter();
  midFilter.type = "bandpass";
  midFilter.frequency.value = 800;
  midFilter.Q.value = 0.7;
  const midGain = ctx.createGain();
  midGain.gain.value = 0.15;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.3;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 150;
  lfo.connect(lfoGain);
  lfoGain.connect(midFilter.frequency);
  midSrc.connect(midFilter);
  midFilter.connect(midGain);
  midGain.connect(dest);

  rumbleSrc.start();
  midSrc.start();
  lfo.start();

  // Random crackle pops
  let active = true;
  let crackleTimeout: ReturnType<typeof setTimeout>;

  function scheduleCrackle() {
    if (!active) return;
    const delay = 100 + Math.random() * 600; // 100–700ms between pops
    crackleTimeout = setTimeout(() => {
      if (!active) return;
      cracklePop(ctx, dest);
      // Sometimes do a quick double-pop
      if (Math.random() > 0.6) {
        setTimeout(() => {
          if (active) cracklePop(ctx, dest);
        }, 30 + Math.random() * 80);
      }
      scheduleCrackle();
    }, delay);
  }
  scheduleCrackle();

  return () => {
    active = false;
    clearTimeout(crackleTimeout);
    safeStop(rumbleSrc);
    safeStop(midSrc);
    safeStop(lfo);
    disconnectAll([
      rumbleSrc,
      rumbleFilter,
      rumbleGain,
      midSrc,
      midFilter,
      midGain,
      lfo,
      lfoGain,
    ]);
  };
}

/** Single warm crackle pop — short burst with mid+high frequencies. */
function cracklePop(ctx: AudioContext, dest: AudioNode): void {
  const now = ctx.currentTime;
  const duration = 0.02 + Math.random() * 0.06; // 20–80ms

  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Sharp attack, exponential decay
    const t = i / bufferSize;
    const envelope = Math.exp(-8 * t);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  // Bandpass filter — warm pop sound (not harsh high-freq)
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 600 + Math.random() * 1200; // 600–1800Hz, varied
  filter.Q.value = 2;

  const g = ctx.createGain();
  g.gain.value = 0.15 + Math.random() * 0.2; // 0.15–0.35, varied loudness

  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(now);
  src.stop(now + duration);

  src.onended = () => {
    disconnectAll([src, filter, g]);
  };
}

/** Ocean — brown noise lowpassed ~500Hz with two slow LFOs: one modulates
 *  gain (wave swell), the other modulates filter cutoff (wash brightness).
 *  Period ~10 seconds → realistic wave cadence. */
function buildOcean(ctx: AudioContext, dest: AudioNode): Cleanup {
  const source = makeBrownNoiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 500;

  const waveGain = ctx.createGain();
  waveGain.gain.value = 0.5;

  // LFO 1: gain swell (waves rising and falling)
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.1; // ~10s per wave
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.35;
  lfo.connect(lfoGain);
  lfoGain.connect(waveGain.gain);

  // LFO 2: filter cutoff (brighter on the crash, darker on the retreat)
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.1;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 250;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(filter.frequency);

  source.connect(filter);
  filter.connect(waveGain);
  waveGain.connect(dest);
  source.start();
  lfo.start();
  lfo2.start();

  return () => {
    safeStop(source);
    safeStop(lfo);
    safeStop(lfo2);
    disconnectAll([source, filter, waveGain, lfo, lfoGain, lfo2, lfo2Gain]);
  };
}

/** Thunderstorm — heavy rain base (reuses buildRain) + occasional thunder
 *  rumble bursts (low-frequency noise with slow exponential decay). */
function buildThunderstorm(ctx: AudioContext, dest: AudioNode): Cleanup {
  const stopRain = buildRain(ctx, dest);

  let active = true;
  let thunderTimeout: ReturnType<typeof setTimeout>;

  function scheduleThunder() {
    if (!active) return;
    const delay = 4000 + Math.random() * 12000; // 4–16s between rumbles
    thunderTimeout = setTimeout(() => {
      if (!active) return;
      thunderRumble(ctx, dest);
      scheduleThunder();
    }, delay);
  }
  scheduleThunder();

  return () => {
    active = false;
    clearTimeout(thunderTimeout);
    stopRain();
  };
}

/** Thunder rumble — low-frequency brown-noise burst with slow exponential
 *  decay. Sounds like distant thunder rolling. */
function thunderRumble(ctx: AudioContext, dest: AudioNode): void {
  const now = ctx.currentTime;
  const duration = 2 + Math.random() * 2; // 2–4 seconds

  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 200; // only the deep rumble

  const g = ctx.createGain();
  // Quick attack (rumble builds), slow exponential decay
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.8, now + 0.1);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(now);
  src.stop(now + duration);

  src.onended = () => {
    disconnectAll([src, filter, g]);
  };
}

/** Night forest — soft brown-noise bed (lowpassed ~600Hz) + occasional
 *  cricket chirps (short bursts of high-freq square-wave pulses). */
function buildNightForest(ctx: AudioContext, dest: AudioNode): Cleanup {
  // Soft ambient bed (wind in trees, distant hum)
  const source = makeBrownNoiseSource(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start();

  let active = true;
  let cricketTimeout: ReturnType<typeof setTimeout>;

  function scheduleCricket() {
    if (!active) return;
    const delay = 500 + Math.random() * 2000; // 0.5–2.5s between chirps
    cricketTimeout = setTimeout(() => {
      if (!active) return;
      cricketChirp(ctx, dest);
      scheduleCricket();
    }, delay);
  }
  scheduleCricket();

  return () => {
    active = false;
    clearTimeout(cricketTimeout);
    safeStop(source);
    disconnectAll([source, filter, gain]);
  };
}

/** Cricket chirp — short burst of 3–6 high-freq square-wave pulses at
 *  ~4–5kHz with quick attack/decay. */
function cricketChirp(ctx: AudioContext, dest: AudioNode): void {
  const now = ctx.currentTime;
  const baseFreq = 4000 + Math.random() * 1000;
  const chirpCount = 3 + Math.floor(Math.random() * 4);
  const chirpInterval = 0.04 + Math.random() * 0.04;

  for (let i = 0; i < chirpCount; i++) {
    const t = now + i * chirpInterval;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(baseFreq, t);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.04);

    osc.onended = () => {
      disconnectAll([osc, g]);
    };
  }
}

/** Ancient library — very soft ambient hum (two low sines, 60Hz + 90Hz) +
 *  faint air hiss + occasional page-turn clicks (filtered noise bursts
 *  with quick decay). Evokes a quiet, dusty, sacred reading space. */
function buildAncientLibrary(ctx: AudioContext, dest: AudioNode): Cleanup {
  // Soft low hum — two sines a perfect fifth apart for warmth
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 60;
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 90;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.06;
  osc1.connect(humGain);
  osc2.connect(humGain);
  humGain.connect(dest);

  // Soft air hiss for "old room" ambience
  const hiss = makeWhiteNoiseSource(ctx);
  const hissFilter = ctx.createBiquadFilter();
  hissFilter.type = "bandpass";
  hissFilter.frequency.value = 2000;
  hissFilter.Q.value = 0.5;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.02;
  hiss.connect(hissFilter);
  hissFilter.connect(hissGain);
  hissGain.connect(dest);

  osc1.start();
  osc2.start();
  hiss.start();

  // Page-turn clicks
  let active = true;
  let pageTimeout: ReturnType<typeof setTimeout>;

  function schedulePage() {
    if (!active) return;
    const delay = 3000 + Math.random() * 8000; // 3–11s between page turns
    pageTimeout = setTimeout(() => {
      if (!active) return;
      pageTurn(ctx, dest);
      schedulePage();
    }, delay);
  }
  schedulePage();

  return () => {
    active = false;
    clearTimeout(pageTimeout);
    safeStop(osc1);
    safeStop(osc2);
    safeStop(hiss);
    disconnectAll([osc1, osc2, humGain, hiss, hissFilter, hissGain]);
  };
}

/** Page-turn click — short bandpassed noise burst with very fast decay. */
function pageTurn(ctx: AudioContext, dest: AudioNode): void {
  const now = ctx.currentTime;
  const duration = 0.15 + Math.random() * 0.1; // 150–250ms

  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    const envelope = Math.exp(-15 * t);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1500 + Math.random() * 1000; // 1.5–2.5kHz
  filter.Q.value = 1;

  const g = ctx.createGain();
  g.gain.value = 0.15;

  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(now);
  src.stop(now + duration);

  src.onended = () => {
    disconnectAll([src, filter, g]);
  };
}

/** Cosmic drone — low-freq detuned sine drone (55Hz + 82.5Hz perfect fifth)
 *  + shimmering high-freq noise band modulated by two slow LFOs (filter
 *  center + volume breathing). Fits the novel's "cosmic" / mystical theme. */
function buildCosmic(ctx: AudioContext, dest: AudioNode): Cleanup {
  // Low drone — two detuned sines a perfect fifth apart
  const drone1 = ctx.createOscillator();
  drone1.type = "sine";
  drone1.frequency.value = 55; // low A
  const drone2 = ctx.createOscillator();
  drone2.type = "sine";
  drone2.frequency.value = 82.5; // perfect fifth
  drone2.detune.value = 5; // slight detune for movement
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.15;
  drone1.connect(droneGain);
  drone2.connect(droneGain);
  droneGain.connect(dest);

  // Shimmering high-freq band — bandpassed white noise around 6kHz
  const shimmer = makeWhiteNoiseSource(ctx);
  const shimmerFilter = ctx.createBiquadFilter();
  shimmerFilter.type = "bandpass";
  shimmerFilter.frequency.value = 6000;
  shimmerFilter.Q.value = 5;
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.value = 0.02;

  // LFO 1: modulates bandpass center for "shimmering" movement
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 2000;
  lfo.connect(lfoGain);
  lfoGain.connect(shimmerFilter.frequency);

  // LFO 2: modulates shimmer volume for slow "breathing" effect
  const lfo2 = ctx.createOscillator();
  lfo2.frequency.value = 0.05;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 0.015;
  lfo2.connect(lfo2Gain);
  lfo2Gain.connect(shimmerGain.gain);

  shimmer.connect(shimmerFilter);
  shimmerFilter.connect(shimmerGain);
  shimmerGain.connect(dest);

  drone1.start();
  drone2.start();
  shimmer.start();
  lfo.start();
  lfo2.start();

  return () => {
    safeStop(drone1);
    safeStop(drone2);
    safeStop(shimmer);
    safeStop(lfo);
    safeStop(lfo2);
    disconnectAll([
      drone1,
      drone2,
      droneGain,
      shimmer,
      shimmerFilter,
      shimmerGain,
      lfo,
      lfoGain,
      lfo2,
      lfo2Gain,
    ]);
  };
}
