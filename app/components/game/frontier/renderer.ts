// ─── Frontier Wars — Canvas 2D Renderer ───────────────────────────────────────

import type { GameState, Unit, Building, Projectile, GoldPile } from "./types";
import type { Stance } from "./types";
import { COLORS } from "./types";
import { WORLD as W, MAX_UNITS } from "./configs";

// ─── Main Render ──────────────────────────────────────────────────────────────

export function render(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  const gameH = canvasH - W.hudHeight;
  const cam = state.cameraX;

  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);

  // ── Background ──
  drawBackground(ctx, canvasW, gameH, cam, state.time);

  // ── World clip ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvasW, gameH);
  ctx.clip();

  // ── Gold piles ──
  state.goldPiles.forEach(p => drawGoldPile(ctx, p, cam));

  // ── Buildings ──
  state.buildings.forEach(b => drawBuilding(ctx, b, cam));

  // ── Units ──
  state.units.forEach(u => drawUnit(ctx, u, cam));

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
    if (saloon) drawGarrisonOverlay(ctx, saloon, cam, state.time);
  }

  // ── HUD ──
  drawHUD(ctx, state, canvasW, canvasH, gameH);

  ctx.restore();
}

// ─── Background ───────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, cam: number, time: number) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  sky.addColorStop(0, "#1a0a2e");
  sky.addColorStop(0.4, "#7a3520");
  sky.addColorStop(1, "#c2713a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.65);

  // Sun / moon
  const sunX = w * 0.75 - (cam * 0.02) % w;
  ctx.fillStyle = "#FFD060";
  ctx.beginPath();
  ctx.arc(sunX, h * 0.15, 28, 0, Math.PI * 2);
  ctx.fill();
  // Sun glow
  const glow = ctx.createRadialGradient(sunX, h * 0.15, 20, sunX, h * 0.15, 70);
  glow.addColorStop(0, "rgba(255,200,60,0.3)");
  glow.addColorStop(1, "rgba(255,200,60,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, h * 0.15, 70, 0, Math.PI * 2);
  ctx.fill();

  // Distant mountains (parallax layer 1 — slow)
  drawMountains(ctx, w, h, cam * 0.05, "#3d1a0a", 0.55, 5);
  // Mid mountains (parallax layer 2)
  drawMountains(ctx, w, h, cam * 0.12, "#5c2a12", 0.62, 7);

  // Ground
  const groundGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
  groundGrad.addColorStop(0, "#8B5E3C");
  groundGrad.addColorStop(0.3, "#A0714F");
  groundGrad.addColorStop(1, "#6B4423");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);

  // Ground line
  ctx.strokeStyle = "#6B4423";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, W.groundY);
  ctx.lineTo(w, W.groundY);
  ctx.stroke();

  // Cacti (parallax layer 3)
  drawCacti(ctx, w, h, cam * 0.3);

  // Dust particles
  drawDust(ctx, w, h, cam, time);
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

function drawDust(ctx: CanvasRenderingContext2D, w: number, h: number, cam: number, time: number) {
  ctx.fillStyle = "rgba(180,120,60,0.15)";
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
    ctx.fillText(`${pile.gold}g`, sx, sy - size * 0.4 - 4);
    ctx.textAlign = "left";
  }
}

// ─── Garrison Overlay ─────────────────────────────────────────────────────────

