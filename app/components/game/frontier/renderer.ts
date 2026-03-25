// ─── Frontier Wars — Canvas 2D Renderer ───────────────────────────────────────

import type { GameState, Unit, Building, Projectile, GoldPile, Biome } from "./types";
import type { Stance } from "./types";
import { COLORS } from "./types";
import { WORLD as W, MAX_UNITS, BIOME_PALETTES } from "./configs";

// ─── Main Render ──────────────────────────────────────────────────────────────

export function render(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  const gameH = canvasH - W.hudHeight;
  const cam = state.cameraX;

  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);

  // ── Background ──
  drawBackground(ctx, canvasW, gameH, cam, state.time, state.nightfall, state.biome ?? "desert");

  // ── World clip ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvasW, gameH);
  ctx.clip();

  // ── Gold piles ──
  state.goldPiles.forEach(p => drawGoldPile(ctx, p, cam));

  // ── Gold pile behind player saloon (below ground plane) ──
  const playerSaloonForGold = state.buildings.find(b => b.id === "player_saloon");
  if (playerSaloonForGold) {
    drawSaloonGoldPile(ctx, playerSaloonForGold, cam, state.gold);
  }

  // ── Buildings ──
  state.buildings.forEach(b => drawBuilding(ctx, b, cam, state.nightfall, state.upgrades, state.level));

  // ── Units — depth-sorted by Y (higher Y = lower on screen = drawn last = in front) ──
  // This is the painter's algorithm: units closer to the camera (lower on screen) render on top
  const sortedUnits = [...state.units].sort((a, b) => a.pos.y - b.pos.y);
  sortedUnits.forEach(u => {
    if (u.state === "garrison") return; // hidden inside saloon
    drawUnit(ctx, u, cam, state.upgrades);
  });

  // ── Projectiles ──
  state.projectiles.forEach(p => drawProjectile(ctx, p, cam));

  // ── Particles ──
  state.particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x - cam, p.pos.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // ── Floating texts ──
  state.floatingTexts.forEach(t => {
    const alpha = Math.min(1, t.life / 0.5);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.pos.x - cam, t.pos.y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";

  ctx.restore(); // end world clip

  // ── Garrison overlay on player saloon ──
  if (state.stance === "garrison") {
    const saloon = state.buildings.find(b => b.id === "player_saloon");
    const garrisonCount = state.units.filter(u => u.team === "player" && u.state === "garrison").length;
    if (saloon) drawGarrisonOverlay(ctx, saloon, cam, state.time, garrisonCount);
  }

  // ── Level name — top-left of game world ──
  drawLevelName(ctx, state);

  // ── Nightfall timer — top-center of game world ──
  drawNightfallTimer(ctx, state, canvasW);

  // ── HUD ──
  drawHUD(ctx, state, canvasW, canvasH, gameH);

  ctx.restore();
}

// ─── Background ───────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, cam: number, time: number, nightfall = false, biome: Biome = "desert") {
  const pal = BIOME_PALETTES[biome];

  // ── Sunset/night transition ──
  // time 0-150s = full day, 150-180s = sunset transition, 180s+ = night
  const SUNSET_START = 150;
  const NIGHTFALL_TIME = 180;
  const nightT = nightfall ? 1 : Math.max(0, Math.min(1, (time - SUNSET_START) / (NIGHTFALL_TIME - SUNSET_START)));

  // Hex color lerp helper
  const lerp = (a: string, b: string, t: number) => {
    const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
    const g = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
    const bl2 = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0");
    return `#${r}${g}${bl2}`;
  };

  // Sky gradient — blends from biome day palette to biome night palette
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  if (nightT < 0.01) {
    sky.addColorStop(0, pal.skyTop);
    sky.addColorStop(0.4, pal.skyMid);
    sky.addColorStop(1, pal.skyBottom);
  } else if (nightT < 1) {
    sky.addColorStop(0, lerp(pal.skyTop, pal.nightSkyTop, nightT));
    sky.addColorStop(0.4, lerp(pal.skyMid, pal.nightSkyMid, nightT));
    sky.addColorStop(1, lerp(pal.skyBottom, pal.nightSkyBottom, nightT));
  } else {
    sky.addColorStop(0, pal.nightSkyTop);
    sky.addColorStop(0.4, pal.nightSkyMid);
    sky.addColorStop(1, pal.nightSkyBottom);
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.65);

  // Stars (only at night)
  if (nightT > 0.3) {
    ctx.globalAlpha = (nightT - 0.3) / 0.7;
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 173 + 50) % w);
      const sy = ((i * 97 + 20) % (h * 0.5));
      const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + i * 1.3);
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = ((nightT - 0.3) / 0.7) * twinkle * 0.8;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  }

  // Sun / moon — sun moves down over the full 3 minutes, moon rises at nightfall
  const sunX = w * 0.75 - (cam * 0.02) % w;
  // sunProgress: 0 at t=0 (high in sky), 1 at t=180s (below horizon)
  // This makes the sun visibly move from the very first second
  const sunProgress = Math.min(1, time / NIGHTFALL_TIME);
  if (nightT < 1) {
    // Sun descends from h*0.10 (high) to h*0.72 (below horizon) over 3 minutes
    const sunY = h * (0.10 + sunProgress * 0.62);
    // Color shifts from bright yellow → orange → red as it sets
    const sunColor = sunProgress < 0.5
      ? "#FFD060"
      : `rgba(255,${Math.round(208 - sunProgress * 180)},0,1)`;
    ctx.fillStyle = sunColor;
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, sunProgress - 0.75) * 4);
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Sun glow — fades as it sets
    if (sunProgress < 0.9) {
      const glowAlpha = 0.3 * (1 - sunProgress);
      const glow = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 70);
      glow.addColorStop(0, `rgba(255,200,60,${glowAlpha})`);
      glow.addColorStop(1, "rgba(255,200,60,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (nightT > 0.5) {
    // Moon rises
    const moonAlpha = (nightT - 0.5) / 0.5;
    const moonY = h * (0.15 + (1 - moonAlpha) * 0.2);
    ctx.globalAlpha = moonAlpha;
    ctx.fillStyle = "#E8E8D0";
    ctx.beginPath();
    ctx.arc(sunX - 60, moonY, 22, 0, Math.PI * 2);
    ctx.fill();
    // Moon glow
    const moonGlow = ctx.createRadialGradient(sunX - 60, moonY, 15, sunX - 60, moonY, 55);
    moonGlow.addColorStop(0, "rgba(200,200,180,0.2)");
    moonGlow.addColorStop(1, "rgba(200,200,180,0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(sunX - 60, moonY, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Distant mountains (parallax layer 1 — slow) — use biome mountain colors
  const mtnColor1 = nightT > 0.5 ? lerp(pal.mtnFar, "#0a0a0a", 0.5) : pal.mtnFar;
  const mtnColor2 = nightT > 0.5 ? lerp(pal.mtnNear, "#0a0a0a", 0.4) : pal.mtnNear;
  drawMountains(ctx, w, h, cam * 0.05, mtnColor1, 0.55, 5);
  drawMountains(ctx, w, h, cam * 0.12, mtnColor2, 0.62, 7);

  // Ground — blends between biome day and night ground colors
  const groundGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
  if (nightT > 0.5) {
    groundGrad.addColorStop(0, lerp(pal.groundTop, pal.nightGroundTop, nightT));
    groundGrad.addColorStop(0.3, lerp(pal.groundMid, pal.nightGroundMid, nightT));
    groundGrad.addColorStop(1, lerp(pal.groundBottom, pal.nightGroundBottom, nightT));
  } else {
    groundGrad.addColorStop(0, pal.groundTop);
    groundGrad.addColorStop(0.3, pal.groundMid);
    groundGrad.addColorStop(1, pal.groundBottom);
  }
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);

  // Ground line
  ctx.strokeStyle = nightT > 0.5 ? lerp(pal.groundBottom, "#0a0a0a", 0.3) : pal.groundBottom;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, W.groundY);
  ctx.lineTo(w, W.groundY);
  ctx.stroke();

  // Vegetation (parallax layer 3) — biome-specific
  if (biome === "snow") {
    drawSnowTrees(ctx, w, h, cam * 0.3);
  } else if (biome === "forest" || biome === "river") {
    drawTrees(ctx, w, h, cam * 0.3);
  } else if (biome === "prairie") {
    drawGrassTufts(ctx, w, h, cam * 0.3);
  } else if (biome !== "volcanic" && biome !== "industrial") {
    drawCacti(ctx, w, h, cam * 0.3);
  }

  // Dust particles — biome-tinted
  drawDust(ctx, w, h, cam, time, pal.dustColor);
}

// ─── Biome Vegetation ─────────────────────────────────────────────────────────

function drawSnowTrees(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const baseX = (i * 280 + 60) % (w + 200);
    const x = ((baseX - offset % (w + 200)) + w + 200) % (w + 200) - 100;
    const scale = 0.6 + Math.sin(i * 2.1) * 0.25;
    const treeH = 55 * scale;
    const tx = x;
    const ty = W.groundY;
    // Trunk
    ctx.fillStyle = "#5a4a3a";
    ctx.fillRect(tx - 4 * scale, ty - treeH * 0.35, 8 * scale, treeH * 0.35);
    // Three tiers of pine
    ctx.fillStyle = "#2a4a2a";
    ctx.beginPath();
    ctx.moveTo(tx, ty - treeH); ctx.lineTo(tx - 18 * scale, ty - treeH * 0.55); ctx.lineTo(tx + 18 * scale, ty - treeH * 0.55); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx, ty - treeH * 0.7); ctx.lineTo(tx - 22 * scale, ty - treeH * 0.3); ctx.lineTo(tx + 22 * scale, ty - treeH * 0.3); ctx.closePath(); ctx.fill();
    // Snow caps
    ctx.fillStyle = "rgba(220,235,245,0.85)";
    ctx.beginPath();
    ctx.moveTo(tx, ty - treeH); ctx.lineTo(tx - 8 * scale, ty - treeH * 0.75); ctx.lineTo(tx + 8 * scale, ty - treeH * 0.75); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx, ty - treeH * 0.7); ctx.lineTo(tx - 10 * scale, ty - treeH * 0.5); ctx.lineTo(tx + 10 * scale, ty - treeH * 0.5); ctx.closePath(); ctx.fill();
  }
}

