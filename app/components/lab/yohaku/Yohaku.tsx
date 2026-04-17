/**
 * Yohaku.tsx — 余白 (White Space)
 *
 * Performance architecture:
 * - Face pixel map: computed ONCE on mount from portrait photo
 * - Kanji ink masks: computed ONCE per character at mount (6 total)
 * - Grid: rendered to a single <canvas> element, only redrawn when kanji moves > 3px
 * - Physics: runs every RAF frame, only moves a single <div>
 * - Side columns: static React, scramble via GSAP (no per-frame React updates)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { BODY_SEQ, FILLER_SEQ, LEFT_DIALOGUE, RIGHT_DIALOGUE } from './content';

// ─── ScrambleLabel ────────────────────────────────────────────────────────────
function ScrambleLabel({ text, style }: { text: string; style: React.CSSProperties }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let cancelled = false;
    const scheduleNext = () => {
      timerRef.current = setTimeout(() => {
        if (cancelled || !spanRef.current) return;
        runScramble();
      }, 4000 + Math.random() * 12000);
    };
    const runScramble = async () => {
      if (!spanRef.current) return;
      const { default: gsap } = await import('gsap');
      const { default: TextPlugin } = await import('gsap/TextPlugin');
      gsap.registerPlugin(TextPlugin);
      const letters = text.split('');
      const shuffle = () => {
        const a = [...letters];
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a.join('');
      };
      const tl = gsap.timeline({ onComplete: () => { if (!cancelled) scheduleNext(); } });
      for (let i = 0; i < 3; i++) tl.to(spanRef.current, { duration: 0.06, text: shuffle() });
      tl.to(spanRef.current, { duration: 0.06, text });
    };
    scheduleNext();
    return () => { cancelled = true; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text]);
  return <span ref={spanRef} style={style}>{text}</span>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONO_FONT  = "'PPSupplyMono-Regular', 'Courier New', monospace";
const LABEL_FONT = "'OTNeueMontreal-SemiBoldSemiSqueezed', Arial, sans-serif";
const FONT_SIZE  = 11;
const LINE_H     = 13;
const CELL_W     = 6.6;
const SIDE_W     = 140;
const DVD_SPEED  = 1.8;
const FRICTION   = 0.97;
const MIN_SPEED  = DVD_SPEED;
const KANJI_FONT = '"Noto Serif JP", "Hiragino Mincho ProN", serif';
const FACE_IMG   = '/images/lab/yohaku/yohaku-face.jpg';
const DARK_THRESH = 80;
const MID_THRESH  = 210;
const KANJI_SEQUENCE = ['余', '白', '活', '字', '間', '墨'];
// Mask canvas size — kanji rendered at this size for ink detection
const MASK_SIZE = 512;
// Throttle: only recompute grid if kanji moved more than this many pixels
const MOVE_THRESH = 3;

// ─── Build face pixel map (once) ─────────────────────────────────────────────
async function buildFaceMap(pageW: number, pageH: number): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = pageW; c.height = pageH;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      const scale = pageH / img.naturalHeight;
      const drawW = img.naturalWidth * scale;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, pageW, pageH);
      ctx.drawImage(img, (pageW - drawW) / 2, 0, drawW, pageH);
      const d = ctx.getImageData(0, 0, pageW, pageH).data;
      const b = new Uint8Array(pageW * pageH);
      for (let i = 0; i < pageW * pageH; i++) {
        b[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
      }
      resolve(b);
    };
    img.onerror = () => resolve(new Uint8Array(pageW * pageH).fill(255));
    img.src = FACE_IMG;
  });
}

// ─── Build kanji ink masks (once per character) ───────────────────────────────
// Returns a Uint8Array of size MASK_SIZE*MASK_SIZE: 1=ink, 0=empty
// Kanji is rendered centered in the mask canvas at MASK_SIZE px
function buildKanjiMask(char: string, renderSize: number): Uint8Array {
  const c = document.createElement('canvas');
  c.width = MASK_SIZE; c.height = MASK_SIZE;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, MASK_SIZE, MASK_SIZE);
  ctx.font = `900 ${renderSize}px ${KANJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(char, MASK_SIZE / 2, MASK_SIZE / 2);
  const d = ctx.getImageData(0, 0, MASK_SIZE, MASK_SIZE).data;
  const mask = new Uint8Array(MASK_SIZE * MASK_SIZE);
  for (let i = 0; i < MASK_SIZE * MASK_SIZE; i++) {
    mask[i] = d[i * 4 + 3] > 20 ? 1 : 0;
  }
  return mask;
}

// ─── Test if page pixel (px, py) is inside kanji at (kx, ky) ─────────────────
function inKanji(
  px: number, py: number,
  kx: number, ky: number, ksize: number,
  mask: Uint8Array,
): boolean {
  // Map page pixel to mask coordinates
  // Kanji is centered at (kx, ky) with bounding box ksize × ksize
  const half = ksize * 0.5;
  const mx = Math.round(((px - kx + half) / ksize) * MASK_SIZE);
  const my = Math.round(((py - ky + half) / ksize) * MASK_SIZE);
  if (mx < 0 || mx >= MASK_SIZE || my < 0 || my >= MASK_SIZE) return false;
  return mask[my * MASK_SIZE + mx] === 1;
}

// ─── Draw grid to canvas ──────────────────────────────────────────────────────
function drawGrid(
  canvas: HTMLCanvasElement,
  faceMap: Uint8Array,
  kanjiMask: Uint8Array,
  kx: number, ky: number, ksize: number,
  fgColor: string,
) {
  const cw = canvas.width;
  const ch = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, cw, ch);

  const cols = Math.floor(cw / CELL_W);
  ctx.font = `${FONT_SIZE}px ${MONO_FONT}`;
  ctx.textBaseline = 'top';

  let bi = 0;
  let fi = 0;
  let rowIdx = 0;

  for (let y = 0; y < ch; y += LINE_H) {
    const sampleY = Math.round(y + LINE_H / 2);
    const rowCells: Array<{ char: string; isFace: boolean }> = [];

    for (let col = 0; col < cols; col++) {
      const sampleX = Math.round(col * CELL_W + CELL_W / 2);

      // Check kanji mask
      if (inKanji(sampleX, sampleY, kx, ky, ksize, kanjiMask)) {
        rowCells.push({ char: ' ', isFace: false });
        continue;
      }

      // Sample face map
      const bright = (sampleY >= 0 && sampleY < ch && sampleX >= 0 && sampleX < cw)
        ? faceMap[sampleY * cw + sampleX]
        : 255;

      if (bright < DARK_THRESH) {
        rowCells.push({ char: BODY_SEQ[bi % BODY_SEQ.length], isFace: true });
        bi++;
      } else if (bright < MID_THRESH) {
        const density = 1 - (bright - DARK_THRESH) / (MID_THRESH - DARK_THRESH);
        const threshold = Math.round(density * 9);
        const pattern = (col + rowIdx * 3) % 10;
        if (pattern < threshold) {
          rowCells.push({ char: BODY_SEQ[bi % BODY_SEQ.length], isFace: true });
          bi++;
        } else {
          rowCells.push({ char: FILLER_SEQ[fi % FILLER_SEQ.length], isFace: false });
          fi++;
        }
      } else {
        rowCells.push({ char: FILLER_SEQ[fi % FILLER_SEQ.length], isFace: false });
        fi++;
      }
    }

    // Draw filler chars at low opacity
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = fgColor;
    let fillerStr = '';
    for (const cell of rowCells) fillerStr += cell.isFace ? ' ' : cell.char;
    ctx.fillText(fillerStr, 0, y);

    // Draw face chars at full opacity
    ctx.globalAlpha = 1;
    ctx.fillStyle = fgColor;
    let faceStr = '';
    for (const cell of rowCells) faceStr += cell.isFace ? cell.char : ' ';
    ctx.fillText(faceStr, 0, y);

    rowIdx++;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Yohaku() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const kanjiDivRef  = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);

  // Physics state (mutable, not React state)
  const phys = useRef({ x: 0, y: 0, vx: DVD_SPEED, vy: DVD_SPEED * 0.75, size: 0, charIdx: 0 });
  const lastGridPos = useRef({ x: -999, y: -999, charIdx: -1 });

  // Cached data
  const faceMapRef  = useRef<Uint8Array | null>(null);
  const kanjiMasks  = useRef<Uint8Array[]>([]);
  const pageSizeRef = useRef({ w: 0, h: 0 });

  // Drag
  const dragging    = useRef(false);
  const dragOffset  = useRef({ x: 0, y: 0 });
  const mouseHist   = useRef<Array<{ x: number; y: number; t: number }>>([]);

  const [ready, setReady]       = useState(false);
  const [charIdx, setCharIdx]   = useState(0);

  // ── Init: load face map + build kanji masks ─────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    pageSizeRef.current = { w: cw, h: ch };

    const ksize = Math.round(ch * 0.44);
    phys.current = { x: cw * 0.62, y: ch * 0.42, vx: DVD_SPEED, vy: DVD_SPEED * 0.75, size: ksize, charIdx: 0 };

    // Build kanji masks (sync, fast — 6 small canvases)
    kanjiMasks.current = KANJI_SEQUENCE.map(ch => buildKanjiMask(ch, ksize));

    // Load face map (async)
    buildFaceMap(cw, ch).then((map) => {
      faceMapRef.current = map;
      setReady(true);
    });
  }, []);

  // ── Draw grid (called when kanji moves enough) ──────────────────────────────
  const drawIfMoved = useCallback(() => {
    const canvas = canvasRef.current;
    const faceMap = faceMapRef.current;
    if (!canvas || !faceMap) return;

    const p = phys.current;
    const last = lastGridPos.current;
    const dx = Math.abs(p.x - last.x);
    const dy = Math.abs(p.y - last.y);
    const charChanged = p.charIdx !== last.charIdx;

    if (dx < MOVE_THRESH && dy < MOVE_THRESH && !charChanged) return;

    lastGridPos.current = { x: p.x, y: p.y, charIdx: p.charIdx };

    const mask = kanjiMasks.current[p.charIdx];
    if (!mask) return;

    // Detect fg color from CSS variable
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--color-fg').trim() || '#1a1008';
    drawGrid(canvas, faceMap, mask, p.x, p.y, p.size, fg);
  }, []);

  // ── Physics RAF loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const { w: cw, h: ch } = pageSizeRef.current;
    const halfSize = phys.current.size * 0.44;

    const tick = () => {
      if (!dragging.current) {
        const p = phys.current;
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd < MIN_SPEED) { const sc = MIN_SPEED / spd; p.vx *= sc; p.vy *= sc; }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x - halfSize < 0)  { p.x = halfSize;      p.vx =  Math.abs(p.vx); }
        if (p.x + halfSize > cw) { p.x = cw - halfSize; p.vx = -Math.abs(p.vx); }
        if (p.y - halfSize < 0)  { p.y = halfSize;      p.vy =  Math.abs(p.vy); }
        if (p.y + halfSize > ch) { p.y = ch - halfSize; p.vy = -Math.abs(p.vy); }
      }

      // Move kanji div every frame (smooth)
      if (kanjiDivRef.current) {
        kanjiDivRef.current.style.left = `${phys.current.x}px`;
        kanjiDivRef.current.style.top  = `${phys.current.y}px`;
      }

      // Redraw grid only when needed
      drawIfMoved();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, drawIfMoved]);

  // ── Drag ────────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    mouseHist.current = [];
    dragOffset.current = { x: e.clientX - phys.current.x, y: e.clientY - phys.current.y };
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    dragging.current = true;
    mouseHist.current = [];
    dragOffset.current = { x: t.clientX - phys.current.x, y: t.clientY - phys.current.y };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const onMove = (cx: number, cy: number) => {
      if (!dragging.current) return;
      phys.current.x = cx - dragOffset.current.x;
      phys.current.y = cy - dragOffset.current.y;
      mouseHist.current.push({ x: phys.current.x, y: phys.current.y, t: performance.now() });
      if (mouseHist.current.length > 8) mouseHist.current.shift();
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const h = mouseHist.current;
      if (h.length >= 2) {
        const a = h[0], b = h[h.length - 1];
        const dt = (b.t - a.t) / 16;
        if (dt > 0) {
          phys.current.vx = (b.x - a.x) / dt;
          phys.current.vy = (b.y - a.y) / dt;
          const spd = Math.sqrt(phys.current.vx ** 2 + phys.current.vy ** 2);
          if (spd > 20) { phys.current.vx = phys.current.vx / spd * 20; phys.current.vy = phys.current.vy / spd * 20; }
        }
      }
    };
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const tm = (e: TouchEvent) => onMove(e.touches[0].clientX, e.touches[0].clientY);
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', tm, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', onUp);
    };
  }, [ready]);

  // ── Cycle kanji ─────────────────────────────────────────────────────────────
  const onBgClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-kanji]')) return;
    const next = (phys.current.charIdx + 1) % KANJI_SEQUENCE.length;
    phys.current.charIdx = next;
    setCharIdx(next);
    // Force grid redraw
    lastGridPos.current = { x: -999, y: -999, charIdx: -1 };
  }, []);

  const { w: cw, h: ch } = pageSizeRef.current;
  const ksize = phys.current.size;

  return (
    /* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    <div
      ref={containerRef}
      onClick={onBgClick}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* ── Single canvas for entire character grid ──────────────────────── */}
      <canvas
        ref={canvasRef}
        width={cw || 1}
        height={ch || 1}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Loading */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: LABEL_FONT, fontSize: '11px', color: 'var(--color-fg, #1a1008)', opacity: 0.4, letterSpacing: '0.1em',
        }}>余白</div>
      )}

      {/* ── LEFT dialogue ────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDE_W, padding: '40px 0 0 0',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0,
        pointerEvents: 'none', zIndex: 20,
      }}>
        {LEFT_DIALOGUE.map((item, i) => (
          <ScrambleLabel key={i} text={item} style={{
            display: 'inline-block', fontSize: '11px', lineHeight: 1.05, fontFamily: LABEL_FONT,
            textTransform: 'uppercase', whiteSpace: 'nowrap',
            background: 'var(--color-fg, #1a1008)', color: 'var(--color-bg, #DCCFBE)', padding: '1px 5px',
          }} />
        ))}
      </div>

      {/* ── RIGHT dialogue ───────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: SIDE_W, padding: '40px 0 0 0',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0,
        pointerEvents: 'none', zIndex: 20,
      }}>
        {RIGHT_DIALOGUE.map((item, i) => (
          <ScrambleLabel key={i} text={item} style={{
            display: 'inline-block', fontSize: '11px', lineHeight: 1.05, fontFamily: LABEL_FONT,
            textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'right',
            background: 'var(--color-fg, #1a1008)', color: 'var(--color-bg, #DCCFBE)', padding: '1px 5px',
          }} />
        ))}
      </div>

      {/* ── Bouncing kanji div (moves every frame via direct DOM) ────────── */}
      {ready && ksize > 0 && (
        <div
          ref={kanjiDivRef}
          data-kanji="true"
          role="button"
          tabIndex={0}
          aria-label={`Kanji ${KANJI_SEQUENCE[charIdx]}`}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onKeyDown={(e) => {
            const s = 20;
            if (e.key === 'ArrowLeft')  { phys.current.x -= s; phys.current.vx = -DVD_SPEED; }
            if (e.key === 'ArrowRight') { phys.current.x += s; phys.current.vx =  DVD_SPEED; }
            if (e.key === 'ArrowUp')    { phys.current.y -= s; phys.current.vy = -DVD_SPEED; }
            if (e.key === 'ArrowDown')  { phys.current.y += s; phys.current.vy =  DVD_SPEED; }
          }}
          style={{
            position: 'absolute',
            left: phys.current.x, top: phys.current.y,
            transform: 'translate(-50%, -50%)',
            fontSize: `${ksize}px`,
            fontFamily: KANJI_FONT,
            fontWeight: 900,
            lineHeight: 1,
            color: 'var(--color-fg, #1a1008)',
            cursor: 'grab',
            zIndex: 15,
            outline: 'none',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          {KANJI_SEQUENCE[charIdx]}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 12, left: 16, right: 16,
        display: 'flex', justifyContent: 'space-between',
        fontSize: '8px', fontFamily: LABEL_FONT,
        color: 'var(--color-fg, #1a1008)', opacity: 0.3,
        letterSpacing: '0.08em', pointerEvents: 'none',
        borderTop: '0.5px solid currentColor', paddingTop: 5, zIndex: 30,
      }}>
        <span>No. 002 · 余白 · {new Date().getFullYear()}</span>
        <span>DRAG · THROW · CLICK TO CYCLE</span>
        <span>Latimer Design</span>
      </div>
    </div>
  );
}