function drawGarrisonOverlay(ctx: CanvasRenderingContext2D, saloon: Building, cam: number, time: number) {
  const sx = saloon.pos.x - cam;
  const sy = saloon.pos.y;

  // Muzzle flashes from windows (animated)
  const flash1 = Math.sin(time * 7.3) > 0.6;
  const flash2 = Math.sin(time * 5.1 + 1.2) > 0.7;
  const flash3 = Math.sin(time * 9.0 + 2.4) > 0.65;

  if (flash1) {
    ctx.fillStyle = "#FFD700";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(sx + saloon.width + 4, sy + 22, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (flash2) {
    ctx.fillStyle = "#FFD700";
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(sx + saloon.width + 4, sy + 38, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (flash3) {
    ctx.fillStyle = "#FFD700";
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(sx + saloon.width / 2, sy - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // "GARRISON" label above saloon
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.fillText("⚑ GARRISON", sx + saloon.width / 2, sy - 18);
  ctx.textAlign = "left";
}

// ─── Buildings ────────────────────────────────────────────────────────────────

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, cam: number) {
  const sx = b.pos.x - cam;
  const sy = b.pos.y;

  if (b.type === "mine") {
    drawMine(ctx, sx, sy, b.team === "enemy");
  } else {
    drawSaloon(ctx, sx, sy, b.team === "enemy", b.hp / b.maxHp);
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

function drawSaloon(ctx: CanvasRenderingContext2D, x: number, y: number, isEnemy: boolean, hpFrac: number) {
  const w = 80, h = 80;
  const woodColor = isEnemy ? "#5c2020" : COLORS.saloonWood;
  const roofColor = isEnemy ? "#3d1010" : COLORS.saloonRoof;
  const trimColor = isEnemy ? "#8B2020" : "#A0714F";

  // Main building
  ctx.fillStyle = woodColor;
  ctx.fillRect(x, y, w, h);

  // Wood planks (horizontal lines)
  ctx.strokeStyle = roofColor;
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y + i * (h / 5));
    ctx.lineTo(x + w, y + i * (h / 5));
    ctx.stroke();
  }

  // Roof (false front)
  ctx.fillStyle = roofColor;
  ctx.fillRect(x - 5, y - 20, w + 10, 22);
  ctx.fillStyle = trimColor;
  ctx.fillRect(x - 5, y - 22, w + 10, 4);

  // Sign
  ctx.fillStyle = isEnemy ? "#8B2020" : "#6B4423";
  ctx.fillRect(x + 10, y - 14, w - 20, 12);
  ctx.fillStyle = isEnemy ? "#ffaaaa" : COLORS.uiText;
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.fillText(isEnemy ? "OUTLAW HQ" : "YOUR SALOON", x + w / 2, y - 5);
  ctx.textAlign = "left";

  // Door
  ctx.fillStyle = roofColor;
  ctx.fillRect(x + w / 2 - 10, y + h - 30, 20, 30);

  // Windows
  ctx.fillStyle = "#FFD060";
  ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.003) * 0.1;
  ctx.fillRect(x + 8, y + 15, 18, 14);
  ctx.fillRect(x + w - 26, y + 15, 18, 14);
  ctx.globalAlpha = 1;

  // Damage cracks
  if (hpFrac < 0.5) {
    ctx.strokeStyle = "#2a1008";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 10);
    ctx.lineTo(x + 30, y + 35);
    ctx.lineTo(x + 15, y + 50);
    ctx.stroke();
  }
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

function drawUnit(ctx: CanvasRenderingContext2D, unit: Unit, cam: number) {
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
  switch (unit.type) {
    case "miner":     drawMinerSprite(ctx, sx, sy, unit, isEnemy); break;
    case "deputy":    drawDeputySprite(ctx, sx, sy, unit, isEnemy); break;
    case "gunslinger":drawGunslingerSprite(ctx, sx, sy, unit, isEnemy); break;
    case "dynamiter": drawDynamiterSprite(ctx, sx, sy, unit, isEnemy); break;
    case "marshal":   drawMarshalSprite(ctx, sx, sy, unit, isEnemy); break;
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  // HP bar (above unit)
  if (unit.stats.hp < unit.stats.maxHp) {
    const bw = 28;
    ctx.fillStyle = COLORS.hpBg;
    ctx.fillRect(sx - bw / 2, sy - 48, bw, 4);
    const hpFrac = unit.stats.hp / unit.stats.maxHp;
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

function drawMinerSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false) {
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

  // Hard hat (enemy gets red, player gets gold)
  ctx.fillStyle = isEnemy ? "#8B2020" : "#FFD700";
  ctx.fillRect(x - 9, y - 44 + bob, 18, 5);
  ctx.fillRect(x - 7, y - 48 + bob, 14, 6);

  // Eyes
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(x - 4, y - 38 + bob, 3, 3);
  ctx.fillRect(x + 1, y - 38 + bob, 3, 3);

  void legSwing;
}

function drawDeputySprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false) {
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

  // Body (vest)
  ctx.fillStyle = isEnemy ? E.cloth : COLORS.playerCloth;
  ctx.fillRect(x - 9, y - 30 + bob, 18, 16);
  // Badge (enemy has skull, player has star)
  ctx.fillStyle = isEnemy ? E.badge : COLORS.playerBadge;
  ctx.beginPath();
  ctx.arc(x, y - 24 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isEnemy ? "#ffaaaa" : "#8B6914";
  ctx.font = "5px monospace";
  ctx.textAlign = "center";
  ctx.fillText(isEnemy ? "✕" : "★", x, y - 22 + bob);
  ctx.textAlign = "left";

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

  // Sheriff hat
  ctx.fillStyle = isEnemy ? E.hat : COLORS.playerHat;
  ctx.fillRect(x - 10, y - 44 + bob, 20, 4);
  ctx.fillRect(x - 7, y - 52 + bob, 14, 10);
  // Hat band
  ctx.fillStyle = isEnemy ? E.hatBand : "#8B6914";
  ctx.fillRect(x - 7, y - 46 + bob, 14, 2);

  // Eyes
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(x - 4, y - 38 + bob, 3, 3);
  ctx.fillRect(x + 1, y - 38 + bob, 3, 3);
}

function drawGunslingerSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false) {
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

  // Duster coat (enemy gets dark red, player gets tan)
  ctx.fillStyle = isEnemy ? "#6B1414" : "#8B6914";
  ctx.fillRect(x - 10, y - 32 + bob, 20, 18);
  ctx.fillStyle = isEnemy ? "#4a0e0e" : "#6B4914";
  ctx.fillRect(x - 10, y - 14 + bob, 5, 14);
  ctx.fillRect(x + 5, y - 14 + bob, 5, 14);

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

function drawDynamiterSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false) {
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

  // Bandolier
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 32 + bob);
  ctx.lineTo(x + 5, y - 14 + bob);
  ctx.stroke();
  // TNT sticks on bandolier
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#cc2200";
    ctx.fillRect(x - 8 + i * 5, y - 28 + bob, 4, 8);
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

function drawMarshalSprite(ctx: CanvasRenderingContext2D, x: number, y: number, unit: Unit, isEnemy = false) {
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

  // Long duster coat
  ctx.fillStyle = isEnemy ? "#3a1010" : "#4a3020";
  ctx.fillRect(x - 14, y - 38 + bob, 28, 24);
  // Coat tails
  ctx.fillRect(x - 14, y - 14 + bob, 8, 14);
  ctx.fillRect(x + 6, y - 14 + bob, 8, 14);

  // Chest plate / vest
  ctx.fillStyle = isEnemy ? "#6B1414" : "#6B4423";
  ctx.fillRect(x - 10, y - 36 + bob, 20, 18);

  // Big badge (enemy skull, player star)
  ctx.fillStyle = isEnemy ? E.badge : "#FFD700";
  ctx.beginPath();
  ctx.arc(x, y - 28 + bob, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isEnemy ? "#ffaaaa" : "#8B6914";
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

  // Big marshal hat
  ctx.fillStyle = isEnemy ? E.hat : "#1a0a00";
  ctx.fillRect(x - 14, y - 54 + bob, 28, 5);
  ctx.fillRect(x - 10, y - 66 + bob, 20, 14);
  ctx.fillStyle = isEnemy ? E.hatBand : "#8B6914";
  ctx.fillRect(x - 10, y - 56 + bob, 20, 2);

  // Mustache
  ctx.fillStyle = "#3d2b1f";
  ctx.fillRect(x - 6, y - 42 + bob, 12, 3);

  // Eyes
  ctx.fillStyle = "#2a1a0a";
  ctx.fillRect(x - 5, y - 48 + bob, 4, 4);
  ctx.fillRect(x + 1, y - 48 + bob, 4, 4);
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

  // Gold counter
  ctx.fillStyle = COLORS.uiGold;
  ctx.font = "bold 18px monospace";
  ctx.fillText(`⬡ ${state.gold}g`, 16, hudY + 28);

  // Unit count
  const playerCount = state.units.filter(u => u.team === "player" && u.state !== "dead" && u.state !== "dying").length;
  const atCap = playerCount >= MAX_UNITS;
  ctx.fillStyle = atCap ? COLORS.uiRed : COLORS.uiText;
  ctx.font = "10px monospace";
  ctx.fillText(`UNITS: ${playerCount}/${MAX_UNITS}${atCap ? " MAX" : ""}`, 16, hudY + 46);

  // Training progress bar
  if (state.trainingUnit) {
    const pct = state.trainingTime > 0 ? state.trainingProgress / state.trainingTime : 0;
    const barW = 120;
    const bx = 16, by = hudY + 52;
    ctx.fillStyle = "#333";
    ctx.fillRect(bx, by, barW, 8);
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(bx, by, barW * Math.min(1, pct), 8);
    ctx.strokeStyle = COLORS.uiBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, 8);
    ctx.fillStyle = COLORS.uiText;
    ctx.font = "8px monospace";
    ctx.fillText(`TRAINING: ${state.trainingUnit.toUpperCase()}`, bx, by - 2);
    if (state.spawnQueue.length > 0) {
      ctx.fillStyle = "rgba(244,228,193,0.5)";
      ctx.fillText(`+${state.spawnQueue.length} queued`, bx + barW + 4, by + 7);
    }
  }

  // Stance icons — placed in bottom-left, below training bar, clear of saloon HP
  drawStanceIcons(ctx, state.stance, 16, hudY + 68);

  // Level info
  ctx.fillStyle = COLORS.uiText;
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`LEVEL ${state.level + 1}`, canvasW / 2, hudY + 18);
  ctx.textAlign = "left";

  // Unit spawn buttons
  const units: Array<{ type: string; label: string; cost: number; color: string; key: string }> = [
    { type: "miner",      label: "MINER",    cost: 150,  color: "#FFD700", key: "1" },
    { type: "deputy",     label: "DEPUTY",   cost: 200,  color: "#4A6FA5", key: "2" },
    { type: "gunslinger", label: "GUNSLNGR", cost: 400,  color: "#8B6914", key: "3" },
    { type: "dynamiter",  label: "DYNAMITE", cost: 600,  color: "#cc2200", key: "4" },
    { type: "marshal",    label: "MARSHAL",  cost: 1200, color: "#6B4423", key: "5" },
  ];

  const btnW = 90, btnH = 70, btnGap = 8;
  const totalW = units.length * (btnW + btnGap) - btnGap;
  const startX = (canvasW - totalW) / 2;

  units.forEach((u, i) => {
    const bx = startX + i * (btnW + btnGap);
    const by = hudY + 10;
    const canAfford = state.gold >= u.cost;

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
    ctx.fillText(`${u.cost}g`, bx + btnW / 2, by + 32);

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