function drawTrees(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  const count = 10;
  for (let i = 0; i < count; i++) {
    const baseX = (i * 320 + 80) % (w + 200);
    const x = ((baseX - offset % (w + 200)) + w + 200) % (w + 200) - 100;
    const scale = 0.7 + Math.sin(i * 1.7) * 0.2;
    const treeH = 60 * scale;
    const tx = x;
    const ty = W.groundY;
    // Trunk
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(tx - 5 * scale, ty - treeH * 0.4, 10 * scale, treeH * 0.4);
    // Canopy
    ctx.fillStyle = "#2a5a1a";
    ctx.beginPath();
    ctx.arc(tx, ty - treeH * 0.7, 22 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a7a2a";
    ctx.beginPath();
    ctx.arc(tx - 8 * scale, ty - treeH * 0.8, 14 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrassTufts(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  const count = 20;
  for (let i = 0; i < count; i++) {
    const baseX = (i * 160 + 30) % (w + 100);
    const x = ((baseX - offset % (w + 100)) + w + 100) % (w + 100) - 50;
    const scale = 0.5 + Math.sin(i * 2.3) * 0.2;
    const ty = W.groundY;
    ctx.strokeStyle = "#6a8a20";
    ctx.lineWidth = 2 * scale;
    for (let j = 0; j < 5; j++) {
      const bx = x + (j - 2) * 5 * scale;
      const angle = -Math.PI / 2 + (j - 2) * 0.25;
      ctx.beginPath();
      ctx.moveTo(bx, ty);
      ctx.lineTo(bx + Math.cos(angle) * 14 * scale, ty + Math.sin(angle) * 14 * scale);
      ctx.stroke();
    }
  }
}

function drawMountains(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number, color: string, yFrac: number, count: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const baseY = h * yFrac;
  ctx.moveTo(0, baseY);
  for (let i = 0; i <= count + 1; i++) {
    const x = (i / count) * (w + 200) - (offset % (w / count));
    const peakH = 60 + Math.sin(i * 2.3) * 40 + Math.cos(i * 1.7) * 30;
    ctx.lineTo(x - 80, baseY);
    ctx.lineTo(x, baseY - peakH);
    ctx.lineTo(x + 80, baseY);
  }
  ctx.lineTo(w, baseY);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}

function drawCacti(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  const positions = [120, 280, 450, 620, 800, 950, 1100, 1300, 1500, 1700, 1900, 2100];
  positions.forEach(baseX => {
    const x = baseX - (offset % W.width);
    if (x < -60 || x > w + 60) return;
    drawCactus(ctx, x, W.groundY, 0.8 + Math.sin(baseX) * 0.3);
  });
}

function drawCactus(ctx: CanvasRenderingContext2D, x: number, groundY: number, scale: number) {
  const h = 40 * scale;
  ctx.fillStyle = COLORS.cactus;
  ctx.strokeStyle = COLORS.cactusDark;
  ctx.lineWidth = 1;
  // Main trunk
  ctx.fillRect(x - 5 * scale, groundY - h, 10 * scale, h);
  ctx.strokeRect(x - 5 * scale, groundY - h, 10 * scale, h);
  // Left arm
  ctx.fillRect(x - 18 * scale, groundY - h * 0.65, 13 * scale, 6 * scale);
  ctx.fillRect(x - 18 * scale, groundY - h * 0.65 - 12 * scale, 6 * scale, 14 * scale);
  // Right arm
  ctx.fillRect(x + 5 * scale, groundY - h * 0.5, 13 * scale, 6 * scale);
  ctx.fillRect(x + 12 * scale, groundY - h * 0.5 - 10 * scale, 6 * scale, 12 * scale);
}

function drawDust(ctx: CanvasRenderingContext2D, w: number, h: number, cam: number, time: number, dustColor = "rgba(180,120,60,0.15)") {
  ctx.fillStyle = dustColor;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 317 + time * 20 - cam * 0.1) % (w + 100)) - 50;
    const y = W.groundY - 10 + Math.sin(i * 1.3 + time) * 8;
    const r = 15 + Math.sin(i * 2.1) * 8;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 2, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Gold Piles ───────────────────────────────────────────────────────────────

function drawGoldPile(ctx: CanvasRenderingContext2D, pile: GoldPile, cam: number) {
  const sx = pile.pos.x - cam;
  const sy = pile.pos.y;
  const frac = pile.maxGold > 0 ? pile.gold / pile.maxGold : 0;

  if (frac <= 0) {
    // Depleted — just a small dirt patch
    ctx.fillStyle = "rgba(100,70,30,0.5)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Phase 1-4 based on remaining gold fraction
  const phase = frac > 0.75 ? 4 : frac > 0.5 ? 3 : frac > 0.25 ? 2 : 1;
  const size = 6 + phase * 3; // 9, 12, 15, 18

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4, size + 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pile base (dirt/rock)
  ctx.fillStyle = "#8B6914";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, size + 2, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gold nuggets — draw more for higher phases
  const nuggetCount = phase * 3;
  for (let i = 0; i < nuggetCount; i++) {
    const angle = (i / nuggetCount) * Math.PI * 2;
    const r = size * 0.5 * (0.3 + (i % 3) * 0.25);
    const nx = sx + Math.cos(angle) * r;
    const ny = sy + Math.sin(angle) * r * 0.4;
    const ns = 2 + (i % 3);
    ctx.fillStyle = i % 2 === 0 ? "#FFD700" : "#FFC200";
    ctx.fillRect(nx - ns / 2, ny - ns / 2, ns, ns);
  }

  // Glint on top
  if (phase >= 3) {
    ctx.fillStyle = "rgba(255,255,200,0.8)";
    ctx.fillRect(sx - 1, sy - size * 0.3, 2, 2);
  }

  // Gold amount label (only when pile is large enough)
  if (phase >= 2) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`$${pile.gold}`, sx, sy - size * 0.4 - 4);
    ctx.textAlign = "left";
  }
}

// ─── Garrison Overlay — units inside building, shooting from windows & roof ───

export function drawGarrisonOverlay(
  ctx: CanvasRenderingContext2D,
  saloon: Building,
  cam: number,
  time: number,
  garrisonedUnits: number = 3,
) {
  const sx = saloon.pos.x - cam;
  const sy = saloon.pos.y;
  const sw = saloon.width; // 80

  // ── Window silhouettes (units peeking out) ──
  // Left window: x+8, y+15, 18×14
  // Right window: x+sw-26, y+15, 18×14
  const leftWinX = sx + 8 + 9;   // center of left window
  const rightWinX = sx + sw - 26 + 9; // center of right window
  const winY = sy + 15;

  // Draw silhouette in left window
  ctx.fillStyle = "rgba(20,10,5,0.85)";
  ctx.beginPath();
  ctx.ellipse(leftWinX, winY + 10, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(leftWinX - 4, winY + 4, 8, 8); // body

  // Draw silhouette in right window
  ctx.fillStyle = "rgba(20,10,5,0.85)";
  ctx.beginPath();
  ctx.ellipse(rightWinX, winY + 10, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(rightWinX - 4, winY + 4, 8, 8);

  // Roof silhouette (crouching behind parapet) — only if 3+ garrisoned
  if (garrisonedUnits >= 3) {
    const roofY = sy - 18;
    ctx.fillStyle = "rgba(20,10,5,0.8)";
    ctx.beginPath();
    ctx.ellipse(sx + sw / 2, roofY + 4, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx + sw / 2 - 4, roofY + 2, 8, 6);
  }

  // ── Muzzle flashes from windows ──
  const flash1 = Math.sin(time * 7.3) > 0.6;
  const flash2 = Math.sin(time * 5.1 + 1.2) > 0.7;
  const flash3 = Math.sin(time * 9.0 + 2.4) > 0.65;

  // Left window flash — gun barrel pointing right out of window
  if (flash1) {
    ctx.fillStyle = "#FFD700";
    ctx.globalAlpha = 0.95;
    // Gun barrel
    ctx.fillRect(sx + sw - 2, sy + 20, 10, 3);
    // Muzzle flash star
    ctx.beginPath();
    ctx.arc(sx + sw + 10, sy + 21, 6, 0, Math.PI * 2);
    ctx.fill();
    // Flash rays
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 5; r++) {
      const angle = (r / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(sx + sw + 10, sy + 21);
      ctx.lineTo(sx + sw + 10 + Math.cos(angle) * 9, sy + 21 + Math.sin(angle) * 9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Right window flash
  if (flash2) {
    ctx.fillStyle = "#FFD700";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(sx + sw - 2, sy + 36, 10, 3);
    ctx.beginPath();
    ctx.arc(sx + sw + 10, sy + 37, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Roof flash — shooting from above
  if (flash3 && garrisonedUnits >= 3) {
    ctx.fillStyle = "#FFD700";
    ctx.globalAlpha = 0.8;
    ctx.fillRect(sx + sw / 2 - 1, sy - 22, 3, 8);
    ctx.beginPath();
    ctx.arc(sx + sw / 2, sy - 24, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── "GARRISON" label above saloon ──
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.fillText("⚑ GARRISON", sx + sw / 2, sy - 30);
  ctx.textAlign = "left";
}

// ─── Buildings ────────────────────────────────────────────────────────────────

// ─── Gold pile behind saloon ──────────────────────────────────────────────────

function drawSaloonGoldPile(ctx: CanvasRenderingContext2D, saloon: Building, cam: number, gold: number) {
  const sx = saloon.pos.x - cam + saloon.width / 2;
  const sy = W.groundY + 18; // below the ground line

  // Scale pile size with gold — always render at least a minimal pile so $0 is visible
  const scale = Math.max(0.08, Math.min(1, gold / 1500));

  const pileW = 30 + scale * 50;
  const pileH = 10 + scale * 18;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + pileH * 0.6, pileW * 0.6, pileH * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pile base
  ctx.fillStyle = "#8B6914";
  ctx.beginPath();
  ctx.ellipse(sx, sy, pileW, pileH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gold nuggets on top
  const nuggetCount = Math.floor(3 + scale * 12);
  for (let i = 0; i < nuggetCount; i++) {
    const angle = (i / nuggetCount) * Math.PI * 2;
    const r = pileW * 0.5 * (0.2 + (i % 4) * 0.2);
    const nx = sx + Math.cos(angle) * r;
    const ny = sy + Math.sin(angle) * r * 0.4 - pileH * 0.3;
    const ns = 2 + (i % 3);
    ctx.fillStyle = i % 2 === 0 ? "#FFD700" : "#FFC200";
    ctx.fillRect(nx - ns / 2, ny - ns / 2, ns, ns);
  }

  // Glint
  if (scale > 0.3) {
    ctx.fillStyle = "rgba(255,255,200,0.9)";
    ctx.fillRect(sx - 2, sy - pileH * 0.5, 2, 2);
  }

  // Gold amount label
  ctx.fillStyle = "#FFD700";
  ctx.font = `bold ${Math.round(8 + scale * 4)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`$${gold}`, sx, sy + pileH + 10);
  ctx.textAlign = "left";
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, cam: number, nightfall = false, upgrades?: import("./types").UpgradeState, level = 0) {
  const sx = b.pos.x - cam;
  const sy = b.pos.y;

  if (b.type === "mine") {
    drawMine(ctx, sx, sy, b.team === "enemy");
  } else if (b.type === "tipi") {
    // Ambush tier: level 100=tier1, 101=tier2, 102=tier3
    const ambushTier = level >= 100 ? Math.min(3, level - 100 + 1) : 1;
    drawTipi(ctx, sx, sy, b.hp / b.maxHp, ambushTier);
  } else {
    const revTier = (!b.team || b.team === "player") ? (upgrades?.saloonRevenue ?? 0) : 0;
    const hpTier  = (!b.team || b.team === "player") ? (upgrades?.saloonHp ?? 0) : 0;
    // Enemy saloon scales with campaign level: 0-1=tier0, 2-3=tier1, 4-5=tier2, 6-7=tier3
    const enemyTier = b.team === "enemy" ? Math.min(3, Math.floor(level / 2)) : 0;
    drawSaloon(ctx, sx, sy, b.team === "enemy", b.hp / b.maxHp, nightfall, revTier, hpTier, enemyTier);
  }

  // HP bar
  if (b.hp < b.maxHp) {
    const bw = b.width;
    ctx.fillStyle = COLORS.hpBg;
    ctx.fillRect(sx, sy - 12, bw, 6);
    ctx.fillStyle = b.hp / b.maxHp > 0.5 ? COLORS.hpGreen : COLORS.hpRed;
    ctx.fillRect(sx, sy - 12, bw * (b.hp / b.maxHp), 6);
  }
}

function drawSaloon(ctx: CanvasRenderingContext2D, x: number, y: number, isEnemy: boolean, hpFrac: number, nightfall = false, revenueTier = 0, hpTier = 0, enemyTier = 0) {
  // HP tier grows the saloon: tier 0=80px, tier 1=95px, tier 2=110px, tier 3=130px
  const hpHeightBonus = isEnemy ? 0 : hpTier * 17;
  // Enemy saloon grows with tier: tier0=80, tier1=90, tier2=105, tier3=120
  const enemyHeightBonus = isEnemy ? enemyTier * 13 : 0;
  const w = 80, h = 80 + hpHeightBonus + enemyHeightBonus;
  // Shift y up so the building grows upward (base stays on ground)
  const yAdj = y - hpHeightBonus - enemyHeightBonus;

  // Enemy wood/roof darken with tier
  const enemyWoodColors = ["#5c2020", "#4a1818", "#3a1010", "#2a0808"];
  const enemyRoofColors = ["#3d1010", "#2d0808", "#1d0404", "#0d0000"];
  const woodColor = isEnemy ? enemyWoodColors[enemyTier] : COLORS.saloonWood;
  const roofColor = isEnemy ? enemyRoofColors[enemyTier] : COLORS.saloonRoof;
  // Revenue tier changes trim color: plain → gold trim → bright gold → glowing gold
  // Enemy trim darkens with tier
  const enemyTrimColors = ["#8B2020", "#aa2020", "#cc2020", "#cc0000"];
  const trimColor = isEnemy ? enemyTrimColors[enemyTier]
    : revenueTier >= 3 ? "#FFD700"
    : revenueTier >= 2 ? "#D4A800"
    : revenueTier >= 1 ? "#B8860B"
    : "#A0714F";

  // ── Revenue tier 4: golden aura glow behind building ──
  if (!isEnemy && revenueTier >= 4) {
    const aura = ctx.createRadialGradient(x + w / 2, yAdj + h / 2, 20, x + w / 2, yAdj + h / 2, 80);
    aura.addColorStop(0, "rgba(255,215,0,0.18)");
    aura.addColorStop(1, "rgba(255,215,0,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(x - 40, yAdj - 40, w + 80, h + 80);
  }

  // Main building
  ctx.fillStyle = woodColor;
  ctx.fillRect(x, yAdj, w, h);

  // Revenue tier 3+: gold-plated facade overlay
  if (!isEnemy && revenueTier >= 3) {
    ctx.fillStyle = "rgba(255,215,0,0.12)";
    ctx.fillRect(x, yAdj, w, h);
  }

  // Wood planks (horizontal lines)
  ctx.strokeStyle = roofColor;
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x, yAdj + i * (h / 5));
    ctx.lineTo(x + w, yAdj + i * (h / 5));
    ctx.stroke();
  }

  // HP tier 2+: second story balcony
  if (!isEnemy && hpTier >= 2) {
    const balconyY = yAdj + Math.floor(h * 0.45);
    ctx.fillStyle = COLORS.saloonRoof;
    ctx.fillRect(x - 8, balconyY - 4, w + 16, 6);
    // Balcony railing posts
    ctx.fillStyle = "#A0714F";
    for (let p = 0; p < 5; p++) {
      ctx.fillRect(x - 6 + p * 22, balconyY - 10, 4, 10);
    }
    // Balcony window
    ctx.fillStyle = nightfall && !isEnemy ? "#FFE080" : "#FFD060";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x + w / 2 - 8, balconyY - 18, 16, 12);
    ctx.globalAlpha = 1;
  }

  // HP tier 3: watchtower on top
  if (!isEnemy && hpTier >= 3) {
    const towerY = yAdj - 28;
    ctx.fillStyle = COLORS.saloonWood;
    ctx.fillRect(x + w / 2 - 12, towerY, 24, 28);
    ctx.fillStyle = COLORS.saloonRoof;
    ctx.fillRect(x + w / 2 - 14, towerY - 6, 28, 8);
    // Tower window
    ctx.fillStyle = nightfall ? "#FFE080" : "#FFD060";
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x + w / 2 - 5, towerY + 6, 10, 8);
    ctx.globalAlpha = 1;
    // Tower flag
    ctx.strokeStyle = "#cc2200";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 10, towerY - 6);
    ctx.lineTo(x + w / 2 + 10, towerY - 22);
    ctx.stroke();
    ctx.fillStyle = "#cc2200";
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 10, towerY - 22);
    ctx.lineTo(x + w / 2 + 22, towerY - 17);
    ctx.lineTo(x + w / 2 + 10, towerY - 12);
    ctx.closePath();
    ctx.fill();
  }

  // Roof (false front)
  ctx.fillStyle = roofColor;
  ctx.fillRect(x - 5, yAdj - 20, w + 10, 22);
  ctx.fillStyle = trimColor;
  ctx.fillRect(x - 5, yAdj - 22, w + 10, 4);

  // Revenue tier 1+: gold trim on roof edge
  if (!isEnemy && revenueTier >= 1) {
    ctx.fillStyle = trimColor;
    ctx.fillRect(x - 5, yAdj - 24, w + 10, 3);
    // Small decorative notches
    for (let n = 0; n < 5; n++) {
      ctx.fillRect(x - 3 + n * 18, yAdj - 28, 6, 5);
    }
  }

  // Revenue tier 2+: gold pillars on sides
  if (!isEnemy && revenueTier >= 2) {
    ctx.fillStyle = trimColor;
    ctx.fillRect(x - 2, yAdj, 6, h);
    ctx.fillRect(x + w - 4, yAdj, 6, h);
    // Pillar caps
    ctx.fillRect(x - 4, yAdj - 4, 10, 5);
    ctx.fillRect(x + w - 6, yAdj - 4, 10, 5);
  }

  // ── Enemy tier 1+: iron bars on windows ──
  if (isEnemy && enemyTier >= 1) {
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1.5;
    // Left window bars
    for (let b2 = 0; b2 < 3; b2++) {
      ctx.beginPath();
      ctx.moveTo(x + 8 + b2 * 6, yAdj + 15);
      ctx.lineTo(x + 8 + b2 * 6, yAdj + 29);
      ctx.stroke();
    }
    // Right window bars
    for (let b2 = 0; b2 < 3; b2++) {
      ctx.beginPath();
      ctx.moveTo(x + w - 26 + b2 * 6, yAdj + 15);
      ctx.lineTo(x + w - 26 + b2 * 6, yAdj + 29);
      ctx.stroke();
    }
  }

  // ── Enemy tier 2+: sandbag barricade at base ──
  if (isEnemy && enemyTier >= 2) {
    ctx.fillStyle = "#6B5014";
    ctx.fillRect(x - 8, yAdj + h - 8, w + 16, 8);
    ctx.fillStyle = "#8B6914";
    for (let b2 = 0; b2 < 6; b2++) {
      ctx.beginPath();
      ctx.ellipse(x - 4 + b2 * 15, yAdj + h - 4, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Skull on door
    ctx.fillStyle = "#cc0000";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("☠", x + w / 2, yAdj + h - 10);
    ctx.textAlign = "left";
  }

  // ── Enemy tier 3: dark aura + watchtower ──
  if (isEnemy && enemyTier >= 3) {
    // Dark aura
    const aura = ctx.createRadialGradient(x + w / 2, yAdj + h / 2, 10, x + w / 2, yAdj + h / 2, 70);
    aura.addColorStop(0, "rgba(180,0,0,0.12)");
    aura.addColorStop(1, "rgba(180,0,0,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(x - 40, yAdj - 40, w + 80, h + 80);
    // Watchtower
    const towerY = yAdj - 30;
    ctx.fillStyle = woodColor;
    ctx.fillRect(x + w / 2 - 10, towerY, 20, 30);
    ctx.fillStyle = roofColor;
    ctx.fillRect(x + w / 2 - 12, towerY - 5, 24, 7);
    // Skull flag
    ctx.strokeStyle = "#cc0000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 8, towerY - 5);
    ctx.lineTo(x + w / 2 + 8, towerY - 20);
    ctx.stroke();
    ctx.fillStyle = "#cc0000";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("☠", x + w / 2 + 14, towerY - 12);
    ctx.textAlign = "left";
  }

  // Sign
  ctx.fillStyle = isEnemy ? trimColor : "#6B4423";
  ctx.fillRect(x + 10, yAdj - 14, w - 20, 12);
  ctx.fillStyle = isEnemy ? "#ffaaaa" : COLORS.uiText;
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  const enemySignLabels = ["OUTLAW HQ", "OUTLAW HQ", "BANDIT FORT", "CARTEL KEEP"];
  ctx.fillText(isEnemy ? enemySignLabels[enemyTier] : "YOUR SALOON", x + w / 2, yAdj - 5);
  // Revenue tier 3+: gold stars on sign
  if (!isEnemy && revenueTier >= 3) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "5px monospace";
    ctx.fillText("★ ★ ★", x + w / 2, yAdj - 16);
  }
  ctx.textAlign = "left";

  // Door
  ctx.fillStyle = roofColor;
  ctx.fillRect(x + w / 2 - 10, yAdj + h - 30, 20, 30);

  // Windows — glow brighter at nightfall for player saloon
  const winGlow = nightfall && !isEnemy ? 1.0 : 0.6 + Math.sin(Date.now() * 0.003) * 0.1;
  ctx.fillStyle = nightfall && !isEnemy ? "#FFE080" : "#FFD060";
  ctx.globalAlpha = winGlow;
  ctx.fillRect(x + 8, yAdj + 15, 18, 14);
  ctx.fillRect(x + w - 26, yAdj + 15, 18, 14);
  ctx.globalAlpha = 1;
  // Nightfall: add warm glow around windows
  if (nightfall && !isEnemy) {
    const winGlowGrad1 = ctx.createRadialGradient(x + 17, yAdj + 22, 4, x + 17, yAdj + 22, 22);
    winGlowGrad1.addColorStop(0, "rgba(255,200,60,0.35)");
    winGlowGrad1.addColorStop(1, "rgba(255,200,60,0)");
    ctx.fillStyle = winGlowGrad1;
    ctx.fillRect(x - 5, yAdj + 5, 44, 40);
    const winGlowGrad2 = ctx.createRadialGradient(x + w - 17, yAdj + 22, 4, x + w - 17, yAdj + 22, 22);
    winGlowGrad2.addColorStop(0, "rgba(255,200,60,0.35)");
    winGlowGrad2.addColorStop(1, "rgba(255,200,60,0)");
    ctx.fillStyle = winGlowGrad2;
    ctx.fillRect(x + w - 44, yAdj + 5, 44, 40);
  }

  // Damage cracks
  if (hpFrac < 0.5) {
    ctx.strokeStyle = "#2a1008";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 20, yAdj + 10);
    ctx.lineTo(x + 30, yAdj + 35);
    ctx.lineTo(x + 15, yAdj + 50);
    ctx.stroke();
  }
}

function drawTipi(ctx: CanvasRenderingContext2D, x: number, y: number, hpFrac: number, tier = 1) {
  // Tier scales the tipi: tier1=small, tier2=war camp, tier3=great camp
  const scale = tier === 1 ? 1.0 : tier === 2 ? 1.2 : 1.45;
  const w = Math.round(70 * scale);
  const cx = x + w / 2;
  // Shift y up so base stays on ground
  const yOff = Math.round((scale - 1) * 68);
  const yy = y - yOff;

  const bw = Math.round(30 * scale); // half-width of base
  const ht = Math.round(68 * scale); // height of cone

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx, yy + ht, Math.round(28 * scale), Math.round(8 * scale), 0, 0, Math.PI * 2);
  ctx.fill();

  // Tier 3: dark aura (great camp)
  if (tier >= 3) {
    const aura = ctx.createRadialGradient(cx, yy + ht / 2, 10, cx, yy + ht / 2, 60);
    aura.addColorStop(0, "rgba(180,0,0,0.1)");
    aura.addColorStop(1, "rgba(180,0,0,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(cx - 70, yy - 30, 140, ht + 60);
  }

  // Main tipi cone — hide color darkens with tier
  const hideColors = ["#C8A878", "#B89060", "#A07848"];
  ctx.fillStyle = hideColors[tier - 1];
  ctx.beginPath();
  ctx.moveTo(cx, yy);
  ctx.lineTo(cx - bw, yy + ht);
  ctx.lineTo(cx + bw, yy + ht);
  ctx.closePath();
  ctx.fill();

  // Tipi seam line
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, yy + 4);
  ctx.lineTo(cx, yy + ht);
  ctx.stroke();

  // Decorative bands — more elaborate per tier
  ctx.strokeStyle = "#8B2020";
  ctx.lineWidth = 2;
  // Upper band
  ctx.beginPath();
  ctx.moveTo(cx - Math.round(8 * scale), yy + Math.round(18 * scale));
  ctx.lineTo(cx + Math.round(8 * scale), yy + Math.round(18 * scale));
  ctx.stroke();
  // Mid band with triangles
  ctx.fillStyle = "#8B2020";
  const triCount = tier === 1 ? 5 : tier === 2 ? 7 : 9;
  const triSpacing = Math.round(8 * scale);
  const triOffset = Math.round(triCount / 2) * triSpacing;
  for (let i = 0; i < triCount; i++) {
    const tx = cx - triOffset + i * triSpacing;
    const ty = yy + Math.round(32 * scale);
    const ts = Math.round(4 * scale);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - ts, ty + ts * 2);
    ctx.lineTo(tx + ts, ty + ts * 2);
    ctx.closePath();
    ctx.fill();
  }
  // Lower band
  ctx.strokeStyle = "#4A6FA5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - Math.round(22 * scale), yy + Math.round(52 * scale));
  ctx.lineTo(cx + Math.round(22 * scale), yy + Math.round(52 * scale));
  ctx.stroke();

  // Tier 2+: war paint stripes
  if (tier >= 2) {
    ctx.strokeStyle = "#cc4400";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - Math.round(15 * scale), yy + Math.round(24 * scale));
    ctx.lineTo(cx - Math.round(5 * scale), yy + Math.round(44 * scale));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + Math.round(15 * scale), yy + Math.round(24 * scale));
    ctx.lineTo(cx + Math.round(5 * scale), yy + Math.round(44 * scale));
    ctx.stroke();
  }

  // Smoke hole poles sticking out top
  const poleCount = tier === 1 ? 3 : tier === 2 ? 4 : 5;
  ctx.strokeStyle = "#5C3317";
  ctx.lineWidth = 2;
  const poleAngles = [-0.4, 0, 0.4, -0.7, 0.7];
  for (let i = 0; i < poleCount; i++) {
    const ang = poleAngles[i];
    ctx.beginPath();
    ctx.moveTo(cx + ang * 10, yy + 2);
    ctx.lineTo(cx + ang * 20, yy - Math.round(18 * scale));
    ctx.stroke();
  }

  // Tier 3: totem pole to the left
  if (tier >= 3) {
    const tx = x - 14;
    const ty = yy + ht - 50;
    ctx.fillStyle = "#5C3317";
    ctx.fillRect(tx, ty, 8, 50);
    // Totem faces
    ctx.fillStyle = "#cc4400";
    ctx.fillRect(tx - 2, ty + 4, 12, 10);
    ctx.fillStyle = "#8B2020";
    ctx.fillRect(tx - 2, ty + 20, 12, 10);
    ctx.fillStyle = "#cc4400";
    ctx.fillRect(tx - 2, ty + 36, 12, 10);
    // Eyes
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(tx, ty + 6, 2, 2);
    ctx.fillRect(tx + 6, ty + 6, 2, 2);
    ctx.fillRect(tx, ty + 22, 2, 2);
    ctx.fillRect(tx + 6, ty + 22, 2, 2);
  }

  // Smoke from top
  ctx.fillStyle = "rgba(180,180,180,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx + 2, y - 26, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 4, y - 34, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Door flap (dark opening)
  ctx.fillStyle = "#3d1f0a";
  ctx.beginPath();
  ctx.ellipse(cx, y + 60, 7, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Damage cracks
  if (hpFrac < 0.5) {
    ctx.strokeStyle = "#5C3317";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, y + 25);
    ctx.lineTo(cx - 5, y + 45);
    ctx.stroke();
  }

  // HP bar
  if (hpFrac < 1) {
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y - 12, w, 6);
    ctx.fillStyle = hpFrac > 0.5 ? "#4CAF50" : "#CC2200";
    ctx.fillRect(x, y - 12, w * hpFrac, 6);
  }

  // Label
  ctx.fillStyle = "#F4E4C1";
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  ctx.fillText("TIPI CAMP", cx, y - 16);
  ctx.textAlign = "left";
}

function drawMine(ctx: CanvasRenderingContext2D, x: number, y: number, isEnemy: boolean) {
  const w = 60;
  const woodColor = isEnemy ? "#4a2020" : COLORS.mineShaft;
  const beamColor = isEnemy ? "#6B3030" : COLORS.mineBeam;

  // Mine entrance (dark hole)
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(x + 10, y + 20, 40, 40);

  // Wooden frame
  ctx.fillStyle = woodColor;
  ctx.fillRect(x, y + 15, 10, 45);
  ctx.fillRect(x + 50, y + 15, 10, 45);
  ctx.fillRect(x, y + 15, 60, 10);

  // Beam details
  ctx.strokeStyle = beamColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 20);
  ctx.lineTo(x + 5, y + 55);
  ctx.moveTo(x + 55, y + 20);
  ctx.lineTo(x + 55, y + 55);
  ctx.moveTo(x + 5, y + 20);
  ctx.lineTo(x + 55, y + 20);
  ctx.stroke();

  // Mine cart tracks
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 15, y + 58);
  ctx.lineTo(x + 45, y + 58);
  ctx.moveTo(x + 15, y + 54);
  ctx.lineTo(x + 45, y + 54);
  ctx.stroke();

  // Label
  ctx.fillStyle = COLORS.uiText;
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  ctx.fillText("MINE", x + w / 2, y + 12);
  ctx.textAlign = "left";
}

// ─── Units ────────────────────────────────────────────────────────────────────

// ─── Dead Unit (blood pool + fallen body + axes) ──────────────────────────────

function drawDeadUnit(ctx: CanvasRenderingContext2D, unit: Unit, cam: number) {
  const sx = unit.pos.x - cam;
  const sy = unit.pos.y;
  const isEnemy = unit.team === "enemy";

  // Blood pool
  const poolR = 18 + (unit.type === "marshal" ? 8 : 0);
  const bloodGrad = ctx.createRadialGradient(sx, sy + 4, 2, sx, sy + 4, poolR);
  bloodGrad.addColorStop(0, "rgba(140,0,0,0.9)");
  bloodGrad.addColorStop(0.6, "rgba(100,0,0,0.6)");
  bloodGrad.addColorStop(1, "rgba(60,0,0,0)");
  ctx.fillStyle = bloodGrad;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4, poolR, poolR * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fallen body — rotated 90° sideways
  ctx.save();
  ctx.translate(sx, sy - 10);
  ctx.rotate(Math.PI / 2); // fall to the right

  // Draw a simplified flat body
  const bodyColor = isEnemy ? "#8B2020" : "#4A6FA5";
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-8, -20, 16, 30); // torso
  ctx.fillStyle = isEnemy ? "#E8A060" : "#D4A574";
  ctx.fillRect(-6, -30, 12, 12); // head

  // Axes in eyes (X marks)
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  // Left eye axe
  ctx.beginPath();
  ctx.moveTo(-4, -28); ctx.lineTo(-1, -25);
  ctx.moveTo(-1, -28); ctx.lineTo(-4, -25);
  ctx.stroke();
  // Right eye axe
  ctx.beginPath();
  ctx.moveTo(1, -28); ctx.lineTo(4, -25);
  ctx.moveTo(4, -28); ctx.lineTo(1, -25);
  ctx.stroke();
  // Tiny axe handles
  ctx.strokeStyle = "#6B4423";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2.5, -23); ctx.lineTo(-2.5, -18);
  ctx.moveTo(2.5, -23); ctx.lineTo(2.5, -18);
  ctx.stroke();
  // Axe heads
  ctx.fillStyle = "#aaa";
  ctx.fillRect(-5, -30, 5, 4);
  ctx.fillRect(0, -30, 5, 4);

  ctx.restore();
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: Unit, cam: number, upgrades?: import("./types").UpgradeState) {
  // Dead units: draw blood pool + fallen body
  if (unit.state === "dead") {
    drawDeadUnit(ctx, unit, cam);
    return;
  }

  const sx = unit.pos.x - cam;
  const sy = unit.pos.y;
  const alpha = unit.state === "dying" ? Math.max(0, 1 - unit.deathTimer / 0.6) : 1;
  ctx.globalAlpha = alpha;

  ctx.save();
  if (unit.facing === -1) {
    ctx.translate(sx * 2, 0);
    ctx.scale(-1, 1);
  }

  const isEnemy = unit.team === "enemy";
  // Compute upgrade tier for player units (enemy always tier 0)
  const depTier   = (!isEnemy && upgrades) ? Math.max(upgrades.deputyHp,   upgrades.deputyDamage)   : 0;
  const minTier   = (!isEnemy && upgrades) ? Math.max(upgrades.minerSpeed,  upgrades.minerCapacity)  : 0;
  const gunTier   = (!isEnemy && upgrades) ? Math.max(upgrades.gunslingerRange, upgrades.gunslingerRate) : 0;
  const dynTier   = (!isEnemy && upgrades) ? upgrades.dynamiterRadius : 0;
  const marTier   = (!isEnemy && upgrades) ? upgrades.marshalHp : 0;
  const btyTier   = (!isEnemy && upgrades) ? Math.max(upgrades.bountyHp, upgrades.bountyDamage) : 0;

  switch (unit.type) {
    case "miner":         drawMinerSprite(ctx, sx, sy, unit, isEnemy, minTier); break;
    case "deputy":        drawDeputySprite(ctx, sx, sy, unit, isEnemy, depTier); break;
    case "gunslinger":    drawGunslingerSprite(ctx, sx, sy, unit, isEnemy, gunTier); break;
    case "dynamiter":     drawDynamiterSprite(ctx, sx, sy, unit, isEnemy, dynTier); break;
    case "bounty_hunter": drawBountyHunterSprite(ctx, sx, sy, unit, isEnemy, btyTier); break;
    case "marshal":       drawMarshalSprite(ctx, sx, sy, unit, isEnemy, marTier); break;
    // Native faction
    case "brave":         drawBraveSprite(ctx, sx, sy, unit); break;
    case "archer":        drawArcherSprite(ctx, sx, sy, unit); break;
    case "shaman":        drawShamanSprite(ctx, sx, sy, unit); break;
    case "chief":         drawChiefSprite(ctx, sx, sy, unit); break;
    case "mounted_brave": drawMountedBraveSprite(ctx, sx, sy, unit); break;
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  // HP bar (above unit)
  if (unit.stats.hp < unit.stats.maxHp) {
    const bw = 28;
    ctx.fillStyle = COLORS.hpBg;
    ctx.fillRect(sx - bw / 2, sy - 48, bw, 4);
    const hpFrac = Math.max(0, Math.min(1, unit.stats.hp / unit.stats.maxHp));
    ctx.fillStyle = hpFrac > 0.5 ? COLORS.hpGreen : COLORS.hpRed;
    ctx.fillRect(sx - bw / 2, sy - 48, bw * hpFrac, 4);
  }

  // Gold indicator for miners
  if (unit.type === "miner" && unit.goldCarrying > 0) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`$${unit.goldCarrying}`, sx, sy - 52);
    ctx.textAlign = "left";
  }

  // Selection ring
  if (unit.selected) {
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, 16, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ── Magazine / reload indicator above possessed unit ──
    if (unit.maxMagazine > 0) {
      const dotSize = 5;
      const dotGap = 3;
      const totalW = unit.maxMagazine * (dotSize + dotGap) - dotGap;
      const dotX = sx - totalW / 2;
      const dotY = sy - 56;

      if (unit.reloadTimer > 0) {
        // Reload bar — shows reload progress
        const cfg = { gunslinger: 1.4, dynamiter: 2.0, deputy: 0.9, bounty_hunter: 0.9, marshal: 1.1, miner: 1.0 } as Record<string, number>;
        const reloadTime = cfg[unit.type] ?? 1.0;
        const pct = 1 - unit.reloadTimer / reloadTime;
        const barW = totalW + 4;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(sx - barW / 2, dotY - 2, barW, 7);
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(sx - barW / 2, dotY - 2, barW * pct, 7);
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - barW / 2, dotY - 2, barW, 7);
        ctx.fillStyle = "#FFD700";
        ctx.font = "6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("RELOAD", sx, dotY + 10);
        ctx.textAlign = "left";
      } else {
        // Ammo dots — filled = loaded, empty = spent
        for (let i = 0; i < unit.maxMagazine; i++) {
          const dx = dotX + i * (dotSize + dotGap);
          const loaded = i < unit.magazine;
          ctx.fillStyle = loaded ? "#FFD700" : "rgba(255,215,0,0.2)";
          ctx.strokeStyle = "#FFD700";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(dx + dotSize / 2, dotY, dotSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  }
}

// ─── Pixel-art style unit sprites ─────────────────────────────────────────────

// Enemy color palette
const E = {
  cloth:  "#8B2020",   // red shirt
  skin:   "#E8A060",   // darker skin
  hat:    "#1A1A1A",   // black hat
  hatBand:"#cc2200",   // red band
  badge:  "#cc2200",   // red badge
  leg:    "#2a1a1a",   // dark trousers
  boot:   "#0a0505",   // near-black boots
};

function drawMinerSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false, tier = 0) {
  const bob = unit.state === "walking" || unit.state === "returning" ? Math.sin(unit.animFrame * 1.5) * 2 : 0;
  const mining = unit.state === "mining";
  const armAngle = mining ? Math.sin(unit.animFrame * 2) * 0.8 : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = "#5C4033";
  const legSwing = unit.state === "walking" || unit.state === "returning" ? Math.sin(unit.animFrame * 1.5) * 5 : 0;
  ctx.fillRect(x - 7, y - 14 + bob, 6, 14);
  ctx.fillRect(x + 1, y - 14 + bob, 6, 14);

  // Body
  ctx.fillStyle = isEnemy ? E.cloth : COLORS.playerCloth;
  ctx.fillRect(x - 9, y - 30 + bob, 18, 16);

  // Suspenders
  ctx.strokeStyle = isEnemy ? "#cc4400" : "#8B6914";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 30 + bob);
  ctx.lineTo(x - 2, y - 38 + bob);
  ctx.moveTo(x + 4, y - 30 + bob);
  ctx.lineTo(x + 2, y - 38 + bob);
  ctx.stroke();

  // Arms
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.save();
  ctx.translate(x - 10, y - 26 + bob);
  ctx.rotate(armAngle);
  ctx.fillRect(-3, 0, 6, 12);
  ctx.restore();
  ctx.fillRect(x + 7, y - 26 + bob, 6, 12);

  // Pickaxe
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.save();
  ctx.translate(x - 10, y - 26 + bob);
  ctx.rotate(armAngle - 0.3);
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(-8, 20);
  ctx.stroke();
  ctx.fillStyle = "#aaa";
  ctx.fillRect(-12, 18, 8, 4);
  ctx.restore();

  // Head
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.fillRect(x - 7, y - 42 + bob, 14, 12);

  // Hard hat — tier 0: plain gold, tier 1: gold + headlamp, tier 2+: gold + headlamp + nugget belt
  ctx.fillStyle = isEnemy ? "#8B2020" : (tier >= 1 ? "#FFD700" : "#c8a000");
  ctx.fillRect(x - 9, y - 44 + bob, 18, 5);
  ctx.fillRect(x - 7, y - 48 + bob, 14, 6);
  if (!isEnemy && tier >= 1) {
    // Headlamp
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + 5, y - 46 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,150,0.5)";
    ctx.beginPath();
    ctx.arc(x + 5, y - 46 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!isEnemy && tier >= 2) {
    // Gold nuggets on belt
    ctx.fillStyle = "#FFD700";
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 8 + i * 5, y - 16 + bob, 3, 3);
  }

  // Eyes
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(x - 4, y - 38 + bob, 3, 3);
  ctx.fillRect(x + 1, y - 38 + bob, 3, 3);

  // Gold cart when returning
  if (unit.state === "returning" && unit.goldCarrying > 0) {
    drawMinerCart(ctx, x, y, unit.facing, bob);
  }

  void legSwing;
}

// ─── Miner Gold Cart ──────────────────────────────────────────────────────────

function drawMinerCart(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, bob: number) {
  // Cart is behind the miner (opposite to facing direction)
  const cartX = x - facing * 22;
  const cartY = y - 4 + bob;

  // Rope connecting miner to cart
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - facing * 9, cartY + 2);
  ctx.lineTo(cartX + facing * 8, cartY + 2);
  ctx.stroke();

  // Cart body
  ctx.fillStyle = "#5C3317";
  ctx.fillRect(cartX - 10, cartY - 10, 20, 12);
  // Cart rim
  ctx.strokeStyle = "#3d1f0a";
  ctx.lineWidth = 1;
  ctx.strokeRect(cartX - 10, cartY - 10, 20, 12);

  // Gold nuggets in cart
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(cartX - 7, cartY - 8, 5, 4);
  ctx.fillStyle = "#FFC200";
  ctx.fillRect(cartX - 1, cartY - 9, 5, 5);
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(cartX + 3, cartY - 7, 4, 3);
  // Glint
  ctx.fillStyle = "rgba(255,255,200,0.9)";
  ctx.fillRect(cartX - 6, cartY - 9, 2, 2);

  // Wheels (2 circles)
  ctx.fillStyle = "#3d1f0a";
  ctx.beginPath();
  ctx.arc(cartX - 6, cartY + 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cartX + 6, cartY + 2, 4, 0, Math.PI * 2);
  ctx.fill();
  // Wheel spokes
  ctx.strokeStyle = "#6B4423";
  ctx.lineWidth = 1;
  for (let w = 0; w < 2; w++) {
    const wx = w === 0 ? cartX - 6 : cartX + 6;
    ctx.beginPath();
    ctx.moveTo(wx - 3, cartY + 2); ctx.lineTo(wx + 3, cartY + 2);
    ctx.moveTo(wx, cartY - 1); ctx.lineTo(wx, cartY + 5);
    ctx.stroke();
  }
}

function drawDeputySprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false, tier = 0) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 1.5) * 2 : 0;

  // Drive swing from attackCooldown regardless of state — so animation persists
  // even if enemy dies mid-swing. attackCooldown: 1/attackRate → 0
  const attackPeriod = 1 / unit.stats.attackRate;
  const swingPhase = unit.attackCooldown > 0 ? Math.min(1, unit.attackCooldown / attackPeriod) : 0;
  // swingPhase 1.0 = just punched (arm fully forward), 0 = arm at rest
  const swingAngle = -Math.PI * 0.75 * swingPhase;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = isEnemy ? E.leg : "#3d2b1f";
  ctx.fillRect(x - 7, y - 14 + bob, 6, 14);
  ctx.fillRect(x + 1, y - 14 + bob, 6, 14);
  // Boots
  ctx.fillStyle = isEnemy ? E.boot : "#1a0f08";
  ctx.fillRect(x - 8, y - 4 + bob, 7, 6);
  ctx.fillRect(x + 1, y - 4 + bob, 7, 6);

  // Body (vest) — tier 2+: gold trim on vest
  ctx.fillStyle = isEnemy ? E.cloth : COLORS.playerCloth;
  ctx.fillRect(x - 9, y - 30 + bob, 18, 16);
  if (!isEnemy && tier >= 2) {
    // Gold trim on vest edges
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 9, y - 30 + bob, 18, 16);
  }
  // Badge — tier 0: plain silver, tier 1: silver star, tier 2: gold star, tier 3: gold star + glow
  const badgeColor = isEnemy ? E.badge : (tier >= 2 ? "#FFD700" : tier >= 1 ? "#C0C0C0" : "#888");
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.arc(x, y - 24 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  if (!isEnemy && tier >= 3) {
    // Badge glow
    ctx.fillStyle = "rgba(255,215,0,0.3)";
    ctx.beginPath();
    ctx.arc(x, y - 24 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = isEnemy ? "#ffaaaa" : (tier >= 1 ? "#1a0a00" : "#8B6914");
  ctx.font = "5px monospace";
  ctx.textAlign = "center";
  ctx.fillText(isEnemy ? "✕" : "★", x, y - 22 + bob);
  ctx.textAlign = "left";
  // Tier 3: bandolier
  if (!isEnemy && tier >= 3) {
    ctx.strokeStyle = "#8B6914";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 30 + bob);
    ctx.lineTo(x + 5, y - 14 + bob);
    ctx.stroke();
  }

  // Left arm (idle / back-swing)
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.save();
  ctx.translate(x - 9, y - 28 + bob);
  ctx.rotate(swingPhase > 0 ? swingAngle * 0.3 : 0);
  ctx.fillRect(-7, 0, 7, 12);
  ctx.restore();

  // Right arm — the punching arm with swing arc
  ctx.save();
  ctx.translate(x + 9, y - 28 + bob); // shoulder pivot
  ctx.rotate(swingAngle);              // swing forward (negative = toward enemy)
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.fillRect(0, 0, 7, 14);          // forearm
  // Fist at end of arm
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.beginPath();
  ctx.arc(3, 15, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Impact flash when arm is fully extended
  if (swingPhase > 0.7) {
    ctx.save();
    ctx.globalAlpha = (swingPhase - 0.7) / 0.3;
    ctx.fillStyle = "#FFD700";
    // Estimate fist world position
    const fistX = x + 9 + Math.sin(-swingAngle) * 15;
    const fistY = y - 28 + bob + Math.cos(-swingAngle) * 15;
    ctx.beginPath();
    ctx.arc(fistX, fistY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Head
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.fillRect(x - 7, y - 42 + bob, 14, 12);

  // Sheriff hat — tier 0: plain, tier 1: silver band, tier 2: red plume, tier 3: gold hat
  const hatFill = isEnemy ? E.hat : (tier >= 3 ? "#8B6914" : COLORS.playerHat);
  ctx.fillStyle = hatFill;
  ctx.fillRect(x - 10, y - 44 + bob, 20, 4);
  ctx.fillRect(x - 7, y - 52 + bob, 14, 10);
  // Hat band
  ctx.fillStyle = isEnemy ? E.hatBand : (tier >= 2 ? "#cc2200" : tier >= 1 ? "#C0C0C0" : "#8B6914");
  ctx.fillRect(x - 7, y - 46 + bob, 14, 2);
  // Tier 2+: red plume
  if (!isEnemy && tier >= 2) {
    ctx.fillStyle = "#cc2200";
    ctx.beginPath();
    ctx.ellipse(x + 4, y - 56 + bob, 3, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(x - 4, y - 38 + bob, 3, 3);
  ctx.fillRect(x + 1, y - 38 + bob, 3, 3);
}

function drawGunslingerSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false, tier = 0) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 1.5) * 2 : 0;
  const shooting = unit.state === "attacking";

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = isEnemy ? E.leg : "#3d2b1f";
  ctx.fillRect(x - 7, y - 14 + bob, 6, 14);
  ctx.fillRect(x + 1, y - 14 + bob, 6, 14);
  ctx.fillStyle = isEnemy ? E.boot : "#1a0f08";
  ctx.fillRect(x - 8, y - 4 + bob, 7, 6);
  ctx.fillRect(x + 1, y - 4 + bob, 7, 6);

  // Duster coat — tier 2+: gold trim
  ctx.fillStyle = isEnemy ? "#6B1414" : (tier >= 2 ? "#a07830" : "#8B6914");
  ctx.fillRect(x - 10, y - 32 + bob, 20, 18);
  ctx.fillStyle = isEnemy ? "#4a0e0e" : "#6B4914";
  ctx.fillRect(x - 10, y - 14 + bob, 5, 14);
  ctx.fillRect(x + 5, y - 14 + bob, 5, 14);
  if (!isEnemy && tier >= 2) {
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 10, y - 32 + bob, 20, 18);
  }
  // Tier 1+: dual holsters
  if (!isEnemy && tier >= 1) {
    ctx.fillStyle = "#3d1f0a";
    ctx.fillRect(x - 10, y - 16 + bob, 5, 8);
    ctx.fillRect(x + 5, y - 16 + bob, 5, 8);
    ctx.fillStyle = "#555";
    ctx.fillRect(x - 9, y - 14 + bob, 3, 6);
    ctx.fillRect(x + 6, y - 14 + bob, 3, 6);
  }
  // Tier 3+: gold spurs
  if (!isEnemy && tier >= 3) {
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(x - 10, y - 2 + bob, 5, 2);
    ctx.fillRect(x + 5, y - 2 + bob, 5, 2);
  }

  // Arms + gun
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  if (shooting) {
    ctx.fillRect(x + 7, y - 30 + bob, 18, 5);
    // Gun flash
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(x + 26, y - 28 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(x - 16, y - 30 + bob, 7, 12);
    ctx.fillRect(x + 9, y - 30 + bob, 7, 12);
  }
  // Revolver
  ctx.fillStyle = "#555";
  ctx.fillRect(x + 9, y - 26 + bob, 14, 4);

  // Head
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.fillRect(x - 7, y - 44 + bob, 14, 12);

  // Cowboy hat
  ctx.fillStyle = isEnemy ? E.hat : COLORS.playerHat;
  ctx.fillRect(x - 12, y - 46 + bob, 24, 4);
  ctx.fillRect(x - 8, y - 56 + bob, 16, 12);
  ctx.fillStyle = isEnemy ? E.hatBand : "#8B6914";
  ctx.fillRect(x - 8, y - 48 + bob, 16, 2);

  // Eyes
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(x - 4, y - 40 + bob, 3, 3);
  ctx.fillRect(x + 1, y - 40 + bob, 3, 3);

  // Bandana (enemy gets black, player gets red)
  ctx.fillStyle = isEnemy ? "#1a1a1a" : "#cc2200";
  ctx.fillRect(x - 7, y - 36 + bob, 14, 4);
}

function drawDynamiterSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false, tier = 0) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 1.5) * 2 : 0;
  const throwing = unit.state === "attacking";

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = isEnemy ? E.leg : "#3d2b1f";
  ctx.fillRect(x - 8, y - 14 + bob, 7, 14);
  ctx.fillRect(x + 1, y - 14 + bob, 7, 14);

  // Body (bigger, stocky)
  ctx.fillStyle = isEnemy ? "#5c1010" : "#5c3317";
  ctx.fillRect(x - 11, y - 32 + bob, 22, 18);

  // Bandolier — tier 2+: gold bandolier
  ctx.strokeStyle = (!isEnemy && tier >= 2) ? "#FFD700" : "#8B6914";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 32 + bob);
  ctx.lineTo(x + 5, y - 14 + bob);
  ctx.stroke();
  // TNT sticks — more sticks at higher tiers
  const tntCount = isEnemy ? 3 : 2 + tier;
  for (let i = 0; i < tntCount; i++) {
    ctx.fillStyle = "#cc2200";
    ctx.fillRect(x - 8 + i * 5, y - 28 + bob, 4, 8);
    // Tier 2+: lit fuse glow
    if (!isEnemy && tier >= 2) {
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(x - 7 + i * 5, y - 32 + bob, 2, 5);
    }
  }

  // Arms
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  if (throwing) {
    ctx.fillRect(x + 8, y - 34 + bob, 7, 12);
    // Dynamite in hand
    ctx.fillStyle = "#cc2200";
    ctx.fillRect(x + 14, y - 36 + bob, 5, 10);
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(x + 16, y - 40 + bob, 2, 6);
  } else {
    ctx.fillRect(x - 16, y - 30 + bob, 7, 12);
    ctx.fillRect(x + 9, y - 30 + bob, 7, 12);
  }

  // Head
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.fillRect(x - 8, y - 44 + bob, 16, 12);

  // Bandana over face (enemy gets black)
  ctx.fillStyle = isEnemy ? "#1a1a1a" : "#cc2200";
  ctx.fillRect(x - 8, y - 38 + bob, 16, 6);

  // Hat
  ctx.fillStyle = isEnemy ? E.hat : "#1a0f08";
  ctx.fillRect(x - 11, y - 46 + bob, 22, 4);
  ctx.fillRect(x - 8, y - 56 + bob, 16, 12);

  // Eyes (above bandana)
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(x - 4, y - 42 + bob, 3, 3);
  ctx.fillRect(x + 1, y - 42 + bob, 3, 3);
}

function drawMarshalSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false, tier = 0) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 1.2) * 1.5 : 0;

  // Drive swing from attackCooldown regardless of state
  const attackPeriod = 1 / unit.stats.attackRate;
  const swingPhase = unit.attackCooldown > 0 ? Math.min(1, unit.attackCooldown / attackPeriod) : 0;
  const swingAngle = -Math.PI * 0.65 * swingPhase;

  // Shadow (big)
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (thick)
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(x - 10, y - 18 + bob, 9, 18);
  ctx.fillRect(x + 1, y - 18 + bob, 9, 18);
  ctx.fillStyle = "#1a0a00";
  ctx.fillRect(x - 11, y - 4 + bob, 10, 7);
  ctx.fillRect(x + 1, y - 4 + bob, 10, 7);

  // Long duster coat — tier 2+: gold trim
  ctx.fillStyle = isEnemy ? "#3a1010" : "#4a3020";
  ctx.fillRect(x - 14, y - 38 + bob, 28, 24);
  // Coat tails
  ctx.fillRect(x - 14, y - 14 + bob, 8, 14);
  ctx.fillRect(x + 6, y - 14 + bob, 8, 14);
  if (!isEnemy && tier >= 2) {
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 14, y - 38 + bob, 28, 24);
  }
  // Tier 3: red cape
  if (!isEnemy && tier >= 3) {
    ctx.fillStyle = "#cc2200";
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 38 + bob);
    ctx.lineTo(x - 22, y - 10 + bob);
    ctx.lineTo(x - 14, y - 14 + bob);
    ctx.closePath();
    ctx.fill();
  }

  // Chest plate / vest — tier 1+: silver plate, tier 2+: gold plate
  ctx.fillStyle = isEnemy ? "#6B1414" : (tier >= 2 ? "#8B6914" : tier >= 1 ? "#5a5a5a" : "#6B4423");
  ctx.fillRect(x - 10, y - 36 + bob, 20, 18);
  if (!isEnemy && tier >= 1) {
    // Chest plate overlay
    ctx.fillStyle = tier >= 2 ? "#FFD700" : "#C0C0C0";
    ctx.fillRect(x - 8, y - 36 + bob, 16, 14);
  }

  // Big badge — tier 0: silver, tier 1+: gold
  const marshalBadgeColor = isEnemy ? E.badge : (tier >= 1 ? "#FFD700" : "#C0C0C0");
  ctx.fillStyle = marshalBadgeColor;
  ctx.beginPath();
  ctx.arc(x, y - 28 + bob, 6, 0, Math.PI * 2);
  ctx.fill();
  if (!isEnemy && tier >= 2) {
    ctx.fillStyle = "rgba(255,215,0,0.3)";
    ctx.beginPath();
    ctx.arc(x, y - 28 + bob, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = isEnemy ? "#ffaaaa" : "#1a0a00";
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  ctx.fillText(isEnemy ? "✕" : "★", x, y - 25 + bob);
  ctx.textAlign = "left";

  // Left arm
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.save();
  ctx.translate(x - 12, y - 36 + bob);
  ctx.rotate(swingPhase > 0 ? swingAngle * 0.4 : 0);
  ctx.fillRect(-8, 0, 8, 16);
  ctx.restore();

  // Right arm — big swing with shotgun
  ctx.save();
  ctx.translate(x + 12, y - 36 + bob); // shoulder pivot
  ctx.rotate(swingAngle);
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.fillRect(0, 0, 8, 16);
  // Shotgun along the arm
  ctx.fillStyle = "#555";
  ctx.fillRect(2, -4, 5, 22);
  ctx.fillRect(5, -4, 5, 22);
  // Muzzle flash when fully swung
  if (swingPhase > 0.65) {
    ctx.fillStyle = "#FFD700";
    ctx.globalAlpha = (swingPhase - 0.65) / 0.35;
    ctx.beginPath();
    ctx.arc(5, 22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Head (big)
  ctx.fillStyle = isEnemy ? E.skin : COLORS.playerSkin;
  ctx.fillRect(x - 9, y - 52 + bob, 18, 14);

  // Big marshal hat — tier 3: gold hat
  ctx.fillStyle = isEnemy ? E.hat : (tier >= 3 ? "#8B6914" : "#1a0a00");
  ctx.fillRect(x - 14, y - 54 + bob, 28, 5);
  ctx.fillRect(x - 10, y - 66 + bob, 20, 14);
  // Hat band — tier 1: silver, tier 2: red, tier 3: gold
  ctx.fillStyle = isEnemy ? E.hatBand : (tier >= 3 ? "#FFD700" : tier >= 2 ? "#cc2200" : tier >= 1 ? "#C0C0C0" : "#8B6914");
  ctx.fillRect(x - 10, y - 56 + bob, 20, 2);
  // Tier 1+: plume
  if (!isEnemy && tier >= 1) {
    const plumeColor = tier >= 3 ? "#FFD700" : tier >= 2 ? "#cc2200" : "#C0C0C0";
    ctx.fillStyle = plumeColor;
    ctx.beginPath();
    ctx.ellipse(x + 6, y - 70 + bob, 4, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mustache
  ctx.fillStyle = "#3d2b1f";
  ctx.fillRect(x - 6, y - 42 + bob, 12, 3);

  // Eyes
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(x - 5, y - 48 + bob, 4, 4);
  ctx.fillRect(x + 1, y - 48 + bob, 4, 4);
}

// ─── Bounty Hunter Sprite (Django-inspired) ───────────────────────────────────

function drawBountyHunterSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false, tier = 0) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 1.2) * 2 : 0;
  const attackPeriod = 1 / unit.stats.attackRate;
  const swingPhase = unit.attackCooldown > 0 ? Math.min(1, unit.attackCooldown / attackPeriod) : 0;
  const swingAngle = -Math.PI * 0.7 * swingPhase;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = isEnemy ? "#2a1010" : "#1a0f08";
  ctx.fillRect(x - 8, y - 16 + bob, 7, 16);
  ctx.fillRect(x + 1, y - 16 + bob, 7, 16);
  // Boots
  ctx.fillStyle = isEnemy ? "#1a0808" : "#0f0808";
  ctx.fillRect(x - 9, y - 4 + bob, 8, 6);
  ctx.fillRect(x + 1, y - 4 + bob, 8, 6);

  // Long dark duster coat
  ctx.fillStyle = isEnemy ? "#3a1010" : "#1a1008";
  ctx.fillRect(x - 12, y - 36 + bob, 24, 22);
  // Coat tails
  ctx.fillRect(x - 12, y - 14 + bob, 7, 14);
  ctx.fillRect(x + 5, y - 14 + bob, 7, 14);
  // Coat lapels (lighter inner)
  ctx.fillStyle = isEnemy ? "#5a2020" : "#3a2010";
  ctx.fillRect(x - 6, y - 36 + bob, 5, 18);
  ctx.fillRect(x + 1, y - 36 + bob, 5, 18);

  // Left arm (back-swing)
  ctx.fillStyle = isEnemy ? "#E8A060" : "#D4A574";
  ctx.save();
  ctx.translate(x - 12, y - 34 + bob);
  ctx.rotate(swingPhase > 0 ? swingAngle * 0.3 : 0);
  ctx.fillRect(-7, 0, 7, 14);
  ctx.restore();

  // Right arm — heavy swing
  ctx.save();
  ctx.translate(x + 12, y - 34 + bob);
  ctx.rotate(swingAngle);
  ctx.fillStyle = isEnemy ? "#E8A060" : "#D4A574";
  ctx.fillRect(0, 0, 7, 14);
  // Weapon: chain/cleaver at end of arm
  ctx.fillStyle = "#888";
  ctx.fillRect(1, 12, 5, 8); // handle
  ctx.fillRect(-2, 18, 9, 5); // blade
  // Impact flash
  if (swingPhase > 0.65) {
    ctx.fillStyle = "#FFD700";
    ctx.globalAlpha = (swingPhase - 0.65) / 0.35;
    ctx.beginPath();
    ctx.arc(4, 22, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Head
  ctx.fillStyle = isEnemy ? "#E8A060" : "#D4A574";
  ctx.fillRect(x - 8, y - 50 + bob, 16, 14);

  // Wide-brim hat (pulled low — Django style)
  ctx.fillStyle = isEnemy ? "#1a0808" : "#0a0808";
  ctx.fillRect(x - 14, y - 52 + bob, 28, 4); // wide brim
  ctx.fillRect(x - 9, y - 64 + bob, 18, 14); // crown
  // Hat band
  ctx.fillStyle = isEnemy ? "#8B2020" : "#8B6914";
  ctx.fillRect(x - 9, y - 54 + bob, 18, 2);

  // Sunglasses (iconic)
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x - 6, y - 44 + bob, 5, 3);
  ctx.fillRect(x + 1, y - 44 + bob, 5, 3);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 1, y - 43 + bob);
  ctx.lineTo(x + 1, y - 43 + bob);
  ctx.stroke();

  // Wanted poster badge — tier 1+: gold badge, tier 2+: glowing
  ctx.fillStyle = isEnemy ? "#8B2020" : (tier >= 1 ? "#8B6914" : "#5a4010");
  ctx.fillRect(x - 3, y - 30 + bob, 6, 8);
  if (!isEnemy && tier >= 2) {
    ctx.fillStyle = "rgba(255,215,0,0.25)";
    ctx.fillRect(x - 6, y - 33 + bob, 12, 14);
  }
  ctx.fillStyle = isEnemy ? "#ffaaaa" : (tier >= 1 ? "#FFD700" : "#c8a000");
  ctx.font = "5px monospace";
  ctx.textAlign = "center";
  ctx.fillText("$", x, y - 24 + bob);
  ctx.textAlign = "left";
  // Tier 3: gold chain
  if (!isEnemy && tier >= 3) {
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y - 26 + bob, 8, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
}

// ─── Native Unit Sprites ──────────────────────────────────────────────────────

// Native color palette
const N = {
  skin:    "#C8845A",  // warm copper skin
  hair:    "#1A0A00",  // near-black hair
  cloth:   "#8B4423",  // earth-tone cloth
  feather: "#cc2200",  // red feather
  paint:   "#cc4400",  // war paint orange-red
  blue:    "#2244AA",  // blue paint / beads
  bone:    "#E8D8B0",  // bone/ivory
  horse:   "#8B5E3C",  // horse brown
};

function drawBraveSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 1.5) * 2 : 0;
  const attacking = unit.state === "attacking";

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (breechcloth + leggings)
  ctx.fillStyle = N.cloth;
  ctx.fillRect(x - 6, y - 14 + bob, 5, 14);
  ctx.fillRect(x + 1, y - 14 + bob, 5, 14);
  // Moccasins
  ctx.fillStyle = N.bone;
  ctx.fillRect(x - 7, y - 3 + bob, 6, 5);
  ctx.fillRect(x + 1, y - 3 + bob, 6, 5);

  // Body (bare chest with war paint)
  ctx.fillStyle = N.skin;
  ctx.fillRect(x - 8, y - 28 + bob, 16, 14);
  // War paint stripes
  ctx.fillStyle = N.paint;
  ctx.fillRect(x - 6, y - 26 + bob, 3, 8);
  ctx.fillRect(x + 3, y - 26 + bob, 3, 8);

  // Arms
  ctx.fillStyle = N.skin;
  if (attacking) {
    // Tomahawk swing
    ctx.fillRect(x + 7, y - 30 + bob, 6, 12);
    // Tomahawk
    ctx.fillStyle = "#888";
    ctx.fillRect(x + 12, y - 34 + bob, 6, 4);
    ctx.fillStyle = N.cloth;
    ctx.fillRect(x + 13, y - 30 + bob, 2, 8);
  } else {
    ctx.fillRect(x - 14, y - 28 + bob, 6, 10);
    ctx.fillRect(x + 8, y - 28 + bob, 6, 10);
  }

  // Head
  ctx.fillStyle = N.skin;
  ctx.fillRect(x - 6, y - 40 + bob, 12, 12);
  // Hair (black, tied back)
  ctx.fillStyle = N.hair;
  ctx.fillRect(x - 6, y - 40 + bob, 12, 4);
  ctx.fillRect(x + 5, y - 40 + bob, 3, 10); // braid
  // War paint on face
  ctx.fillStyle = N.paint;
  ctx.fillRect(x - 4, y - 36 + bob, 3, 2);
  ctx.fillRect(x + 1, y - 36 + bob, 3, 2);
  // Feather
  ctx.fillStyle = N.feather;
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 40 + bob);
  ctx.lineTo(x + 2, y - 52 + bob);
  ctx.lineTo(x + 6, y - 48 + bob);
  ctx.closePath();
  ctx.fill();
}

function drawArcherSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 1.5) * 2 : 0;
  const shooting = unit.state === "attacking";

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = N.cloth;
  ctx.fillRect(x - 6, y - 14 + bob, 5, 14);
  ctx.fillRect(x + 1, y - 14 + bob, 5, 14);

  // Body
  ctx.fillStyle = N.skin;
  ctx.fillRect(x - 7, y - 28 + bob, 14, 14);
  // Quiver on back
  ctx.fillStyle = N.cloth;
  ctx.fillRect(x - 10, y - 30 + bob, 4, 14);
  // Arrow shafts in quiver
  ctx.strokeStyle = N.bone;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 9 + i, y - 30 + bob);
    ctx.lineTo(x - 9 + i, y - 38 + bob);
    ctx.stroke();
  }

  // Arms + bow
  ctx.fillStyle = N.skin;
  if (shooting) {
    // Draw bow (left arm extended)
    ctx.strokeStyle = N.cloth;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - 14, y - 26 + bob, 10, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
    // Bowstring
    ctx.strokeStyle = N.bone;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 32 + bob);
    ctx.lineTo(x - 14, y - 20 + bob);
    ctx.stroke();
    // Arrow nocked
    ctx.strokeStyle = N.bone;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 26 + bob);
    ctx.lineTo(x + 8, y - 26 + bob);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 26 + bob);
    ctx.lineTo(x + 4, y - 28 + bob);
    ctx.lineTo(x + 4, y - 24 + bob);
    ctx.closePath();
    ctx.fill();
    // Right arm pulling string
    ctx.fillStyle = N.skin;
    ctx.fillRect(x + 4, y - 28 + bob, 6, 10);
  } else {
    ctx.fillRect(x - 14, y - 28 + bob, 6, 10);
    ctx.fillRect(x + 8, y - 28 + bob, 6, 10);
  }

  // Head
  ctx.fillStyle = N.skin;
  ctx.fillRect(x - 6, y - 40 + bob, 12, 12);
  ctx.fillStyle = N.hair;
  ctx.fillRect(x - 6, y - 40 + bob, 12, 4);
  // Headband
  ctx.fillStyle = N.feather;
  ctx.fillRect(x - 6, y - 38 + bob, 12, 2);
  // Two feathers
  ctx.fillStyle = N.feather;
  ctx.fillRect(x - 2, y - 44 + bob, 2, 6);
  ctx.fillRect(x + 2, y - 46 + bob, 2, 8);
}

function drawShamanSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 1.2) * 1.5 : 0;
  const casting = unit.state === "attacking";

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (long robe)
  ctx.fillStyle = "#4A3020";
  ctx.fillRect(x - 8, y - 20 + bob, 16, 20);
  // Robe fringe
  ctx.strokeStyle = N.bone;
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 7 + i * 3, y + bob);
    ctx.lineTo(x - 7 + i * 3, y + 5 + bob);
    ctx.stroke();
  }

  // Body (robe)
  ctx.fillStyle = "#5C3A20";
  ctx.fillRect(x - 9, y - 34 + bob, 18, 14);
  // Bone necklace
  ctx.strokeStyle = N.bone;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - 28 + bob, 6, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  // Staff arm
  ctx.fillStyle = N.skin;
  if (casting) {
    ctx.fillRect(x + 7, y - 36 + bob, 6, 14);
    // Staff
    ctx.strokeStyle = N.cloth;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 36 + bob);
    ctx.lineTo(x + 10, y - 56 + bob);
    ctx.stroke();
    // Staff totem (skull)
    ctx.fillStyle = N.bone;
    ctx.beginPath();
    ctx.arc(x + 10, y - 58 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0a00";
    ctx.fillRect(x + 7, y - 60 + bob, 2, 2);
    ctx.fillRect(x + 11, y - 60 + bob, 2, 2);
    // Magic glow
    ctx.fillStyle = "rgba(100,200,255,0.4)";
    ctx.beginPath();
    ctx.arc(x + 10, y - 58 + bob, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(x - 14, y - 34 + bob, 6, 12);
    ctx.fillRect(x + 8, y - 34 + bob, 6, 12);
    // Staff at rest
    ctx.strokeStyle = N.cloth;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 34 + bob);
    ctx.lineTo(x - 11, y - 54 + bob);
    ctx.stroke();
    ctx.fillStyle = N.bone;
    ctx.beginPath();
    ctx.arc(x - 11, y - 56 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head
  ctx.fillStyle = N.skin;
  ctx.fillRect(x - 7, y - 46 + bob, 14, 12);
  // Headdress (large feather crown)
  ctx.fillStyle = "#4A3020";
  ctx.fillRect(x - 7, y - 48 + bob, 14, 4);
  // Feathers
  const featherColors = [N.feather, "#FFD700", N.feather, "#FFD700", N.feather];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = featherColors[i];
    ctx.beginPath();
    ctx.moveTo(x - 8 + i * 4, y - 48 + bob);
    ctx.lineTo(x - 10 + i * 4, y - 62 + bob);
    ctx.lineTo(x - 6 + i * 4, y - 58 + bob);
    ctx.closePath();
    ctx.fill();
  }
  // Face paint (blue)
  ctx.fillStyle = N.blue;
  ctx.fillRect(x - 5, y - 44 + bob, 10, 3);
}

function drawChiefSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 1.0) * 1.5 : 0;
  const attacking = unit.state === "attacking";

  // Shadow (big)
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (thick, armored leggings)
  ctx.fillStyle = "#3d2010";
  ctx.fillRect(x - 9, y - 18 + bob, 8, 18);
  ctx.fillRect(x + 1, y - 18 + bob, 8, 18);
  // Moccasins
  ctx.fillStyle = N.bone;
  ctx.fillRect(x - 10, y - 3 + bob, 9, 6);
  ctx.fillRect(x + 1, y - 3 + bob, 9, 6);

  // Body (war chief regalia)
  ctx.fillStyle = "#6B3010";
  ctx.fillRect(x - 12, y - 36 + bob, 24, 18);
  // Chest armor (bone plates)
  ctx.fillStyle = N.bone;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - 8 + i * 6, y - 34 + bob, 4, 12);
  }
  // Red sash
  ctx.fillStyle = N.feather;
  ctx.fillRect(x - 12, y - 22 + bob, 24, 3);

  // Arms
  ctx.fillStyle = N.skin;
  if (attacking) {
    // War club swing
    ctx.fillRect(x + 10, y - 36 + bob, 8, 16);
    // War club
    ctx.fillStyle = N.cloth;
    ctx.fillRect(x + 16, y - 42 + bob, 5, 20);
    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.arc(x + 18, y - 44 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    // Spikes on club
    ctx.fillStyle = N.bone;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      ctx.fillRect(x + 18 + Math.cos(angle) * 5, y - 44 + bob + Math.sin(angle) * 5, 3, 3);
    }
  } else {
    ctx.fillRect(x - 18, y - 36 + bob, 8, 16);
    ctx.fillRect(x + 10, y - 36 + bob, 8, 16);
  }

  // Head (big, imposing)
  ctx.fillStyle = N.skin;
  ctx.fillRect(x - 9, y - 50 + bob, 18, 14);
  // War paint (bold stripes)
  ctx.fillStyle = N.paint;
  ctx.fillRect(x - 7, y - 48 + bob, 14, 3);
  ctx.fillStyle = N.blue;
  ctx.fillRect(x - 7, y - 44 + bob, 14, 3);

  // Grand war bonnet (full eagle feather headdress)
  ctx.fillStyle = "#4A3020";
  ctx.fillRect(x - 9, y - 52 + bob, 18, 5);
  // Many feathers in arc
  const bonnetFeathers = 9;
  for (let i = 0; i < bonnetFeathers; i++) {
    const angle = Math.PI * (0.15 + (i / (bonnetFeathers - 1)) * 0.7);
    const fx = x + Math.cos(angle) * 14;
    const fy = y - 52 + bob - Math.sin(angle) * 20;
    ctx.fillStyle = i % 2 === 0 ? N.feather : N.bone;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 9, y - 52 + bob - Math.sin(angle) * 9);
    ctx.lineTo(fx - 2, fy);
    ctx.lineTo(fx + 2, fy);
    ctx.closePath();
    ctx.fill();
  }
  // Trailing feathers down the back
  ctx.fillStyle = N.feather;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 8, y - 50 + bob + i * 8, 2, 10);
  }
}

function drawMountedBraveSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit) {
  const bob = unit.state === "walking" ? Math.sin(unit.animFrame * 2.0) * 3 : 0;
  const attacking = unit.state === "attacking";

  // Horse shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horse body
  ctx.fillStyle = N.horse;
  ctx.fillRect(x - 20, y - 20 + bob, 40, 20);
  // Horse head
  ctx.fillRect(x + 16, y - 28 + bob, 12, 16);
  // Horse nose
  ctx.fillRect(x + 24, y - 24 + bob, 6, 8);
  // Horse eye
  ctx.fillStyle = "#1a0a00";
  ctx.fillRect(x + 22, y - 26 + bob, 3, 3);
  // Horse mane
  ctx.fillStyle = "#3d1f0a";
  ctx.fillRect(x + 16, y - 30 + bob, 4, 12);
  // Horse tail
  ctx.fillRect(x - 22, y - 22 + bob, 4, 14);

  // Horse legs (galloping animation)
  ctx.fillStyle = N.horse;
  const legSwing = Math.sin(unit.animFrame * 2.0) * 8;
  ctx.fillRect(x - 14, y + bob, 6, 14 + legSwing);
  ctx.fillRect(x - 4, y + bob, 6, 14 - legSwing);
  ctx.fillRect(x + 6, y + bob, 6, 14 + legSwing * 0.5);
  ctx.fillRect(x + 14, y + bob, 6, 14 - legSwing * 0.5);
  // Hooves
  ctx.fillStyle = "#1a0a00";
  ctx.fillRect(x - 14, y + 14 + bob + legSwing, 6, 4);
  ctx.fillRect(x - 4, y + 14 + bob - legSwing, 6, 4);
  ctx.fillRect(x + 6, y + 14 + bob + legSwing * 0.5, 6, 4);
  ctx.fillRect(x + 14, y + 14 + bob - legSwing * 0.5, 6, 4);

  // Rider body
  ctx.fillStyle = N.skin;
  ctx.fillRect(x - 6, y - 38 + bob, 12, 18);
  // War paint
  ctx.fillStyle = N.paint;
  ctx.fillRect(x - 4, y - 36 + bob, 3, 8);
  ctx.fillRect(x + 1, y - 36 + bob, 3, 8);

  // Rider arms
  ctx.fillStyle = N.skin;
  if (attacking) {
    // Spear thrust
    ctx.fillRect(x + 6, y - 38 + bob, 6, 10);
    ctx.strokeStyle = N.bone;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 9, y - 38 + bob);
    ctx.lineTo(x + 30, y - 46 + bob);
    ctx.stroke();
    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(x + 30, y - 46 + bob);
    ctx.lineTo(x + 26, y - 50 + bob);
    ctx.lineTo(x + 26, y - 42 + bob);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(x - 12, y - 38 + bob, 6, 10);
    ctx.fillRect(x + 6, y - 38 + bob, 6, 10);
  }

  // Rider head
  ctx.fillStyle = N.skin;
  ctx.fillRect(x - 6, y - 50 + bob, 12, 12);
  ctx.fillStyle = N.hair;
  ctx.fillRect(x - 6, y - 50 + bob, 12, 4);
  // Feathers (2, streaming back)
  ctx.fillStyle = N.feather;
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 50 + bob);
  ctx.lineTo(x + 14, y - 58 + bob);
  ctx.lineTo(x + 18, y - 52 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 50 + bob);
  ctx.lineTo(x + 10, y - 62 + bob);
  ctx.lineTo(x + 14, y - 56 + bob);
  ctx.closePath();
  ctx.fill();
}

// ─── Projectiles ──────────────────────────────────────────────────────────────

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile, cam: number) {
  const sx = proj.pos.x - cam;
  const sy = proj.pos.y;

  if (proj.type === "bullet") {
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4, 2, Math.atan2(proj.vel.y, proj.vel.x), 0, Math.PI * 2);
    ctx.fill();
    // Trail
    ctx.strokeStyle = "rgba(255,200,0,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - proj.vel.x * 0.03, sy - proj.vel.y * 0.03);
    ctx.stroke();
  } else if (proj.type === "dynamite") {
    // Tumbling stick
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(proj.life * 5);
    ctx.fillStyle = "#cc2200";
    ctx.fillRect(-4, -8, 8, 16);
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(-1, -12, 2, 6);
    ctx.restore();
  }
}

// ─── HUD Gold Pile Icon ───────────────────────────────────────────────────────

function drawHudGoldIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Small pixel-art gold pile: 3 nuggets stacked
  const cx = x + 12, cy = y + 16;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pile base
  ctx.fillStyle = "#8B6914";
  ctx.beginPath();
  ctx.ellipse(cx, cy, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nuggets
  const nuggets = [
    { x: cx - 4, y: cy - 2, w: 5, h: 4, c: "#FFD700" },
    { x: cx + 1, y: cy - 3, w: 5, h: 4, c: "#FFC200" },
    { x: cx - 2, y: cy - 6, w: 4, h: 4, c: "#FFD700" },
  ];
  nuggets.forEach(n => {
    ctx.fillStyle = n.c;
    ctx.fillRect(n.x, n.y, n.w, n.h);
  });

  // Glint
  ctx.fillStyle = "rgba(255,255,200,0.9)";
  ctx.fillRect(cx - 1, cy - 7, 2, 2);
}

// ─── Nightfall Timer Overlay (drawn in game world, top-center) ────────────────

// ─── Level Name Banner (top-left of game world) ──────────────────────────────

function drawLevelName(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!state.levelName) return;
  const isAmbush = state.isAmbushLevel;
  const label = isAmbush ? `⚔ AMBUSH: ${state.levelName.toUpperCase()}` : `⚔ ${state.levelName.toUpperCase()}`;
  ctx.fillStyle = "rgba(10,5,0,0.65)";
  ctx.fillRect(8, 8, 200, 20);
  ctx.strokeStyle = "rgba(139,94,60,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 200, 20);
  ctx.fillStyle = isAmbush ? "#cc8800" : "#F4E4C1";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "left";
  ctx.fillText(label, 14, 22);
}

export function drawNightfallTimer(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number) {
  const NIGHTFALL_TIME = 180;

  if (state.nightfall) {
    // Nightfall active — pulsing banner
    const pulse = 0.85 + 0.15 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "rgba(5,5,20,0.7)";
    ctx.fillRect(canvasW / 2 - 110, 6, 220, 20);
    ctx.strokeStyle = "#4466AA";
    ctx.lineWidth = 1;
    ctx.strokeRect(canvasW / 2 - 110, 6, 220, 20);
    ctx.fillStyle = "#88DDFF";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("🌙 NIGHTFALL  ·  2× GOLD", canvasW / 2, 20);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  } else {
    const remaining = Math.max(0, NIGHTFALL_TIME - state.time);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60).toString().padStart(2, "0");
    const urgent = remaining < 30;

    ctx.fillStyle = urgent ? "rgba(40,15,0,0.75)" : "rgba(10,5,0,0.6)";
    ctx.fillRect(canvasW / 2 - 90, 6, 180, 20);
    ctx.strokeStyle = urgent ? "#FF8800" : "rgba(139,94,60,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(canvasW / 2 - 90, 6, 180, 20);

    if (urgent) {
      const pulse = 0.7 + 0.3 * Math.sin(state.time * 6);
      ctx.globalAlpha = pulse;
    }
    ctx.fillStyle = urgent ? "#FF8800" : "#F4E4C1";
    ctx.font = urgent ? "bold 10px monospace" : "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`☀ NIGHTFALL IN  ${mins}:${secs}`, canvasW / 2, 20);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
}

// ─── Stance Icons ─────────────────────────────────────────────────────────────

function drawStanceIcons(ctx: CanvasRenderingContext2D, stance: Stance, x: number, y: number) {
  const stances: Array<{ id: Stance; label: string; icon: string; color: string }> = [
    { id: "garrison", label: "GARRISON", icon: "⚑", color: "#4A6FA5" },
    { id: "defense",  label: "DEFENSE",  icon: "🛡", color: "#FFD700" },
    { id: "attack",   label: "ATTACK",   icon: "⚔", color: "#CC2200" },
  ];

  const btnW = 58, btnH = 22, gap = 4;

  stances.forEach((s, i) => {
    const bx = x + i * (btnW + gap);
    const by = y;
    const isActive = stance === s.id;

    // Background
    ctx.fillStyle = isActive ? s.color : "rgba(44,24,16,0.8)";
    ctx.globalAlpha = isActive ? 1 : 0.6;
    ctx.fillRect(bx, by, btnW, btnH);

    // Border
    ctx.globalAlpha = 1;
    ctx.strokeStyle = isActive ? s.color : "#555";
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.strokeRect(bx, by, btnW, btnH);

    // Label
    ctx.fillStyle = isActive ? (s.id === "defense" ? "#1a0a00" : "#F4E4C1") : s.color;
    ctx.font = `${isActive ? "bold " : ""}8px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(`${s.icon} ${s.label}`, bx + btnW / 2, by + 14);
    ctx.textAlign = "left";
  });
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

export function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number, gameH: number) {
  const hudY = gameH;
  const hudH = canvasH - gameH;

  // HUD background (wood plank texture)
  ctx.fillStyle = COLORS.uiBg;
  ctx.fillRect(0, hudY, canvasW, hudH);

  // Top border
  ctx.strokeStyle = COLORS.uiBorder;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, hudY);
  ctx.lineTo(canvasW, hudY);
  ctx.stroke();

  // Wood grain lines
  ctx.strokeStyle = "rgba(139,94,60,0.3)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, hudY + i * (hudH / 8));
    ctx.lineTo(canvasW, hudY + i * (hudH / 8));
    ctx.stroke();
  }

  // Gold counter — small gold pile icon + $ amount
  drawHudGoldIcon(ctx, 16, hudY + 10);
  ctx.fillStyle = COLORS.uiGold;
  ctx.font = "bold 18px monospace";
  ctx.fillText(`$${state.gold}`, 44, hudY + 28);

  // Unit count
  const playerCount = state.units.filter(u => u.team === "player" && u.state !== "dead" && u.state !== "dying").length;
  const atCap = playerCount >= MAX_UNITS;
  ctx.fillStyle = atCap ? COLORS.uiRed : COLORS.uiText;
  ctx.font = "10px monospace";
  ctx.fillText(`UNITS: ${playerCount}/${MAX_UNITS}${atCap ? " MAX" : ""}`, 16, hudY + 46);

  // Training progress bar — moved down to avoid overlapping unit count
  if (state.trainingUnit) {
    const pct = state.trainingTime > 0 ? state.trainingProgress / state.trainingTime : 0;
    const barW = 120;
    const bx = 16, by = hudY + 58;
    ctx.fillStyle = COLORS.uiText;
    ctx.font = "8px monospace";
    ctx.fillText(`TRAINING: ${state.trainingUnit.toUpperCase()}`, bx, by - 2);
    ctx.fillStyle = "#333";
    ctx.fillRect(bx, by, barW, 8);
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(bx, by, barW * Math.min(1, pct), 8);
    ctx.strokeStyle = COLORS.uiBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, 8);
    if (state.spawnQueue.length > 0) {
      ctx.fillStyle = "rgba(244,228,193,0.5)";
      ctx.font = "8px monospace";
      ctx.fillText(`+${state.spawnQueue.length} queued`, bx + barW + 4, by + 7);
    }
  }

  // Stance icons — placed below training bar
  drawStanceIcons(ctx, state.stance, 16, hudY + 72);

  // (Nightfall timer is now drawn in the game world area, not here)

  // Unit spawn buttons — only show unlocked units; locked ones show as padlocked silhouettes
  const units: Array<{ type: string; label: string; cost: number; color: string; key: string }> = [
    { type: "miner",         label: "MINER",    cost: 150,  color: "#FFD700", key: "1" },
    { type: "deputy",        label: "DEPUTY",   cost: 200,  color: "#4A6FA5", key: "2" },
    { type: "gunslinger",    label: "GUNSLNGR", cost: 400,  color: "#8B6914", key: "3" },
    { type: "bounty_hunter", label: "BOUNTY H", cost: 500,  color: "#cc8800", key: "4" },
    { type: "dynamiter",     label: "DYNAMITE", cost: 600,  color: "#cc2200", key: "5" },
    { type: "marshal",       label: "MARSHAL",  cost: 1200, color: "#6B4423", key: "6" },
  ];
  // (costs displayed as $ below)

  const btnW = 90, btnH = 70, btnGap = 8;
  const totalW = units.length * (btnW + btnGap) - btnGap;
  const startX = (canvasW - totalW) / 2;

  units.forEach((u, i) => {
    const bx = startX + i * (btnW + btnGap);
    const by = hudY + 10;
    const isUnlocked = state.unlockedUnits.includes(u.type);
    const canAfford = isUnlocked && state.gold >= u.cost;

    if (!isUnlocked) {
      // Locked — dark silhouette with padlock
      ctx.fillStyle = "rgba(10,5,0,0.85)";
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, btnW, btnH);
      ctx.fillStyle = "#444";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(u.label, bx + btnW / 2, by + 16);
      ctx.font = "20px monospace";
      ctx.fillText("🔒", bx + btnW / 2, by + 42);
      ctx.font = "8px monospace";
      ctx.fillStyle = "#555";
      ctx.fillText("LOCKED", bx + btnW / 2, by + 60);
      ctx.textAlign = "left";
      return;
    }

    // Button bg
    ctx.fillStyle = canAfford ? "rgba(60,30,10,0.9)" : "rgba(30,15,5,0.6)";
    ctx.fillRect(bx, by, btnW, btnH);
    ctx.strokeStyle = canAfford ? u.color : "#444";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, btnW, btnH);

    // Unit label
    ctx.fillStyle = canAfford ? u.color : "#666";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(u.label, bx + btnW / 2, by + 16);

    // Cost
    ctx.fillStyle = canAfford ? COLORS.uiGold : "#666";
    ctx.font = "11px monospace";
    ctx.fillText(`$${u.cost}`, bx + btnW / 2, by + 32);

    // Key hint
    ctx.fillStyle = canAfford ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.fillText(`[${u.key}]`, bx + btnW / 2, by + 50);

    ctx.textAlign = "left";
  });

  // Keyboard hints (bottom center)
  ctx.fillStyle = "rgba(244,228,193,0.3)";
  ctx.font = "8px monospace";
  ctx.textAlign = "center";
  ctx.fillText("[G] GARRISON  [D] DEFENSE  [A] ATTACK  [←→] SCROLL", canvasW / 2, hudY + hudH - 4);
  ctx.textAlign = "left";

  // ── Saloon HP bars — both on the RIGHT side, stacked ──
  const enemySaloon = state.buildings.find(b => b.id === "enemy_saloon");
  const playerSaloon = state.buildings.find(b => b.id === "player_saloon");
  const bw = 160;
  const hpX = canvasW - 16 - bw;

  // Enemy gold pile visual (mirrored under enemy saloon)
  if (enemySaloon && !state.isAmbushLevel) {
    drawSaloonGoldPile(ctx, enemySaloon, state.cameraX, state.enemyGold);
  }

  if (enemySaloon) {
    ctx.fillStyle = COLORS.uiText;
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText("ENEMY SALOON", canvasW - 16, hudY + 18);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.hpBg;
    ctx.fillRect(hpX, hudY + 22, bw, 10);
    ctx.fillStyle = COLORS.uiRed;
    ctx.fillRect(hpX, hudY + 22, bw * (enemySaloon.hp / enemySaloon.maxHp), 10);

    // Enemy gold — only on regular levels (ambush = war party, no economy to spy on)
    if (!state.isAmbushLevel) {
      ctx.fillStyle = "rgba(255,215,0,0.7)";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`💰 $${state.enemyGold}`, canvasW - 16, hudY + 44);
      ctx.textAlign = "left";
    }
  }

  if (playerSaloon) {
    ctx.fillStyle = COLORS.uiText;
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText("YOUR SALOON", canvasW - 16, hudY + 46);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.hpBg;
    ctx.fillRect(hpX, hudY + 50, bw, 10);
    ctx.fillStyle = COLORS.hpGreen;
    ctx.fillRect(hpX, hudY + 50, bw * (playerSaloon.hp / playerSaloon.maxHp), 10);
  }
}
