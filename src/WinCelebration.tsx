import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

type SolvedCell = {
  index: number;
  value: number;
  given: boolean;
};

type WinCelebrationProps = {
  solvedCells: SolvedCell[];
  boardRect: DOMRect | null;
  phase: "playing" | "done";
  onFinish: () => void;
  isDarkMode: boolean;
  imageSrc: string;
};

// Built relative to Vite's base URL so assets resolve under the app's served path
// (e.g. "/my-sudoku/win/corgi-1.jpg"), not the site root.
const CORGI_IMAGES = [1, 2, 3, 4, 5].map((n) => `${import.meta.env.BASE_URL}win/corgi-${n}.jpg`);

// Picked once by App when a celebration starts, so the same corgi stays on screen
// across the playing -> done phase remount (rather than re-rolling a new one).
export function pickCorgiImage() {
  return CORGI_IMAGES[Math.floor(Math.random() * CORGI_IMAGES.length)];
}

// Warm fallback used when an image asset cannot be loaded, so the reveal still reads.
const FALLBACK_GRADIENT = "linear-gradient(135deg, #fed7aa 0%, #fbbf24 50%, #d97706 100%)";

// Pacing (milliseconds unless noted).
const ENLARGE_MS = 360; // how long one cell takes to grow to fill its block
const ENLARGE_STAGGER_MS = 70; // delay between consecutive cells within a wave
const HOLD_MS = 180; // pause at full size before the wave bursts
const WAVE_GAP_MS = 240; // gap between a wave's burst and the next wave
const END_HOLD_MS = 1500; // linger on the fully-revealed image before handing off to the card
// A cell grows (anchored in the board) to fill its own 3x3 block before bursting.

const PARTICLES_PER_CELL = 14;
const MAX_PARTICLES = 500;
const GRAVITY = 1400; // px/s^2 in viewport space
const PARTICLE_FADE_MS = 1600;
const DT_CLAMP_MS = 50; // guard against huge frame gaps (tab switches)

interface Particle {
  x: number;
  y: number;
  vx: number; // px/s
  vy: number; // px/s
  digit: string;
  color: string;
  size: number;
  rotation: number;
  angularVelocity: number; // rad/s
  age: number; // ms
}

