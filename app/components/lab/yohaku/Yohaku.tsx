/**
 * Yohaku.tsx — 余白 (White Space)
 *
 * Text layout powered by @chenglou/pretext.
 *
 * Body copy is constrained to a centered COLUMN_W-wide column.
 * An image (eyes.jpg) is pinned to the top-left of that column;
 * text wraps around it as a rectangular obstacle.
 *
 * The kanji floats over the full page. For every text row, we:
 *   1. Rasterize the kanji to a 256×256 ink mask (once per character, cached).
 *   2. For each text row, OR the mask vertically across the row's pixel height
 *      to get a 1-D ink profile (256 booleans).
 *   3. Walk the profile to find contiguous ink "run" intervals in page coords.
 *   4. Collect ALL obstacle intervals for the row (image rect + kanji ink runs).
 *   5. Subtract them from [colLeft, colRight] to get open segments.
 *   6. Call pretext's layoutNextLineRange() for each open segment.
 *
 * This means text genuinely flows between the actual ink strokes of the kanji,
 * not around a bounding rectangle, AND wraps around the eyes image.
 *
 * Layout: centered COLUMN_W column. Dialogue columns are decorative margins.
 * Kanji bounces off page edges. Scroll disabled on mount.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  prepareWithSegments,
  layoutNextLineRange,
  materializeLineRange,
  type PreparedTextWithSegments,
  type LayoutCursor,
} from '@chenglou/pretext';
import { CIRCLE_TEXT, LEFT_DIALOGUE, RIGHT_DIALOGUE } from './content';

// ─── Constants ────────────────────────────────────────────────────────────────
const FONT_SIZE   = 11;
const LINE_H      = 15;
const FONT_STR    = `${FONT_SIZE}px "OTNeueMontreal-SemiBoldSemiSqueezed", "Neue Montreal", Arial, sans-serif`;
const LABEL_FONT  = '"OTNeueMontreal-SemiBoldSemiSqueezed", "Neue Montreal", Arial, sans-serif';
const KANJI_FONT  = '"Noto Serif JP", "Hiragino Mincho ProN", serif';
const SIDE_W      = 140;   // px — dialogue column width (decorative)
const DVD_SPEED   = 1.8;
const FRICTION    = 0.97;
const MIN_SPEED   = DVD_SPEED;
const MOVE_THRESH = 3;     // px — relayout threshold
const MASK_RES    = 256;   // ink mask resolution
const MIN_GAP_W   = 6;     // px — minimum gap width to bother laying text into
const MOBILE_BREAKPOINT = 768; // px — viewport width below which mobile layout applies
const COL_PAD     = 0;     // px — page margin on mobile (edge-to-edge)

// ─── Column + image constants ─────────────────────────────────────────────────
const COLUMN_W    = 500;   // px — centered text column width
const IMG_W       = 180;   // px — eyes.jpg render width
const IMG_H       = 200;   // px — eyes.jpg render height
const IMG_TOP     = 40;    // px — aligns with dialogue column top padding
const IMG_GUTTER  = 10;    // px — gap between image right edge and wrapping text

const KANJI_SEQUENCE = ['余', '白', '活', '字', '間', '墨'];
const ESSAY_TEXT = CIRCLE_TEXT.toUpperCase();

// ─── Ink mask ─────────────────────────────────────────────────────────────────

/** Rasterize a kanji character to a MASK_RES×MASK_RES Uint8Array (1 = ink). */
function buildKanjiMask(char: string): Uint8Array {
  const c = document.createElement('canvas');
  c.width = MASK_RES;
  c.height = MASK_RES;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, MASK_RES, MASK_RES);
  ctx.font = `900 ${MASK_RES * 0.85}px ${KANJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(char, MASK_RES / 2, MASK_RES / 2);
  const data = ctx.getImageData(0, 0, MASK_RES, MASK_RES).data;
  const mask = new Uint8Array(MASK_RES * MASK_RES);
  for (let i = 0; i < MASK_RES * MASK_RES; i++) {
    mask[i] = data[i * 4 + 3] > 30 ? 1 : 0;
  }
  return mask;
}

/**
 * For a given text row (page coords), compute the 1-D ink profile:
 * a boolean array of length MASK_RES where true = ink present in that column.
 *
 * We OR across all mask rows that overlap the text row's vertical extent.
 */
function rowInkProfile(
  mask: Uint8Array,
  kanjiPageTop: number,
  kanjiPageBot: number,
  rowPageTop: number,
  rowPageBot: number,
): Uint8Array {
  const profile = new Uint8Array(MASK_RES);

  // Map page y-range → mask y-range
  const kanjiH = kanjiPageBot - kanjiPageTop;
  const maskY0 = Math.max(0, Math.floor(((rowPageTop - kanjiPageTop) / kanjiH) * MASK_RES));
  const maskY1 = Math.min(MASK_RES - 1, Math.ceil(((rowPageBot - kanjiPageTop) / kanjiH) * MASK_RES));

  for (let my = maskY0; my <= maskY1; my++) {
    const rowBase = my * MASK_RES;
    for (let mx = 0; mx < MASK_RES; mx++) {
      if (mask[rowBase + mx]) profile[mx] = 1;
    }
  }
  return profile;
}

/**
 * Given a 1-D ink profile and the kanji's page x-range,
 * return an array of INK run intervals in PAGE coordinates.
 * (Inverse of the old gapRuns — we want blocked regions, not open ones.)
 */
function inkRuns(
  profile: Uint8Array,
  kanjiPageLeft: number,
  kanjiPageRight: number,
): Array<{ x: number; w: number }> {
  const kanjiW = kanjiPageRight - kanjiPageLeft;
  const runs: Array<{ x: number; w: number }> = [];
  let inInk = false;
  let inkStart = 0;

  for (let mx = 0; mx < MASK_RES; mx++) {
    const isInk = profile[mx] === 1;
    if (isInk && !inInk) {
      inInk = true;
      inkStart = mx;
    } else if (!isInk && inInk) {
      inInk = false;
      const pageX = kanjiPageLeft + (inkStart / MASK_RES) * kanjiW;
      const pageW = ((mx - inkStart) / MASK_RES) * kanjiW;
      runs.push({ x: pageX, w: pageW });
    }
  }
  if (inInk) {
    const pageX = kanjiPageLeft + (inkStart / MASK_RES) * kanjiW;
    const pageW = ((MASK_RES - inkStart) / MASK_RES) * kanjiW;
    runs.push({ x: pageX, w: pageW });
  }
  return runs;
}

/**
 * Subtract a list of blocked intervals from [start, end].
 * Returns the remaining open segments as {x, w} pairs.
 * Blocked intervals are merged/sorted internally.
 */
function subtractIntervals(
  start: number,
  end: number,
  blocked: Array<{ x: number; w: number }>,
): Array<{ x: number; w: number }> {
  if (blocked.length === 0) return [{ x: start, w: end - start }];

  // Sort and merge blocked intervals
  const sorted = blocked
    .map(b => ({ lo: b.x, hi: b.x + b.w }))
    .sort((a, b) => a.lo - b.lo);

  const merged: Array<{ lo: number; hi: number }> = [];
  for (const seg of sorted) {
    if (merged.length === 0 || seg.lo > merged[merged.length - 1].hi) {
      merged.push({ ...seg });
    } else {
      merged[merged.length - 1].hi = Math.max(merged[merged.length - 1].hi, seg.hi);
    }
  }

  // Subtract from [start, end]
  const open: Array<{ x: number; w: number }> = [];
  let cursor = start;
  for (const { lo, hi } of merged) {
    const segStart = Math.max(cursor, start);
    const segEnd   = Math.min(lo, end);
    if (segEnd > segStart) open.push({ x: segStart, w: segEnd - segStart });
    cursor = Math.max(cursor, hi);
  }
  // Trailing segment after last blocked interval
  if (cursor < end) open.push({ x: cursor, w: end - cursor });

  return open;
}

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
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
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

// ─── Utility ──────────────────────────────────────────────────────────────────
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Yohaku() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const kanjiDivRef  = useRef<HTMLDivElement>(null);
  const leftColRef         = useRef<HTMLDivElement>(null);
  const rightColRef        = useRef<HTMLDivElement>(null);
  const mobileDialogueTop  = useRef<number | null>(null); // static baseline, set once per screen size
  const rafRef             = useRef<number>(0);

  // Physics (mutable, no re-renders)
  const phys = useRef({ x: 0, y: 0, vx: DVD_SPEED, vy: DVD_SPEED * 0.75, size: 0, charIdx: 0 });
  const lastLayout = useRef({ x: -999, y: -999, charIdx: -1 });

  // Page dims
  const pageDims = useRef({ w: 0, h: 0 });

  // Pretext prepared text
  const prepared = useRef<PreparedTextWithSegments | null>(null);

  // Ink masks (one per kanji character)
  const kanjiMasks = useRef<Uint8Array[]>([]);

  // Drag
  const dragging   = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const mouseHist  = useRef<Array<{ x: number; y: number; t: number }>>([]);

  const [ready, setReady]     = useState(false);
  const [charIdx, setCharIdx] = useState(0);
  const [, forceUpdate]       = useState(0); // incremented on resize to re-render image

  // ── Disable scroll on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouch    = document.body.style.touchAction;
    document.body.style.overflow    = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow    = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, []);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const cw = container.offsetWidth;
      const ch = container.offsetHeight;
      pageDims.current = { w: cw, h: ch };
    };

    measure();
    const { w: cw, h: ch } = pageDims.current;

    const ksize = Math.round(Math.min(cw, ch) * 0.55);
    phys.current = { x: cw / 2, y: ch / 2, vx: DVD_SPEED, vy: DVD_SPEED * 0.75, size: ksize, charIdx: 0 };

    // Build ink masks for all kanji
    kanjiMasks.current = KANJI_SEQUENCE.map(ch => buildKanjiMask(ch));

    // Prepare text with pretext
    prepared.current = prepareWithSegments(ESSAY_TEXT, FONT_STR);

    // Compute the static baseline bottom for mobile dialogue positioning.
    // Runs the row loop with ONLY the image obstacle (no kanji) to get the
    // natural bottom of the full text flow. Called once per screen size.
    const computeBaselineBottom = () => {
      if (!prepared.current) return;
      const { w: pw, h: ph } = pageDims.current;
      if (pw >= MOBILE_BREAKPOINT) return; // desktop — not needed
      const effColW = Math.min(COLUMN_W, pw - 2 * COL_PAD);
      const effImgW = Math.min(IMG_W, Math.floor(effColW * 0.45));
      const cLeft   = Math.round((pw - effColW) / 2);
      const cRight  = cLeft + effColW;
      let cur: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let bottom = IMG_TOP;
      const rows = Math.ceil((ph - IMG_TOP) / LINE_H);
      for (let row = 0; row < rows; row++) {
        const rTop = IMG_TOP + row * LINE_H;
        const rBot = rTop + LINE_H;
        const blocked: Array<{ x: number; w: number }> = [];
        if (rTop < IMG_TOP + IMG_H && rBot > IMG_TOP) {
          blocked.push({ x: cLeft, w: effImgW + IMG_GUTTER });
        }
        const segs = subtractIntervals(cLeft, cRight, blocked).filter(s => s.w >= MIN_GAP_W);
        if (segs.length === 0) {
          const r = layoutNextLineRange(prepared.current, cur, cRight - cLeft);
          if (r) cur = r.end;
          continue;
        }
        for (const seg of segs) {
          const r = layoutNextLineRange(prepared.current, cur, seg.w);
          if (!r) break;
          const line = materializeLineRange(prepared.current, r);
          cur = r.end;
          if (line.text.trim().length > 0) bottom = rTop + LINE_H;
        }
      }
      // Clamp so dialogue never gets pushed off-screen
      mobileDialogueTop.current = Math.min(bottom, ph - 40);
      // Apply immediately to dialogue refs
      const lc = leftColRef.current;
      const rc = rightColRef.current;
      if (lc && rc) {
        lc.style.top = `${mobileDialogueTop.current}px`;
        lc.style.padding = '0';
        rc.style.top = `${mobileDialogueTop.current}px`;
        rc.style.padding = '0';
      }
    };

    // Re-measure on resize
    const onResize = () => {
      measure();
      lastLayout.current = { x: -999, y: -999, charIdx: -1 };
      computeBaselineBottom();
      forceUpdate(n => n + 1);
    };
    window.addEventListener('resize', onResize);

    setReady(true);
    // Defer baseline computation until after first render so refs are attached
    requestAnimationFrame(computeBaselineBottom);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Relayout ────────────────────────────────────────────────────────────────
  const relayout = useCallback(() => {
    const layer = textLayerRef.current;
    if (!layer || !prepared.current) return;

    const p = phys.current;
    const { w: pageW, h: pageH } = pageDims.current;
    const mask = kanjiMasks.current[p.charIdx];
    if (!mask) return;

    // Responsive column — clamp to viewport on mobile
    const isMobile = pageW < MOBILE_BREAKPOINT;
    const effectiveColW = isMobile ? Math.min(COLUMN_W, pageW - 2 * COL_PAD) : COLUMN_W;
    const effectiveImgW = isMobile ? Math.min(IMG_W, Math.floor(effectiveColW * 0.45)) : IMG_W;
    const colLeft  = Math.round((pageW - effectiveColW) / 2);
    const colRight = colLeft + effectiveColW;
    if (colRight - colLeft < 20) return;

    const kHalf = p.size * 0.5;
    const kanjiPageLeft  = p.x - kHalf;
    const kanjiPageRight = p.x + kHalf;
    const kanjiPageTop   = p.y - kHalf;
    const kanjiPageBot   = p.y + kHalf;

    const html: string[] = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    // Text starts at IMG_TOP to align with image top and dialogue column padding
    const textStartY = IMG_TOP;
    const totalRows = Math.ceil((pageH - textStartY) / LINE_H);

    for (let row = 0; row < totalRows; row++) {
      const rowPageTop = textStartY + row * LINE_H;
      const rowPageBot = rowPageTop + LINE_H;
      const rowY = rowPageTop;

      // ── Collect blocked intervals for this row ──────────────────────────
      const blocked: Array<{ x: number; w: number }> = [];

      // 1. Eyes image obstacle (rectangular)
      const imgBot = IMG_TOP + IMG_H;
      if (rowPageTop < imgBot && rowPageBot > IMG_TOP) {
        // Block from colLeft to colLeft + effectiveImgW + IMG_GUTTER
        blocked.push({ x: colLeft, w: effectiveImgW + IMG_GUTTER });
      }

      // 2. Kanji ink obstacle (per-stroke mask)
      const kanjiOverlapsRow = kanjiPageTop < rowPageBot && kanjiPageBot > rowPageTop;
      if (kanjiOverlapsRow) {
        const profile = rowInkProfile(mask, kanjiPageTop, kanjiPageBot, rowPageTop, rowPageBot);
        const runs = inkRuns(profile, kanjiPageLeft, kanjiPageRight);
        for (const run of runs) {
          // Only add if the ink run actually overlaps the column
          const runRight = run.x + run.w;
          if (runRight > colLeft && run.x < colRight) {
            blocked.push({ x: run.x, w: run.w });
          }
        }
      }

      // ── Compute open segments ───────────────────────────────────────────
      const segments = subtractIntervals(colLeft, colRight, blocked)
        .filter(s => s.w >= MIN_GAP_W);

      // If no usable segments, advance cursor by a phantom line and skip
      if (segments.length === 0) {
        const range = layoutNextLineRange(prepared.current, cursor, colRight - colLeft);
        if (range) cursor = range.end;
        continue;
      }

      // ── Lay text into each open segment ────────────────────────────────
      for (const seg of segments) {
        const range = layoutNextLineRange(prepared.current, cursor, seg.w);
        if (!range) break;
        const line = materializeLineRange(prepared.current, range);
        cursor = range.end;
          if (line.text.trim().length > 0) {
          html.push(
            `<span style="position:absolute;left:${seg.x.toFixed(1)}px;top:${rowY}px;white-space:pre;">${escHtml(line.text)}</span>`
          );
        }
      }
    }

    layer.innerHTML = html.join('');

    // On desktop, ensure dialogue columns are reset to their default position.
    // On mobile the position is set once by computeBaselineBottom() and never
    // touched here — that's what prevents the per-frame jitter.
    if (!isMobile) {
      const leftCol  = leftColRef.current;
      const rightCol = rightColRef.current;
      if (leftCol && rightCol) {
        leftCol.style.top     = '0';
        leftCol.style.padding = '40px 0 0 0';
        rightCol.style.top     = '0';
        rightCol.style.padding = '40px 0 0 0';
      }
    }
  }, []);

  // ── RAF physics + relayout ──────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const kHalf = phys.current.size * 0.5;

    const tick = () => {
      if (!dragging.current) {
        const p = phys.current;
        const { w, h } = pageDims.current;

        p.vx *= FRICTION;
        p.vy *= FRICTION;
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd < MIN_SPEED) { const sc = MIN_SPEED / spd; p.vx *= sc; p.vy *= sc; }
        p.x += p.vx;
        p.y += p.vy;

        if (p.x - kHalf < 0)    { p.x = kHalf;     p.vx =  Math.abs(p.vx); }
        if (p.x + kHalf > w)    { p.x = w - kHalf;  p.vx = -Math.abs(p.vx); }
        if (p.y - kHalf < 0)    { p.y = kHalf;     p.vy =  Math.abs(p.vy); }
        if (p.y + kHalf > h)    { p.y = h - kHalf;  p.vy = -Math.abs(p.vy); }
      }

      if (kanjiDivRef.current) {
        kanjiDivRef.current.style.left = `${phys.current.x}px`;
        kanjiDivRef.current.style.top  = `${phys.current.y}px`;
      }

      const last = lastLayout.current;
      const p = phys.current;
      const dx = Math.abs(p.x - last.x);
      const dy = Math.abs(p.y - last.y);
      if (dx > MOVE_THRESH || dy > MOVE_THRESH || p.charIdx !== last.charIdx) {
        lastLayout.current = { x: p.x, y: p.y, charIdx: p.charIdx };
        relayout();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, relayout]);

  // ── Drag ────────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    mouseHist.current = [];
    dragOffset.current = { x: e.clientX - phys.current.x, y: e.clientY - phys.current.y };
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
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
    const tm = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', tm, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', onUp);
    };
  }, [ready]);

  // ── Cycle kanji on background click ─────────────────────────────────────────
  const onBgClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-kanji]')) return;
    const next = (phys.current.charIdx + 1) % KANJI_SEQUENCE.length;
    phys.current.charIdx = next;
    setCharIdx(next);
    lastLayout.current = { x: -999, y: -999, charIdx: -1 };
  }, []);

  const ksize = phys.current.size;

  // Compute responsive column + image dims for render (mirrors relayout logic)
  const _pw = pageDims.current.w;
  const isMobileRender = _pw > 0 && _pw < MOBILE_BREAKPOINT;
  const effectiveColWRender = isMobileRender ? Math.min(COLUMN_W, _pw - 2 * COL_PAD) : COLUMN_W;
  const effectiveImgWRender = isMobileRender ? Math.min(IMG_W, Math.floor(effectiveColWRender * 0.45)) : IMG_W;
  const colLeft = _pw > 0 ? Math.round((_pw - effectiveColWRender) / 2) : 0;

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label="Click to cycle kanji"
      onClick={onBgClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onBgClick(e as unknown as React.MouseEvent); }}
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* ── Full-page text layer ─────────────────────────────────────────── */}
      <div
        ref={textLayerRef}
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          fontFamily: FONT_STR,
          fontSize: FONT_SIZE,
          lineHeight: `${LINE_H}px`,
          color: '#000',
        }}
      />

      {/* ── Eyes image — top-left of text column ─────────────────────────── */}
      {ready && (
        <img
          src="/images/lab/yohaku/eyes.jpg"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: colLeft,
            top: IMG_TOP,
            width: effectiveImgWRender,
            height: IMG_H,
            objectFit: 'cover',
            objectPosition: 'center',
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'block',
          }}
        />
      )}

      {/* ── LEFT dialogue ────────────────────────────────────────────────── */}
      <div ref={leftColRef} style={{
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
      <div ref={rightColRef} style={{
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

      {/* ── Bouncing kanji ───────────────────────────────────────────────── */}
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
            left: phys.current.x,
            top: phys.current.y,
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

    </div>
  );
}