// Per-cell absolute timeline, precomputed once from the solved snapshot.
interface ScheduledCell {
  index: number;
  value: number;
  given: boolean;
  enlargeStart: number;
  enlargeEnd: number;
  burstAt: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function WinCelebration({ solvedCells, boardRect, phase, onFinish, isDarkMode, imageSrc }: WinCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef = useRef<Set<number>>(new Set());
  const skipRef = useRef<() => void>(() => {});

  const boardBg = isDarkMode ? "#0f172a" : "#ffffff";
  const gridLine = isDarkMode ? "#334155" : "#e2e8f0";
  const givenColor = isDarkMode ? "#e2e8f0" : "#1e293b";
  const userColor = isDarkMode ? "#7dd3fc" : "#0284c7";

  // Build the per-digit wave timeline: cells enlarge one-by-one within a wave,
  // the whole wave bursts together once its last cell has finished enlarging,
  // then the next digit's wave begins.
  const { schedule, lastBurstAt } = useMemo(() => {
    const byDigit = new Map<number, SolvedCell[]>();
    for (let d = 1; d <= 9; d++) byDigit.set(d, []);
    for (const cell of solvedCells) {
      if (cell.value >= 1 && cell.value <= 9) byDigit.get(cell.value)!.push(cell);
    }

    const scheduled: ScheduledCell[] = [];
    let cursor = 0;
    let maxBurst = 0;

    for (let digit = 1; digit <= 9; digit++) {
      const cells = byDigit.get(digit)!;
      if (cells.length === 0) continue;
      cells.sort((a, b) => a.index - b.index);

      const lastEnlargeEnd = cursor + (cells.length - 1) * ENLARGE_STAGGER_MS + ENLARGE_MS;
      const burstAt = lastEnlargeEnd + HOLD_MS;

      for (let i = 0; i < cells.length; i++) {
        const enlargeStart = cursor + i * ENLARGE_STAGGER_MS;
        scheduled.push({
          index: cells[i].index,
          value: cells[i].value,
          given: cells[i].given,
          enlargeStart,
          enlargeEnd: enlargeStart + ENLARGE_MS,
          burstAt,
        });
      }

      maxBurst = Math.max(maxBurst, burstAt);
      cursor = burstAt + WAVE_GAP_MS;
    }

    return { schedule: scheduled, lastBurstAt: maxBurst };
  }, [solvedCells]);

  useEffect(() => {
    if (phase === "done" || !boardRect) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = boardRect;
    const cellW = rect.width / 9;
    const cellH = rect.height / 9;
    const fontPx = cellH * 0.6;

    const sizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();

    particlesRef.current = [];
    burstsRef.current.clear();

    let stopped = false;
    let startTime = 0;
    let lastTime = 0;
    let holdStart = 0; // set when the image first becomes fully revealed and clean

    const cellX = (index: number) => rect.left + (index % 9) * cellW;
    const cellY = (index: number) => rect.top + Math.floor(index / 9) * cellH;

    const spawnBurst = (cell: ScheduledCell) => {
      const cx = cellX(cell.index) + cellW / 2;
      const cy = cellY(cell.index) + cellH / 2;
      const color = cell.given ? givenColor : userColor;
      const digit = String(cell.value);
      for (let p = 0; p < PARTICLES_PER_CELL; p++) {
        if (particlesRef.current.length >= MAX_PARTICLES) break;
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 260;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (120 + Math.random() * 180), // upward bias
          digit,
          color,
          size: cellH * (0.28 + Math.random() * 0.16),
          rotation: Math.random() * Math.PI * 2,
          angularVelocity: (Math.random() - 0.5) * 8,
          age: 0,
        });
      }
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Progress: 0 = cell at its own size, 1 = cell expanded to fill its 3x3 block.
    const cellFillAt = (cell: ScheduledCell, elapsed: number) => {
      if (elapsed >= cell.enlargeEnd) return 1;
      if (elapsed >= cell.enlargeStart) return easeOutCubic((elapsed - cell.enlargeStart) / ENLARGE_MS);
      return 0;
    };

    // Draw a whole cell (opaque tile + digit) as one unit. At fill=0 it covers
    // exactly its own cell; at fill=1 it grows — anchored inside the board — to
    // fill the 3x3 block it belongs to, so a corner cell expands inward (right
    // and down) and never past the puzzle edge. The digit scales and re-centres.
    const drawTile = (cell: ScheduledCell, fill: number) => {
      const col = cell.index % 9;
      const row = Math.floor(cell.index / 9);
      const blockLeft = rect.left + Math.floor(col / 3) * 3 * cellW;
      const blockTop = rect.top + Math.floor(row / 3) * 3 * cellH;

      const x = lerp(cellX(cell.index), blockLeft, fill);
      const y = lerp(cellY(cell.index), blockTop, fill);
      const w = lerp(cellW, cellW * 3, fill);
      const h = lerp(cellH, cellH * 3, fill);

      ctx.fillStyle = boardBg;
      ctx.fillRect(x, y, w + 0.5, h + 0.5);
      ctx.strokeStyle = gridLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      ctx.font = `700 ${fontPx * (h / cellH)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = cell.given ? givenColor : userColor;
      ctx.fillText(String(cell.value), x + w / 2, y + h / 2);
    };

    const frame = (now: number) => {
      if (stopped) return;
      if (startTime === 0) {
        startTime = now;
        lastTime = now;
      }
      const elapsed = now - startTime;
      const dt = Math.min(now - lastTime, DT_CLAMP_MS);
      lastTime = now;
      const dts = dt / 1000;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Pass 1: the static field — every cell that hasn't burst, drawn at base
      // size, keeping the board fully covered. Cells that are currently popping
      // are deferred to pass 2 so they draw on top of their neighbours. A wave's
      // burst is triggered here as its cells cross burstAt (then they stop being
      // drawn, revealing the image cell-by-cell).
      const popped: { cell: ScheduledCell; fill: number }[] = [];
      for (const cell of schedule) {
        if (elapsed >= cell.burstAt) {
          if (!burstsRef.current.has(cell.index)) {
            burstsRef.current.add(cell.index);
            spawnBurst(cell);
          }
          continue;
        }
        const fill = cellFillAt(cell, elapsed);
        if (fill > 0) {
          popped.push({ cell, fill });
          continue;
        }
        drawTile(cell, 0);
      }

      // Pass 2: the expanding cells, on top, so each one grows over its block.
      for (const p of popped) drawTile(p.cell, p.fill);

      // Pass 3: falling-digit particles in viewport space.
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.age += dt;
        p.vy += GRAVITY * dts;
        p.x += p.vx * dts;
        p.y += p.vy * dts;
        p.rotation += p.angularVelocity * dts;

        const lifeT = p.age / PARTICLE_FADE_MS;
        if (lifeT >= 1 || p.y > window.innerHeight + 80) continue; // retire
        alive.push(p);

        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - lifeT);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `700 ${p.size}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = p.color;
        ctx.fillText(p.digit, 0, 0);
        ctx.restore();
      }
      particlesRef.current = alive;

      // The image is fully revealed once the final wave has burst and every
      // particle has left. Linger on that clean frame for END_HOLD_MS before
      // handing off to the completion card.
      if (elapsed >= lastBurstAt && particlesRef.current.length === 0) {
        if (holdStart === 0) holdStart = now;
        if (now - holdStart >= END_HOLD_MS) {
          stopped = true;
          onFinish();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    // Cover the whole board immediately (the static start frame), then wait to
    // start the reveal until the corgi image has decoded — otherwise the first
    // cells to burst would expose the fallback gradient before the photo paints.
    // The covered board hides the loading image, so the brief wait is seamless.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const cell of schedule) drawTile(cell, 0);

    let started = false;
    const start = () => {
      if (started || stopped) return;
      started = true;
      rafRef.current = requestAnimationFrame(frame);
    };
    const preload = new Image();
    preload.src = imageSrc;
    if (preload.complete) {
      start();
    } else {
      preload.onload = start;
      preload.onerror = start; // on failure, run anyway (gradient fallback)
    }
    const startTimeout = window.setTimeout(start, 2000); // never wait forever

    const skip = () => {
      if (stopped) return;
      stopped = true;
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      particlesRef.current = [];
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      onFinish();
    };
    skipRef.current = skip;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", sizeCanvas);

    return () => {
      stopped = true;
      window.clearTimeout(startTimeout);
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", sizeCanvas);
    };
  }, [phase, boardRect, schedule, lastBurstAt, boardBg, gridLine, givenColor, userColor, onFinish, imageSrc]);

  // Static, fully-revealed backdrop behind the completion card. The image lives
  // in an inset-2 box (a non-replaced div honours the right/bottom insets, which
  // an <img> alone would ignore — leaving the bottom of the board uncovered) and
  // fills it edge-to-edge so no part of the puzzle shows through.
  if (phase === "done") {
    return (
      <div className="pointer-events-none absolute inset-2 z-0 overflow-hidden rounded-xl" style={{ background: FALLBACK_GRADIENT }}>
        <img src={imageSrc} alt="" aria-hidden className="h-full w-full object-cover" />
      </div>
    );
  }

  return createPortal(
    // Click/tap anywhere on the scrim skips to the full reveal.
    <div className="fixed inset-0 z-60 cursor-pointer overflow-hidden bg-black/30" onClick={() => skipRef.current()}>
      <img
        src={imageSrc}
        alt=""
        aria-hidden
        onError={(e) => {
          e.currentTarget.style.background = FALLBACK_GRADIENT;
        }}
        className="pointer-events-none absolute object-cover"
        style={{
          left: boardRect?.left,
          top: boardRect?.top,
          width: boardRect?.width,
          height: boardRect?.height,
          background: FALLBACK_GRADIENT,
        }}
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          skipRef.current();
        }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white px-6 py-3 font-bold text-slate-900 shadow-2xl hover:bg-slate-100 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
      >
        Skip
      </button>
    </div>,
    document.body,
  );
}
