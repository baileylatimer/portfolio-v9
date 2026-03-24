// ─── Frontier Wars — Main Game Component ──────────────────────────────────────

import { useEffect, useRef, useCallback, useState } from "react";
import type { GameState, UnitType, UpgradeState } from "./types";
import { createInitialState, updateGame, queueUnit, selectUnit, setStance, movePossessedUnit, possessedAttack } from "./engine";
import { render } from "./renderer";
import { WORLD, LEVELS, AMBUSH_LEVELS, CAMPAIGN_SEQUENCE, UPGRADE_DEFS } from "./configs";
import type { CampaignEntry } from "./configs";

// ─── Default Upgrades ─────────────────────────────────────────────────────────

const DEFAULT_UPGRADES: UpgradeState = {
  minerSpeed: 0, minerCapacity: 0,
  deputyHp: 0, deputyDamage: 0,
  bountyHp: 0, bountyDamage: 0,
  gunslingerRange: 0, gunslingerRate: 0,
  dynamiterRadius: 0, marshalHp: 0,
  saloonRevenue: 0,
};

// ─── Save / Load (localStorage) ──────────────────────────────────────────────

const SAVE_KEY = "frontier-wars-save-v1";

interface SaveData {
  campaignStep: number;
  currentLevel: number;
  completedLevels: number[];
  upgrades: UpgradeState;
  upgradePoints: number;
  unlockedUnits: string[];
  savedAt: number; // Unix ms timestamp
}

function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { void e; }
}

function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch (e) { void e; return null; }
}

function hasSave(): boolean {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

function formatSaveDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Campaign Map — RDR2 Parchment Style ─────────────────────────────────────

// Fictional territories with RDR2-inspired names and positions on the map
const TERRITORIES = [
  {
    name: "COPPER BASIN",
    region: "The Badlands",
    desc: "Outlaws move in. Drive them out.",
    terrain: "desert",
    // Rough polygon points [x%, y%] of map area
    poly: [[5,55],[22,45],[28,65],[18,80],[5,75]],
    labelPos: [13, 63],
    nodePos: [16, 70],
  },
  {
    name: "RIO SECO",
    region: "The Border Country",
    desc: "Hired guns. Watch your flanks.",
    terrain: "river",
    poly: [[22,45],[40,38],[44,58],[28,65]],
    labelPos: [33, 52],
    nodePos: [34, 56],
  },
  {
    name: "BLACKWOOD COUNTY",
    region: "The Piney Woods",
    desc: "Fast and relentless. Don't let them reach your saloon.",
    terrain: "forest",
    poly: [[40,38],[58,32],[60,52],[44,58]],
    labelPos: [50, 44],
    nodePos: [51, 48],
  },
  {
    name: "CUMBERLAND FLATS",
    region: "The Open Prairie",
    desc: "Rich territory. Your miners earn double.",
    terrain: "plains",
    poly: [[58,32],[76,28],[78,48],[60,52]],
    labelPos: [67, 40],
    nodePos: [68, 44],
  },
  {
    name: "PERDITION",
    region: "The Badlands",
    desc: "They've got dynamite. Keep your units spread out.",
    terrain: "desert",
    poly: [[18,80],[28,65],[44,58],[42,78],[28,88]],
    labelPos: [32, 74],
    nodePos: [33, 78],
  },
  {
    name: "IRON RIDGE",
    region: "The High Country",
    desc: "The Railroad Baron sends his enforcers.",
    terrain: "mountain",
    poly: [[44,58],[60,52],[62,72],[42,78]],
    labelPos: [52, 65],
    nodePos: [53, 69],
  },
  {
    name: "STILLWATER",
    region: "The Northern Reaches",
    desc: "Every outlaw in the territory. Hold the line.",
    terrain: "mountain",
    poly: [[60,52],[78,48],[80,68],[62,72]],
    labelPos: [70, 60],
    nodePos: [71, 64],
  },
  {
    name: "FORT SOVEREIGN",
    region: "The Cartel's Stronghold",
    desc: "The Cartel's final push. This ends today.",
    terrain: "fortress",
    poly: [[76,28],[92,25],[94,48],[78,48]],
    labelPos: [84, 37],
    nodePos: [85, 41],
  },
];

// Terrain color palettes
const TERRAIN_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  desert:   { fill: "#c8a96e", stroke: "#a07830", label: "#5c3010" },
  river:    { fill: "#b8c4a0", stroke: "#8a9870", label: "#3a4820" },
  forest:   { fill: "#a0b888", stroke: "#6a8850", label: "#2a4010" },
  plains:   { fill: "#c4b880", stroke: "#9a8840", label: "#4a3810" },
  mountain: { fill: "#b0a898", stroke: "#807868", label: "#302820" },
  fortress: { fill: "#a89888", stroke: "#786858", label: "#281808" },
};

function CampaignMap({
  currentLevel,
  completedLevels,
  campaignStep,
  onSelectLevel,
}: {
  currentLevel: number;
  completedLevels: number[];
  campaignStep: number;
  onSelectLevel: (level: number) => void;
}) {
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const selectedLevel = hoveredLevel !== null ? hoveredLevel : currentLevel;

  // Map dimensions
  const MAP_W = 820;
  const MAP_H = 480;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, #2a1a0a 0%, #1a0a00 60%, #0a0500 100%)",
        fontFamily: "monospace",
      }}
    >
      {/* ── Title cartouche ── */}
      <div
        className="relative mb-3 px-10 py-2 text-center"
        style={{
          background: "linear-gradient(135deg, #c8a96e 0%, #b8924a 50%, #a07830 100%)",
          border: "2px solid #6B4423",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,200,0.2)",
          clipPath: "polygon(0 0, 100% 0, 97% 100%, 3% 100%)",
        }}
      >
        <div className="text-xs tracking-[0.3em] opacity-60" style={{ color: "#3d1f0a" }}>
          ✦ FRONTIER WARS ✦
        </div>
        <div
          className="text-3xl font-bold tracking-[0.2em]"
          style={{ color: "#1a0a00", textShadow: "1px 1px 0 rgba(255,255,200,0.3)" }}
        >
          TERRITORIES OF THE WEST
        </div>
        <div className="text-xs tracking-widest opacity-50 mt-0.5" style={{ color: "#3d1f0a" }}>
          SELECT YOUR NEXT CAMPAIGN
        </div>
      </div>

      {/* ── Main map area ── */}
      <div className="relative" style={{ width: MAP_W, height: MAP_H }}>

        {/* Parchment background */}
        <svg
          width={MAP_W}
          height={MAP_H}
          style={{ position: "absolute", inset: 0 }}
          viewBox={`0 0 100 100`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Parchment texture via noise filter */}
            <filter id="parchment">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
              <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>
              <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blend"/>
              <feComposite in="blend" in2="SourceGraphic" operator="in"/>
            </filter>
            <filter id="roughEdge">
              <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>

          {/* Base parchment */}
          <rect width="100" height="100" fill="#c8a96e" filter="url(#parchment)"/>
          {/* Aged vignette */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="transparent"/>
            <stop offset="100%" stopColor="rgba(60,30,10,0.5)"/>
          </radialGradient>
          <rect width="100" height="100" fill="url(#vignette)"/>

          {/* Territory polygons */}
          {TERRITORIES.map((t, i) => {
            const isCompleted = completedLevels.includes(i);
            const isCurrent = i === currentLevel;
            const isLocked = i > currentLevel && !completedLevels.includes(i);
            const isHovered = hoveredLevel === i;
            const colors = TERRAIN_COLORS[t.terrain];
            const pts = t.poly.map(([x, y]) => `${x},${y}`).join(" ");

            return (
              <polygon
                key={i}
                points={pts}
                fill={isCompleted ? "#8aaa78" : isLocked ? "#b0a090" : colors.fill}
                stroke={isCurrent || isHovered ? "#8B4423" : colors.stroke}
                strokeWidth={isCurrent || isHovered ? "0.6" : "0.3"}
                opacity={isLocked ? 0.6 : 1}
                style={{ cursor: isLocked ? "default" : "pointer", transition: "all 0.15s" }}
                onClick={() => !isLocked && onSelectLevel(i)}
                onMouseEnter={() => !isLocked && setHoveredLevel(i)}
                onMouseLeave={() => setHoveredLevel(null)}
              />
            );
          })}

          {/* Territory border lines (hand-drawn feel) */}
          {TERRITORIES.map((t, i) => {
            const pts = t.poly.map(([x, y]) => `${x},${y}`).join(" ");
            return (
              <polygon
                key={`border_${i}`}
                points={pts}
                fill="none"
                stroke="rgba(60,30,10,0.25)"
                strokeWidth="0.15"
                strokeDasharray="0.8,0.4"
                filter="url(#roughEdge)"
              />
            );
          })}

          {/* Stagecoach trail — dotted line connecting territory nodes in order */}
          {TERRITORIES.slice(0, -1).map((t, i) => {
            const [x1, y1] = t.nodePos;
            const [x2, y2] = TERRITORIES[i + 1].nodePos;
            const isUnlocked = i < currentLevel || completedLevels.includes(i);
            return (
              <line
                key={`trail_${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isUnlocked ? "#6B4423" : "rgba(107,68,35,0.3)"}
                strokeWidth="0.4"
                strokeDasharray="1.2,0.8"
              />
            );
          })}

          {/* Ambush encounter markers — skull dots on the trail between territories */}
          {/* Ambush 0: between level 1 (Rio Seco) and level 2 (Blackwood County) */}
          {/* Ambush 1: between level 4 (Perdition) and level 5 (Iron Ridge) */}
          {/* Ambush 2: between level 6 (Stillwater) and level 7 (Fort Sovereign) */}
          {[
            { ambushIdx: 0, fromLevel: 1, toLevel: 2, tier: 1 },
            { ambushIdx: 1, fromLevel: 4, toLevel: 5, tier: 2 },
            { ambushIdx: 2, fromLevel: 6, toLevel: 7, tier: 3 },
          ].map(({ ambushIdx, fromLevel, toLevel, tier }) => {
            const [x1, y1] = TERRITORIES[fromLevel].nodePos;
            const [x2, y2] = TERRITORIES[toLevel].nodePos;
            // Place marker at 55% along the trail (slightly past midpoint)
            const mx = x1 + (x2 - x1) * 0.55;
            const my = y1 + (y2 - y1) * 0.55;
            const tierColors = ["#8B6914", "#cc4400", "#cc0000"];
            const color = tierColors[tier - 1];
            // Show as encountered if player has passed this point in the campaign
            const isEncountered = campaignStep > CAMPAIGN_SEQUENCE.findIndex(e => e.kind === "ambush" && e.index === ambushIdx);
            return (
              <g key={`ambush_${ambushIdx}`} opacity={isEncountered ? 0.5 : 1}>
                {/* Glow ring */}
                <circle cx={mx} cy={my} r="2.8" fill={`${color}33`} stroke={color} strokeWidth="0.2"/>
                {/* Inner dot */}
                <circle cx={mx} cy={my} r="1.6" fill={color} stroke="#1a0a00" strokeWidth="0.3"/>
                {/* Skull / feather icon */}
                <text x={mx} y={my + 0.7} textAnchor="middle" fontSize="1.8" style={{ pointerEvents: "none" }}>
                  {tier === 1 ? "🪶" : tier === 2 ? "⚔" : "💀"}
                </text>
                {/* Label */}
                <text x={mx} y={my + 4.2} textAnchor="middle" fontSize="1.0" fill={color} fontFamily="monospace" fontWeight="bold" style={{ pointerEvents: "none" }}>
                  AMBUSH
                </text>
              </g>
            );
          })}

          {/* Territory name labels */}
          {TERRITORIES.map((t, i) => {
            const isLocked = i > currentLevel && !completedLevels.includes(i);
            const [lx, ly] = t.labelPos;
            const colors = TERRAIN_COLORS[t.terrain];
            return (
              <g key={`label_${i}`} opacity={isLocked ? 0.4 : 1}>
                <text
                  x={lx} y={ly - 2}
                  textAnchor="middle"
                  fontSize="1.8"
                  fontWeight="bold"
                  fill={colors.label}
                  fontFamily="monospace"
                  style={{ pointerEvents: "none", letterSpacing: "0.05em" }}
                >
                  {t.name}
                </text>
                <text
                  x={lx} y={ly + 1.5}
                  textAnchor="middle"
                  fontSize="1.1"
                  fill={colors.label}
                  fontFamily="monospace"
                  opacity="0.6"
                  style={{ pointerEvents: "none" }}
                >
                  {t.region}
                </text>
              </g>
            );
          })}

          {/* Territory node markers */}
          {TERRITORIES.map((t, i) => {
            const isCompleted = completedLevels.includes(i);
            const isCurrent = i === currentLevel;
            const isLocked = i > currentLevel && !completedLevels.includes(i);
            const isHovered = hoveredLevel === i;
            const [nx, ny] = t.nodePos;

            return (
              <g
                key={`node_${i}`}
                style={{ cursor: isLocked ? "default" : "pointer" }}
                onClick={() => !isLocked && onSelectLevel(i)}
                onMouseEnter={() => !isLocked && setHoveredLevel(i)}
                onMouseLeave={() => setHoveredLevel(null)}
                opacity={isLocked ? 0.5 : 1}
              >
                {/* Glow for current */}
                {(isCurrent || isHovered) && (
                  <circle cx={nx} cy={ny} r="3.5" fill="rgba(255,215,0,0.25)"/>
                )}
                {/* Node circle */}
                <circle
                  cx={nx} cy={ny} r="2.2"
                  fill={isCompleted ? "#4a8a40" : isCurrent ? "#c8a000" : isLocked ? "#888" : "#8B5E3C"}
                  stroke={isCurrent || isHovered ? "#FFD700" : "#3d1f0a"}
                  strokeWidth="0.4"
                />
                {/* Icon inside node */}
                <text x={nx} y={ny + 0.8} textAnchor="middle" fontSize="2.2" style={{ pointerEvents: "none" }}>
                  {isCompleted ? "✓" : isLocked ? "🔒" : isCurrent ? "★" : `${i + 1}`}
                </text>
              </g>
            );
          })}

          {/* Blood splatter on current territory (if in progress) */}
          {currentLevel > 0 && !completedLevels.includes(currentLevel) && (() => {
            const [nx, ny] = TERRITORIES[currentLevel].nodePos;
            return (
              <g opacity="0.5">
                <circle cx={nx + 1.5} cy={ny - 1} r="1.2" fill="#8B0000"/>
                <circle cx={nx + 2.5} cy={ny + 0.5} r="0.7" fill="#8B0000"/>
                <circle cx={nx + 0.8} cy={ny + 1.8} r="0.5" fill="#8B0000"/>
                <circle cx={nx + 3} cy={ny - 0.5} r="0.4" fill="#8B0000"/>
              </g>
            );
          })()}

          {/* Compass rose — bottom right */}
          <g transform="translate(88, 88)">
            <circle cx="0" cy="0" r="4.5" fill="rgba(200,169,110,0.8)" stroke="#6B4423" strokeWidth="0.3"/>
            {/* N/S/E/W */}
            <text x="0" y="-3.2" textAnchor="middle" fontSize="1.8" fontWeight="bold" fill="#3d1f0a" fontFamily="monospace">N</text>
            <text x="0" y="4.8" textAnchor="middle" fontSize="1.4" fill="#3d1f0a" fontFamily="monospace">S</text>
            <text x="3.5" y="0.5" textAnchor="middle" fontSize="1.4" fill="#3d1f0a" fontFamily="monospace">E</text>
            <text x="-3.5" y="0.5" textAnchor="middle" fontSize="1.4" fill="#3d1f0a" fontFamily="monospace">W</text>
            {/* Cross lines */}
            <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke="#6B4423" strokeWidth="0.2"/>
            <line x1="-2.5" y1="0" x2="2.5" y2="0" stroke="#6B4423" strokeWidth="0.2"/>
            {/* North arrow */}
            <polygon points="0,-2.5 -0.6,-0.5 0.6,-0.5" fill="#8B2020"/>
          </g>

          {/* Scale bar — bottom left */}
          <g transform="translate(5, 92)">
            <rect x="0" y="0" width="12" height="1.2" fill="none" stroke="#6B4423" strokeWidth="0.2"/>
            <rect x="0" y="0" width="6" height="1.2" fill="#6B4423"/>
            <text x="6" y="3.2" textAnchor="middle" fontSize="1.2" fill="#3d1f0a" fontFamily="monospace">50 MILES</text>
          </g>

          {/* Map border — double line */}
          <rect x="1" y="1" width="98" height="98" fill="none" stroke="#6B4423" strokeWidth="0.8"/>
          <rect x="1.8" y="1.8" width="96.4" height="96.4" fill="none" stroke="#6B4423" strokeWidth="0.3"/>
        </svg>
      </div>

      {/* ── Territory info panel (wanted poster style) ── */}
      <div
        className="mt-3 flex items-stretch gap-0"
        style={{ width: MAP_W }}
      >
        {/* Left: territory details */}
        <div
          className="flex-1 px-6 py-3"
          style={{
            background: "linear-gradient(135deg, #c8a96e 0%, #b8924a 100%)",
            border: "2px solid #6B4423",
            borderRight: "1px solid #6B4423",
          }}
        >
          <div className="flex items-baseline gap-3">
            <div
              className="text-xl font-bold tracking-widest"
              style={{ color: "#1a0a00" }}
            >
              {TERRITORIES[selectedLevel].name}
            </div>
            <div className="text-xs tracking-widest opacity-50" style={{ color: "#3d1f0a" }}>
              {TERRITORIES[selectedLevel].region}
            </div>
          </div>
          <div className="text-sm mt-1 italic" style={{ color: "#3d1f0a", opacity: 0.8 }}>
            &ldquo;{TERRITORIES[selectedLevel].desc}&rdquo;
          </div>
          <div className="flex gap-4 mt-2">
            <div className="text-xs" style={{ color: "#3d1f0a", opacity: 0.6 }}>
              TERRITORY {selectedLevel + 1} OF {TERRITORIES.length}
            </div>
            {completedLevels.includes(selectedLevel) && (
              <div className="text-xs font-bold" style={{ color: "#2d6a20" }}>
                ✓ CLAIMED
              </div>
            )}
          </div>
        </div>

        {/* Right: ride out button */}
        <button
          onClick={() => onSelectLevel(currentLevel)}
          className="px-8 flex flex-col items-center justify-center gap-1 transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, #8B4423 0%, #6B2a10 100%)",
            border: "2px solid #6B4423",
            borderLeft: "1px solid #6B4423",
            color: "#FFD700",
            fontFamily: "monospace",
            minWidth: 140,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #a05030 0%, #8B3a20 100%)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #8B4423 0%, #6B2a10 100%)"; }}
        >
          <span className="text-2xl">🤠</span>
          <span className="text-sm font-bold tracking-widest">RIDE OUT</span>
          <span className="text-xs opacity-60">→</span>
        </button>
      </div>
    </div>
  );
}

// ─── Pause Menu Component ─────────────────────────────────────────────────────

function PauseMenu({
  onResume,
  onRestart,
  onSave,
  onQuitToMenu,
}: {
  onResume: () => void;
  onRestart: () => void;
  onSave: () => void;
  onQuitToMenu: () => void;
}) {
  const [showControls, setShowControls] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = () => {
    onSave();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(10,5,0,0.82)", backdropFilter: "blur(2px)" }}
    >
      {/* Parchment card */}
      <div
        className="relative flex flex-col items-center px-12 py-10"
        style={{
          background: "linear-gradient(160deg, #c8a96e 0%, #b8924a 40%, #a07830 100%)",
          border: "3px solid #6B4423",
          boxShadow: "0 0 0 6px rgba(107,68,35,0.3), 0 20px 60px rgba(0,0,0,0.8)",
          minWidth: 340,
          fontFamily: "monospace",
          // Torn-edge feel via clip-path
          clipPath: "polygon(0 2%, 3% 0, 97% 0, 100% 2%, 100% 98%, 97% 100%, 3% 100%, 0 98%)",
        }}
      >
        {/* X close button */}
        <button
          onClick={onResume}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-sm font-bold transition-all duration-150 hover:opacity-100"
          style={{
            color: "#6B4423",
            background: "rgba(107,68,35,0.15)",
            border: "1px solid rgba(107,68,35,0.4)",
            fontFamily: "monospace",
            opacity: 0.7,
          }}
          title="Back to game"
        >
          ✕
        </button>

        {/* Decorative corner stars */}
        <div className="absolute top-3 left-4 text-lg opacity-60" style={{ color: "#6B4423" }}>✦</div>
        <div className="absolute bottom-3 left-4 text-lg opacity-60" style={{ color: "#6B4423" }}>✦</div>
        <div className="absolute bottom-3 right-4 text-lg opacity-60" style={{ color: "#6B4423" }}>✦</div>

        {/* Title */}
        <div className="text-xs tracking-widest mb-1 opacity-60" style={{ color: "#3d1f0a" }}>
          ── FRONTIER WARS ──
        </div>
        <h2
          className="text-4xl font-bold tracking-widest mb-8"
          style={{ color: "#1a0a00", textShadow: "1px 1px 0 rgba(255,255,255,0.2)" }}
        >
          PAUSED
        </h2>

        {/* Menu items */}
        {!showControls ? (
          <div className="flex flex-col gap-3 w-full">
            {/* Save game button — separate from the list so we can show flash */}
            <button
              onClick={handleSave}
              className="flex items-center gap-4 px-5 py-3 text-left transition-all duration-150"
              style={{
                background: savedFlash ? "rgba(255,215,0,0.2)" : "rgba(107,68,35,0.1)",
                border: `1px solid ${savedFlash ? "#FFD700" : "rgba(107,68,35,0.3)"}`,
                color: savedFlash ? "#FFD700" : "#1a0a00",
                fontFamily: "monospace",
                letterSpacing: "0.1em",
                fontSize: 14,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (!savedFlash) (e.currentTarget as HTMLButtonElement).style.background = "rgba(107,68,35,0.35)"; }}
              onMouseLeave={e => { if (!savedFlash) (e.currentTarget as HTMLButtonElement).style.background = "rgba(107,68,35,0.1)"; }}
            >
              <span className="text-xl w-6 text-center opacity-70">{savedFlash ? "✓" : "💾"}</span>
              <span>{savedFlash ? "GAME SAVED!" : "SAVE GAME"}</span>
            </button>

            {[
              { label: "CHARACTER CONTROLS", icon: "⚙", action: () => setShowControls(true) },
              { label: "RESTART LEVEL",       icon: "↺", action: onRestart },
              { label: "QUIT TO MENU",        icon: "⌂", action: onQuitToMenu },
              { label: "BACK TO GAME",        icon: "▶", action: onResume, highlight: true },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex items-center gap-4 px-5 py-3 text-left transition-all duration-150 group"
                style={{
                  background: item.highlight ? "rgba(107,68,35,0.25)" : "rgba(107,68,35,0.1)",
                  border: `1px solid ${item.highlight ? "#6B4423" : "rgba(107,68,35,0.3)"}`,
                  color: "#1a0a00",
                  fontFamily: "monospace",
                  letterSpacing: "0.1em",
                  fontSize: 14,
                  fontWeight: item.highlight ? "bold" : "normal",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(107,68,35,0.35)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = item.highlight ? "rgba(107,68,35,0.25)" : "rgba(107,68,35,0.1)"; }}
              >
                <span className="text-xl w-6 text-center opacity-70">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="w-full">
            <div className="text-sm font-bold tracking-widest mb-4 text-center" style={{ color: "#1a0a00" }}>
              CHARACTER CONTROLS
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs mb-6" style={{ color: "#3d1f0a" }}>
              {[
                ["CLICK UNIT", "Possess / control"],
                ["WASD", "Move possessed unit"],
                ["SPACE", "Attack (when possessed)"],
                ["ESC", "Deselect unit"],
                ["1-5", "Spawn unit type"],
                ["G", "Garrison stance"],
                ["D", "Defense stance"],
                ["A", "Attack stance"],
                ["← →", "Scroll camera"],
                ["P", "Pause / resume"],
              ].map(([key, desc]) => (
                <div key={key} className="flex gap-2 items-start">
                  <span
                    className="px-1.5 py-0.5 text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(107,68,35,0.3)", border: "1px solid rgba(107,68,35,0.5)", color: "#1a0a00", minWidth: 40, textAlign: "center" }}
                  >
                    {key}
                  </span>
                  <span className="opacity-70">{desc}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowControls(false)}
              className="w-full py-2 text-xs tracking-widest"
              style={{ border: "1px solid rgba(107,68,35,0.5)", color: "#1a0a00", background: "rgba(107,68,35,0.15)", fontFamily: "monospace" }}
            >
              ← BACK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Unit Preview Canvas ──────────────────────────────────────────────────────

// Maps upgrade keys to unit types for the preview
const UPGRADE_UNIT_MAP: Record<string, { unit: string; tier: (u: UpgradeState) => number }> = {
  minerSpeed:      { unit: "miner",      tier: u => u.minerSpeed },
  minerCapacity:   { unit: "miner",      tier: u => u.minerCapacity },
  deputyHp:        { unit: "deputy",     tier: u => u.deputyHp },
  deputyDamage:    { unit: "deputy",     tier: u => u.deputyDamage },
  gunslingerRange: { unit: "gunslinger", tier: u => u.gunslingerRange },
  gunslingerRate:  { unit: "gunslinger", tier: u => u.gunslingerRate },
  dynamiterRadius: { unit: "dynamiter",  tier: u => u.dynamiterRadius },
  marshalHp:       { unit: "marshal",    tier: u => u.marshalHp },
  saloonRevenue:   { unit: "saloon",     tier: u => u.saloonRevenue },
};

function UnitPreview({ unitType, tier }: { unitType: string; tier: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 60, 80);
    drawUpgradePreview(ctx, unitType, tier);
  }, [unitType, tier]);

  return <canvas ref={canvasRef} width={60} height={80} style={{ imageRendering: "pixelated" }} />;
}

function drawUpgradePreview(ctx: CanvasRenderingContext2D, unitType: string, tier: number) {
  const cx = 30, cy = 62; // center x, ground y

  if (unitType === "saloon") {
    // Saloon upgrade: gets fancier sign + gold trim
    ctx.fillStyle = "#5c3317";
    ctx.fillRect(8, 20, 44, 42);
    ctx.fillStyle = "#3d1f0a";
    ctx.fillRect(5, 10, 50, 12);
    // Gold trim based on tier
    ctx.fillStyle = tier >= 1 ? "#FFD700" : "#8B6914";
    ctx.fillRect(5, 8, 50, 3);
    ctx.fillStyle = "#FFD060";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(14, 22, 10, 8);
    ctx.fillRect(36, 22, 10, 8);
    ctx.globalAlpha = 1;
    // Extra decorations per tier
    if (tier >= 2) {
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(5, 22, 3, 40);
      ctx.fillRect(52, 22, 3, 40);
    }
    if (tier >= 3) {
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.fillText("★★★", cx, 18);
      ctx.textAlign = "left";
    }
    return;
  }

  // ── Miner ──
  if (unitType === "miner") {
    // Legs
    ctx.fillStyle = "#5C4033";
    ctx.fillRect(cx - 7, cy - 14, 6, 14);
    ctx.fillRect(cx + 1, cy - 14, 6, 14);
    // Body
    ctx.fillStyle = "#4A6FA5";
    ctx.fillRect(cx - 9, cy - 30, 18, 16);
    // Arms
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(cx - 16, cy - 28, 7, 12);
    ctx.fillRect(cx + 9, cy - 28, 7, 12);
    // Head
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(cx - 7, cy - 42, 14, 12);
    // Hard hat — upgrades: plain → gold → gold+lamp → gold+lamp+nuggets
    const hatColor = tier >= 1 ? "#FFD700" : "#888";
    ctx.fillStyle = hatColor;
    ctx.fillRect(cx - 9, cy - 44, 18, 5);
    ctx.fillRect(cx - 7, cy - 48, 14, 6);
    if (tier >= 2) {
      // Headlamp
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx + 5, cy - 46, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,150,0.5)";
      ctx.beginPath();
      ctx.arc(cx + 5, cy - 46, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (tier >= 3) {
      // Gold nuggets on belt
      ctx.fillStyle = "#FFD700";
      for (let i = 0; i < 4; i++) ctx.fillRect(cx - 8 + i * 5, cy - 16, 3, 3);
    }
    return;
  }

  // ── Deputy ──
  if (unitType === "deputy") {
    ctx.fillStyle = "#3d2b1f";
    ctx.fillRect(cx - 7, cy - 14, 6, 14);
    ctx.fillRect(cx + 1, cy - 14, 6, 14);
    ctx.fillStyle = "#4A6FA5";
    ctx.fillRect(cx - 9, cy - 30, 18, 16);
    // Badge — upgrades: plain circle → star → gold star → gold star + bandolier
    const badgeColor = tier >= 2 ? "#FFD700" : tier >= 1 ? "#C0C0C0" : "#888";
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(cx, cy - 24, 4, 0, Math.PI * 2);
    ctx.fill();
    if (tier >= 1) {
      ctx.fillStyle = "#1a0a00";
      ctx.font = "6px monospace";
      ctx.textAlign = "center";
      ctx.fillText("★", cx, cy - 22);
      ctx.textAlign = "left";
    }
    if (tier >= 3) {
      // Bandolier
      ctx.strokeStyle = "#8B6914";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy - 30);
      ctx.lineTo(cx + 5, cy - 14);
      ctx.stroke();
    }
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(cx - 16, cy - 28, 7, 12);
    ctx.fillRect(cx + 9, cy - 28, 7, 12);
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(cx - 7, cy - 42, 14, 12);
    // Hat — plain → silver band → red plume → gold hat
    const hatColor2 = tier >= 3 ? "#FFD700" : "#1a0a00";
    ctx.fillStyle = hatColor2;
    ctx.fillRect(cx - 10, cy - 44, 20, 4);
    ctx.fillRect(cx - 7, cy - 52, 14, 10);
    ctx.fillStyle = tier >= 2 ? "#cc2200" : "#8B6914";
    ctx.fillRect(cx - 7, cy - 46, 14, 2);
    if (tier >= 2) {
      // Red plume
      ctx.fillStyle = "#cc2200";
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy - 56, 3, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // ── Gunslinger ──
  if (unitType === "gunslinger") {
    ctx.fillStyle = "#3d2b1f";
    ctx.fillRect(cx - 7, cy - 14, 6, 14);
    ctx.fillRect(cx + 1, cy - 14, 6, 14);
    // Duster — upgrades: plain → dual holsters → gold spurs → gold-trimmed duster
    const dusterColor = tier >= 3 ? "#8B6914" : "#6B4914";
    ctx.fillStyle = dusterColor;
    ctx.fillRect(cx - 10, cy - 32, 20, 18);
    if (tier >= 1) {
      // Dual holsters
      ctx.fillStyle = "#3d1f0a";
      ctx.fillRect(cx - 10, cy - 16, 5, 8);
      ctx.fillRect(cx + 5, cy - 16, 5, 8);
      ctx.fillStyle = "#555";
      ctx.fillRect(cx - 9, cy - 14, 3, 6);
      ctx.fillRect(cx + 6, cy - 14, 3, 6);
    }
    if (tier >= 2) {
      // Gold spurs
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(cx - 10, cy - 2, 5, 2);
      ctx.fillRect(cx + 5, cy - 2, 5, 2);
    }
    if (tier >= 3) {
      // Gold trim on duster
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 10, cy - 32, 20, 18);
    }
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(cx - 16, cy - 30, 7, 12);
    ctx.fillRect(cx + 9, cy - 30, 7, 12);
    ctx.fillStyle = "#555";
    ctx.fillRect(cx + 9, cy - 26, 14, 4);
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(cx - 7, cy - 44, 14, 12);
    ctx.fillStyle = "#1a0a00";
    ctx.fillRect(cx - 12, cy - 46, 24, 4);
    ctx.fillRect(cx - 8, cy - 56, 16, 12);
    ctx.fillStyle = "#8B6914";
    ctx.fillRect(cx - 8, cy - 48, 16, 2);
    return;
  }

  // ── Dynamiter ──
  if (unitType === "dynamiter") {
    ctx.fillStyle = "#3d2b1f";
    ctx.fillRect(cx - 8, cy - 14, 7, 14);
    ctx.fillRect(cx + 1, cy - 14, 7, 14);
    ctx.fillStyle = "#5c3317";
    ctx.fillRect(cx - 11, cy - 32, 22, 18);
    // Bandolier — upgrades: plain → extra TNT → lit fuse glow → golden bandolier
    const bandColor = tier >= 3 ? "#FFD700" : "#8B6914";
    ctx.strokeStyle = bandColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy - 32);
    ctx.lineTo(cx + 5, cy - 14);
    ctx.stroke();
    const tntCount = 2 + tier;
    for (let i = 0; i < tntCount; i++) {
      ctx.fillStyle = "#cc2200";
      ctx.fillRect(cx - 8 + i * 5, cy - 28, 4, 8);
      if (tier >= 2) {
        // Lit fuse glow
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(cx - 7 + i * 5, cy - 32, 2, 5);
      }
    }
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(cx - 16, cy - 30, 7, 12);
    ctx.fillRect(cx + 9, cy - 30, 7, 12);
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(cx - 8, cy - 44, 16, 12);
    ctx.fillStyle = "#cc2200";
    ctx.fillRect(cx - 8, cy - 38, 16, 6);
    ctx.fillStyle = "#1a0f08";
    ctx.fillRect(cx - 11, cy - 46, 22, 4);
    ctx.fillRect(cx - 8, cy - 56, 16, 12);
    return;
  }

  // ── Marshal ──
  if (unitType === "marshal") {
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(cx - 10, cy - 18, 9, 18);
    ctx.fillRect(cx + 1, cy - 18, 9, 18);
    // Long duster — upgrades: plain → silver armor → gold armor → full gold + cape
    const coatColor = tier >= 2 ? "#6B4423" : "#4a3020";
    ctx.fillStyle = coatColor;
    ctx.fillRect(cx - 14, cy - 38, 28, 24);
    if (tier >= 1) {
      // Silver chest plate
      ctx.fillStyle = tier >= 2 ? "#FFD700" : "#C0C0C0";
      ctx.fillRect(cx - 8, cy - 36, 16, 14);
    }
    // Badge
    const badgeColor2 = tier >= 2 ? "#FFD700" : "#C0C0C0";
    ctx.fillStyle = badgeColor2;
    ctx.beginPath();
    ctx.arc(cx, cy - 28, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0a00";
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("★", cx, cy - 25);
    ctx.textAlign = "left";
    if (tier >= 3) {
      // Cape
      ctx.fillStyle = "#cc2200";
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 38);
      ctx.lineTo(cx - 20, cy - 10);
      ctx.lineTo(cx - 14, cy - 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(cx - 9, cy - 52, 18, 14);
    // Hat — plain → silver plume → gold plume → full gold
    const hatColor3 = tier >= 3 ? "#FFD700" : "#1a0a00";
    ctx.fillStyle = hatColor3;
    ctx.fillRect(cx - 14, cy - 54, 28, 5);
    ctx.fillRect(cx - 10, cy - 66, 20, 14);
    ctx.fillStyle = tier >= 1 ? "#C0C0C0" : "#8B6914";
    ctx.fillRect(cx - 10, cy - 56, 20, 2);
    if (tier >= 1) {
      // Plume — silver → red → gold
      const plumeColor = tier >= 3 ? "#FFD700" : tier >= 2 ? "#cc2200" : "#C0C0C0";
      ctx.fillStyle = plumeColor;
      ctx.beginPath();
      ctx.ellipse(cx + 6, cy - 70, 4, 10, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
}

// ─── Mission Briefing — Parchment Wanted Poster ───────────────────────────────

function MissionBriefing({
  entry,
  onBegin,
}: {
  entry: CampaignEntry;
  onBegin: () => void;
}) {
  const cfg = entry.kind === "ambush" ? AMBUSH_LEVELS[entry.index] : LEVELS[entry.index];
  const isAmbush = entry.kind === "ambush";
  const tier = isAmbush ? (cfg.ambushTier ?? 1) : 0;

  // Ambush tier flavor
  const ambushIcons = ["🪶", "⚔️", "🔥"];
  const ambushColors = ["#8B6914", "#cc4400", "#cc0000"];
  const accentColor = isAmbush ? ambushColors[tier - 1] : "#8B4423";

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, #1a0a00 0%, #0a0500 100%)",
        fontFamily: "monospace",
      }}
    >
      {/* Parchment poster */}
      <div
        className="relative flex flex-col"
        style={{
          width: 560,
          background: "linear-gradient(160deg, #d4b07a 0%, #c8a060 30%, #b89050 70%, #a07830 100%)",
          boxShadow: "0 0 0 3px #6B4423, 0 0 0 8px rgba(107,68,35,0.3), 0 30px 80px rgba(0,0,0,0.9)",
          // Torn parchment edges
          clipPath: "polygon(1% 0%, 99% 1%, 100% 98%, 98% 100%, 2% 99%, 0% 2%)",
        }}
      >
        {/* Top decorative band */}
        <div
          className="w-full py-2 text-center text-xs tracking-[0.4em] font-bold"
          style={{ background: accentColor, color: "#F4E4C1", letterSpacing: "0.4em" }}
        >
          {isAmbush ? `⚠ AMBUSH ENCOUNTER ⚠` : "── MISSION BRIEFING ──"}
        </div>

        {/* Main content */}
        <div className="px-10 py-8">
          {/* Icon + title */}
          <div className="text-center mb-6">
            {isAmbush && (
              <div className="text-5xl mb-3">{ambushIcons[tier - 1]}</div>
            )}
            <div className="text-xs tracking-widest mb-2 opacity-60" style={{ color: "#3d1f0a" }}>
              {isAmbush ? `AMBUSH ${["I", "II", "III"][tier - 1]} OF III` : `TERRITORY ${entry.index + 1} OF ${LEVELS.length}`}
            </div>
            <h2
              className="text-3xl font-bold tracking-wider mb-1"
              style={{ color: "#1a0a00", textShadow: "1px 1px 0 rgba(255,255,200,0.3)" }}
            >
              {cfg.name}
            </h2>
            <div className="text-sm italic opacity-70" style={{ color: "#3d1f0a" }}>
              {cfg.subtitle}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: accentColor, opacity: 0.4 }} />
            <div className="text-sm" style={{ color: accentColor }}>✦</div>
            <div className="flex-1 h-px" style={{ background: accentColor, opacity: 0.4 }} />
          </div>

          {/* Lore text */}
          {cfg.lore && cfg.lore.length > 0 && (
            <div className="mb-6 space-y-2">
              {cfg.lore.map((line, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: "#2a1008", opacity: 0.85 }}>
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Enemy intel box */}
          <div
            className="mb-6 px-4 py-3"
            style={{
              background: "rgba(60,30,10,0.15)",
              border: `1px solid ${accentColor}`,
              borderLeft: `3px solid ${accentColor}`,
            }}
          >
            <div className="text-xs tracking-widest font-bold mb-2" style={{ color: accentColor }}>
              {isAmbush ? "ENEMY FORCES" : "OBJECTIVE"}
            </div>
            {isAmbush ? (
              <div className="text-xs space-y-1" style={{ color: "#2a1008" }}>
                {Object.entries(cfg.enemyUnits).map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <span className="capitalize opacity-80">{type.replace("_", " ")}</span>
                    <span className="font-bold">{count}×</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs" style={{ color: "#2a1008", opacity: 0.8 }}>
                Destroy the enemy saloon to claim this territory.
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: accentColor, opacity: 0.3 }} />
            <div className="text-xs opacity-40" style={{ color: "#3d1f0a" }}>FRONTIER WARS</div>
            <div className="flex-1 h-px" style={{ background: accentColor, opacity: 0.3 }} />
          </div>

          {/* Begin button */}
          <div className="flex justify-center">
            <button
              onClick={onBegin}
              className="px-12 py-3 text-lg font-bold tracking-widest transition-all duration-200 hover:scale-105"
              style={{
                background: accentColor,
                color: "#F4E4C1",
                fontFamily: "monospace",
                boxShadow: `0 0 20px ${accentColor}66`,
                border: `2px solid ${accentColor}`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = ""; }}
            >
              {isAmbush ? "FIGHT →" : "RIDE OUT →"}
            </button>
          </div>
        </div>

        {/* Bottom band */}
        <div
          className="w-full py-1.5 text-center text-xs tracking-widest opacity-50"
          style={{ background: "rgba(60,30,10,0.2)", color: "#3d1f0a" }}
        >
          {isAmbush ? cfg.enemyLabel ?? "ENEMY CAMP" : `STARTING GOLD: $${cfg.startGold}`}
        </div>
      </div>
    </div>
  );
}

// ─── Upgrade Screen Component ─────────────────────────────────────────────────

function UpgradeScreen({
  upgrades,
  upgradePoints,
  onUpgrade,
  onContinue,
}: {
  upgrades: UpgradeState;
  upgradePoints: number;
  onUpgrade: (key: keyof UpgradeState) => void;
  onContinue: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto py-8"
      style={{ background: "rgba(0,0,0,0.92)", fontFamily: "monospace" }}>
      <div className="text-center mb-6">
        <div className="text-xs tracking-widest mb-2" style={{ color: "#8B6914" }}>BETWEEN ROUNDS</div>
        <h2 className="text-4xl font-bold tracking-widest" style={{ color: "#FFD700", textShadow: "0 0 20px #FFD700" }}>
          UPGRADES
        </h2>
        <div className="text-sm mt-2" style={{ color: "#F4E4C1" }}>
          Upgrade Points: <span style={{ color: "#FFD700", fontWeight: "bold" }}>{upgradePoints}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-3xl w-full px-4">
        {UPGRADE_DEFS.map(def => {
          const current = upgrades[def.key];
          const maxed = current >= def.maxLevel;
          const canAfford = upgradePoints >= def.cost;
          const unitInfo = UPGRADE_UNIT_MAP[def.key];
          const previewTier = unitInfo ? unitInfo.tier(upgrades) : 0;
          const previewUnit = unitInfo?.unit ?? "miner";

          return (
            <div
              key={def.key}
              className="border p-3 flex gap-3 items-start"
              style={{ borderColor: maxed ? "#4CAF50" : "#8B5E3C", background: "rgba(44,24,16,0.8)" }}
            >
              {/* Unit preview */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <UnitPreview unitType={previewUnit} tier={previewTier} />
                <div className="text-xs mt-1 text-center" style={{ color: "#8B6914", fontSize: 9 }}>
                  LVL {previewTier}
                </div>
              </div>

              {/* Upgrade info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-sm font-bold" style={{ color: maxed ? "#4CAF50" : "#FFD700" }}>
                    {def.label}
                  </div>
                  <div className="text-xs ml-2 flex-shrink-0" style={{ color: "#8B6914" }}>
                    {def.cost}pt
                  </div>
                </div>
                <div className="text-xs opacity-60 mb-2" style={{ color: "#F4E4C1" }}>
                  {def.description}
                </div>

                {/* Level pips */}
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: def.maxLevel }).map((_, i) => (
                    <div
                      key={i}
                      className="h-2 flex-1 rounded"
                      style={{ background: i < current ? "#FFD700" : "#333" }}
                    />
                  ))}
                </div>

                <button
                  onClick={() => !maxed && canAfford && onUpgrade(def.key)}
                  disabled={maxed || !canAfford}
                  className="w-full py-1 text-xs tracking-widest border transition-all duration-150"
                  style={{
                    borderColor: maxed ? "#4CAF50" : canAfford ? "#FFD700" : "#444",
                    color: maxed ? "#4CAF50" : canAfford ? "#FFD700" : "#555",
                    background: "transparent",
                    cursor: maxed || !canAfford ? "not-allowed" : "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  {maxed ? "MAXED" : `UPGRADE (${def.cost}pt)`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onContinue}
        className="mt-6 border-2 px-10 py-3 text-lg tracking-widest font-bold transition-all duration-200"
        style={{ borderColor: "#FFD700", color: "#FFD700", fontFamily: "monospace" }}
      >
        CONTINUE →
      </button>
    </div>
  );
}

// ─── Victory Scene Component ─────────────────────────────────────────────────

function VictoryScene({
  level,
  onContinue,
  isFinalLevel,
}: {
  level: number;
  onContinue: () => void;
  isFinalLevel: boolean;
}) {
  const [phase, setPhase] = useState(0);

  // Cinematic phases: 0=fade in, 1=title, 2=quote, 3=buttons
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setPhase(3), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const levelQuotes = [
    "The dust settles. The outlaws scatter. This land is yours now.",
    "Another saloon burns. Another legend grows.",
    "They said you couldn't take the canyon. They were wrong.",
    "Gold in your pocket, blood on the ground. That's the frontier.",
    "The marshal's star shines bright over the badlands tonight.",
    "Word spreads fast out west. Fear your name.",
    "Six territories down. One left standing.",
    "The frontier is yours, cowboy. Every last inch of it.",
  ];

  const quote = levelQuotes[Math.min(level, levelQuotes.length - 1)];

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: isFinalLevel
          ? "radial-gradient(ellipse at center, #3a1a00 0%, #1a0a00 40%, #000 100%)"
          : "radial-gradient(ellipse at center, #1a0a2e 0%, #0a0510 60%, #000 100%)",
        fontFamily: "monospace",
        transition: "opacity 0.4s",
        opacity: phase >= 1 ? 1 : 0,
      }}
    >
      {/* Stars / sparks background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: isFinalLevel ? 60 : 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              left: `${(i * 17.3) % 100}%`,
              top: `${(i * 13.7) % 100}%`,
              background: isFinalLevel ? "#FFD700" : "#F4E4C1",
              opacity: 0.3 + (i % 5) * 0.1,
              animation: `pulse ${1.5 + (i % 4) * 0.5}s ease-in-out infinite alternate`,
              animationDelay: `${(i % 10) * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-8 max-w-2xl">

        {/* Badge / icon */}
        <div
          className="text-8xl mb-6"
          style={{
            transition: "transform 0.8s cubic-bezier(0.34,1.56,0.64,1), opacity 0.6s",
            transform: phase >= 1 ? "scale(1) rotate(0deg)" : "scale(0) rotate(-180deg)",
            opacity: phase >= 1 ? 1 : 0,
          }}
        >
          {isFinalLevel ? "🏆" : "⭐"}
        </div>

        {/* VICTORY title */}
        <div
          style={{
            transition: "transform 0.6s ease-out, opacity 0.6s",
            transform: phase >= 1 ? "translateY(0)" : "translateY(40px)",
            opacity: phase >= 1 ? 1 : 0,
          }}
        >
          {isFinalLevel ? (
            <>
              <div className="text-xs tracking-widest mb-3" style={{ color: "#8B6914" }}>
                CAMPAIGN COMPLETE
              </div>
              <h1
                className="font-bold tracking-widest mb-2"
                style={{
                  fontSize: "clamp(2.5rem, 8vw, 5rem)",
                  color: "#FFD700",
                  textShadow: "0 0 60px #FFD700, 0 0 120px rgba(255,215,0,0.4)",
                  lineHeight: 1,
                }}
              >
                THE FRONTIER
              </h1>
              <h1
                className="font-bold tracking-widest"
                style={{
                  fontSize: "clamp(2.5rem, 8vw, 5rem)",
                  color: "#F4E4C1",
                  textShadow: "0 0 30px rgba(244,228,193,0.5)",
                  lineHeight: 1,
                }}
              >
                IS YOURS
              </h1>
            </>
          ) : (
            <>
              <div className="text-xs tracking-widest mb-3" style={{ color: "#8B6914" }}>
                TERRITORY SECURED
              </div>
              <h1
                className="font-bold tracking-widest"
                style={{
                  fontSize: "clamp(3rem, 10vw, 6rem)",
                  color: "#FFD700",
                  textShadow: "0 0 40px #FFD700, 0 0 80px rgba(255,215,0,0.3)",
                }}
              >
                VICTORY
              </h1>
            </>
          )}
        </div>

        {/* Quote */}
        <div
          className="mt-8 mb-10 text-lg leading-relaxed italic"
          style={{
            color: "#F4E4C1",
            opacity: phase >= 2 ? 0.8 : 0,
            transition: "opacity 0.8s ease-in",
            maxWidth: 480,
            margin: "2rem auto 2.5rem",
          }}
        >
          &ldquo;{quote}&rdquo;
        </div>

        {/* Level badge */}
        <div
          className="inline-block border px-4 py-1 text-xs tracking-widest mb-8"
          style={{
            borderColor: "#8B6914",
            color: "#8B6914",
            opacity: phase >= 2 ? 1 : 0,
            transition: "opacity 0.6s ease-in 0.3s",
          }}
        >
          {isFinalLevel ? "ALL 8 TERRITORIES CLAIMED" : `TERRITORY ${level + 1} OF ${8} CLAIMED`}
        </div>

        {/* Buttons */}
        <div
          className="flex gap-4 justify-center"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
          }}
        >
          <button
            onClick={onContinue}
            className="border-2 px-10 py-3 text-lg tracking-widest font-bold transition-all duration-200 hover:scale-105"
            style={{
              borderColor: "#FFD700",
              color: "#FFD700",
              fontFamily: "monospace",
              boxShadow: "0 0 20px rgba(255,215,0,0.3)",
            }}
          >
            {isFinalLevel ? "RIDE INTO THE SUNSET →" : "NEXT TERRITORY →"}
          </button>
        </div>

        {/* Final level extra flavor */}
        {isFinalLevel && phase >= 3 && (
          <div className="mt-8 text-xs tracking-widest opacity-40" style={{ color: "#F4E4C1" }}>
            BUILT BY BAILEY LATIMER · FRONTIER WARS v1.0
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          from { opacity: 0.2; transform: scale(0.8); }
          to   { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Game Component ──────────────────────────────────────────────────────

// Virtual height is fixed; width adapts to the window's aspect ratio
const VIRTUAL_H = 600;

export default function FrontierWars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const keysHeldRef = useRef<Set<string>>(new Set());
  const cameraIdleTimerRef = useRef<number>(0); // seconds since last manual scroll
  const [isMobile, setIsMobile] = useState(false);

  // ── Mobile detection ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || ("ontouchstart" in window && window.innerWidth < 1024));
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // campaignStep = index into CAMPAIGN_SEQUENCE (0..10)
  const [campaignStep, setCampaignStep] = useState(0);
  // briefingEntry = the entry we're about to play (set before showing briefing)
  const [briefingEntry, setBriefingEntry] = useState<CampaignEntry>(CAMPAIGN_SEQUENCE[0]);
  // currentEntry = the entry currently being played (used for "Try Again" on defeat)
  const [currentEntry, setCurrentEntry] = useState<CampaignEntry>(CAMPAIGN_SEQUENCE[0]);

  const [screen, setScreen] = useState<"menu" | "campaign" | "briefing" | "battle" | "upgrade" | "victory" | "defeat">("menu");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeState>(DEFAULT_UPGRADES);
  const [upgradePoints, setUpgradePoints] = useState(0);
  const [unlockedUnits, setUnlockedUnits] = useState<string[]>(["miner", "deputy"]);
  const [hudGold, setHudGold] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false); // sync ref for game loop
  // Track whether a save exists so the menu can show "LOAD GAME"
  const [saveExists, setSaveExists] = useState(() => hasSave());

  // Keep pausedRef in sync with paused state
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // ── Game loop ──
  const gameLoop = useCallback((timestamp: number) => {
    if (!canvasRef.current || !stateRef.current) return;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    // ── PAUSED: skip update, just keep rAF alive so we can resume ──
    if (pausedRef.current) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Update
    stateRef.current = updateGame(stateRef.current, dt);

    // ── Possessed unit movement (WASD) ──
    if (stateRef.current.selectedUnitId) {
      const wHeld = keysHeldRef.current.has("w") || keysHeldRef.current.has("W");
      const sHeld = keysHeldRef.current.has("s") || keysHeldRef.current.has("S");
      const aHeld = keysHeldRef.current.has("a") || keysHeldRef.current.has("A");
      const dHeld = keysHeldRef.current.has("d") || keysHeldRef.current.has("D");
      const dx = (dHeld ? 1 : 0) - (aHeld ? 1 : 0);
      const dy = (sHeld ? 1 : 0) - (wHeld ? 1 : 0);
      if (dx !== 0 || dy !== 0) {
        stateRef.current = movePossessedUnit(stateRef.current, dx, dy, dt);
      }
    }

    const vw = canvasRef.current.width;
    const maxCam = WORLD.width - vw;

    // Camera: arrow keys override auto-follow
    // After releasing keys, wait 3s before auto-follow resumes (so you can scout enemy side)
    const leftHeld = keysHeldRef.current.has("ArrowLeft");
    const rightHeld = keysHeldRef.current.has("ArrowRight");

    if (leftHeld || rightHeld) {
      // Manual scroll — 500px/sec
      stateRef.current.manualCamera = true;
      stateRef.current.cameraX += (rightHeld ? 1 : -1) * 500 * dt;
      stateRef.current.cameraX = Math.max(0, Math.min(maxCam, stateRef.current.cameraX));
      cameraIdleTimerRef.current = 3.0; // reset 3s cooldown
    } else if (stateRef.current.selectedUnitId) {
      // Possessed unit — camera tracks the controlled unit directly
      const possessed = stateRef.current.units.find(u => u.id === stateRef.current!.selectedUnitId);
      if (possessed) {
        // Lead slightly in the direction they're facing
        const lead = possessed.facing * vw * 0.15;
        const targetCam = Math.max(0, Math.min(maxCam, possessed.pos.x - vw * 0.5 + lead));
        stateRef.current.cameraX += (targetCam - stateRef.current.cameraX) * 0.12;
      }
      cameraIdleTimerRef.current = 0; // reset idle timer while possessing
    } else if (cameraIdleTimerRef.current > 0) {
      // Keys just released — hold position during cooldown
      cameraIdleTimerRef.current -= dt;
      stateRef.current.manualCamera = true; // keep camera locked
    } else {
      // Cooldown expired — resume auto-follow
      stateRef.current.manualCamera = false;
      const playerUnits = stateRef.current.units.filter(u => u.team === "player" && u.state !== "dead");
      if (playerUnits.length > 0) {
        const avgX = playerUnits.reduce((s, u) => s + u.pos.x, 0) / playerUnits.length;
        const targetCam = Math.max(0, Math.min(maxCam, avgX - vw * 0.4));
        stateRef.current.cameraX += (targetCam - stateRef.current.cameraX) * 0.05;
      }
    }

    // ── Play sound events from engine ──
    if (stateRef.current.soundEvents && stateRef.current.soundEvents.length > 0) {
      for (const evt of stateRef.current.soundEvents) {
        if (evt === "colt-shot") {
          try {
            const sfx = new Audio("/sounds/colt-shot.wav");
            sfx.volume = 0.18;
            sfx.play().catch(() => {});
          } catch (e) { void e; }
        }
      }
      stateRef.current.soundEvents = [];
    }

    // Sync gold to React state (throttled)
    setHudGold(stateRef.current.gold);

    // Check phase transitions
    if (stateRef.current.phase === "VICTORY") {
      setUpgradePoints(prev => prev + 2);
      setCompletedLevels(prev => [...new Set([...prev, currentLevel])]);
      // Unlock units earned from this level
      const lvlUnlocks = (currentEntry.kind === "level" ? LEVELS[currentEntry.index]?.unlocks : []) ?? [];
      if (lvlUnlocks.length > 0) {
        setUnlockedUnits(prev => [...new Set([...prev, ...lvlUnlocks])]);
      }
      setScreen("victory"); // → cinematic victory scene
      stopBgMusic();
      return;
    }
    if (stateRef.current.phase === "DEFEAT") {
      setScreen("defeat");
      stopBgMusic();
      return;
    }

    // Render
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) render(ctx, stateRef.current, canvasRef.current.width, canvasRef.current.height);

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [currentLevel]);

  const stopBgMusic = () => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current = null;
    }
  };

  // ── Start battle (regular level by index) ──
  const startBattle = useCallback((level: number) => {
    stateRef.current = createInitialState(level, upgrades, unlockedUnits);
    setScreen("battle");
    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(gameLoop);
    stopBgMusic();
    try {
      const music = new Audio("/sounds/secret-page.mp3");
      music.volume = 0.25;
      music.loop = true;
      music.play().catch(() => {});
      bgMusicRef.current = music;
    } catch (e) { void e; }
  }, [upgrades, gameLoop]);

  // ── Start battle from a CampaignEntry (regular or ambush) ──
  const startBattleFromEntry = useCallback((entry: CampaignEntry) => {
    // Ambush levels encoded as 100+index so engine can distinguish them
    const engineLevel = entry.kind === "ambush" ? 100 + entry.index : entry.index;
    stateRef.current = createInitialState(engineLevel, upgrades, unlockedUnits);
    if (entry.kind !== "ambush") setCurrentLevel(entry.index);
    setCurrentEntry(entry); // track for "Try Again" on defeat
    setScreen("battle");
    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(gameLoop);
    stopBgMusic();
    try {
      const music = new Audio("/sounds/secret-page.mp3");
      music.volume = 0.25;
      music.loop = true;
      music.play().catch(() => {});
      bgMusicRef.current = music;
    } catch (e) { void e; }
  }, [upgrades, gameLoop]);

  // ── Input handling ──
  useEffect(() => {
    if (screen !== "battle") return;

    const keyMap: Record<string, UnitType> = {
      "1": "miner", "2": "deputy", "3": "gunslinger", "4": "bounty_hunter", "5": "dynamiter", "6": "marshal",
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keysHeldRef.current.add(e.key);

      if (!stateRef.current) return;

      // Space = possessed attack
      if (e.key === " " && stateRef.current.selectedUnitId) {
        stateRef.current = possessedAttack(stateRef.current);
        e.preventDefault();
        return;
      }

      // Unit spawn keys (only when no unit possessed)
      if (!stateRef.current.selectedUnitId) {
        const type = keyMap[e.key];
        if (type) stateRef.current = queueUnit(stateRef.current, type);
        // Stance keys
        if (e.key === "g" || e.key === "G") stateRef.current = setStance(stateRef.current, "garrison");
        if (e.key === "d" || e.key === "D") stateRef.current = setStance(stateRef.current, "defense");
        if (e.key === "a" || e.key === "A") stateRef.current = setStance(stateRef.current, "attack");
      }

      // Escape = deselect possessed unit
      if (e.key === "Escape") {
        stateRef.current = { ...stateRef.current, selectedUnitId: null, units: stateRef.current.units.map(u => ({ ...u, selected: false })) };
      }

      // P key = toggle pause
      if (e.key === "p" || e.key === "P") {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        if (bgMusicRef.current) bgMusicRef.current.volume = pausedRef.current ? 0.05 : 0.25;
        e.preventDefault();
        return;
      }

      // Prevent browser defaults for ALL game keys (fixes Firefox Quick Find bar)
      const gameKeys = new Set(["1","2","3","4","5","w","W","a","A","s","S","d","D","g","G","p","P"," ","Escape","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]);
      if (gameKeys.has(e.key)) e.preventDefault();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.key);
    };

    const onCanvasClick = (e: MouseEvent) => {
      if (!stateRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
      const canvasY = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
      const gameH = canvasRef.current.height - WORLD.hudHeight;

      if (canvasY < gameH) {
        // Click in game area — select unit
        const worldX = canvasX + stateRef.current.cameraX;
        stateRef.current = selectUnit(stateRef.current, worldX, canvasY);
      } else {
        const hudY = gameH;

        // ── Stance buttons (left side, at hudY+72, matching renderer) ──
        const stanceBtnW = 58, stanceBtnH = 22, stanceGap = 4;
        const stanceStartX = 16, stanceStartY = hudY + 72;
        const stances: Array<"garrison" | "defense" | "attack"> = ["garrison", "defense", "attack"];
        let clickedStance = false;
        for (let i = 0; i < 3; i++) {
          const bx = stanceStartX + i * (stanceBtnW + stanceGap);
          if (canvasX >= bx && canvasX <= bx + stanceBtnW && canvasY >= stanceStartY && canvasY <= stanceStartY + stanceBtnH) {
            stateRef.current = setStance(stateRef.current, stances[i]);
            clickedStance = true;
            break;
          }
        }
        if (clickedStance) return;

        // ── Unit spawn buttons (center) ──
        const btnW = 90, btnH = 70, btnGap = 8;
        const totalW = 5 * (btnW + btnGap) - btnGap;
        const startX = (canvasRef.current.width - totalW) / 2;
        const unitTypes: UnitType[] = ["miner", "deputy", "gunslinger", "bounty_hunter", "dynamiter", "marshal"];

        for (let i = 0; i < 6; i++) {
          const bx = startX + i * (btnW + btnGap);
          const by = hudY + 10;
          if (canvasX >= bx && canvasX <= bx + btnW && canvasY >= by && canvasY <= by + btnH) {
            stateRef.current = queueUnit(stateRef.current, unitTypes[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvasRef.current?.addEventListener("click", onCanvasClick);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvasRef.current?.removeEventListener("click", onCanvasClick);
      keysHeldRef.current.clear();
    };
  }, [screen]);

  // ── Canvas: dynamic resolution — fills the window at any aspect ratio ──
  useEffect(() => {
    if (screen !== "battle") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const setResolution = () => {
      const aspect = window.innerWidth / window.innerHeight;
      canvas.width = Math.round(VIRTUAL_H * aspect);
      canvas.height = VIRTUAL_H;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    };

    setResolution();
    window.addEventListener("resize", setResolution);
    return () => window.removeEventListener("resize", setResolution);
  }, [screen]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      stopBgMusic();
    };
  }, []);

  // ── Save / Load handlers ──
  const handleSave = useCallback(() => {
    saveGame({
      campaignStep,
      currentLevel,
      completedLevels,
      upgrades,
      upgradePoints,
      unlockedUnits,
      savedAt: Date.now(),
    });
    setSaveExists(true);
  }, [campaignStep, currentLevel, completedLevels, upgrades, upgradePoints, unlockedUnits]);

  const handleLoad = useCallback(() => {
    const data = loadGame();
    if (!data) return;
    setCampaignStep(data.campaignStep);
    setCurrentLevel(data.currentLevel);
    setCompletedLevels(data.completedLevels);
    setUpgrades(data.upgrades);
    setUpgradePoints(data.upgradePoints);
    setUnlockedUnits(data.unlockedUnits ?? ["miner", "deputy"]);
    // Set briefingEntry to the saved campaign step so the next battle is correct
    const entry = CAMPAIGN_SEQUENCE[data.campaignStep] ?? CAMPAIGN_SEQUENCE[0];
    setBriefingEntry(entry);
    setCurrentEntry(entry);
    setScreen("campaign");
  }, []);

  // ── Upgrade handler ──
  const handleUpgrade = (key: keyof UpgradeState) => {
    const def = UPGRADE_DEFS.find(d => d.key === key);
    if (!def || upgradePoints < def.cost || upgrades[key] >= def.maxLevel) return;
    setUpgrades(prev => ({ ...prev, [key]: prev[key] + 1 }));
    setUpgradePoints(prev => prev - def.cost);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  // ── Mobile gate ──
  if (isMobile) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-8"
        style={{ background: "linear-gradient(180deg, #1a0a2e 0%, #7a3520 60%, #8B5E3C 100%)", fontFamily: "monospace" }}>
        <div className="text-5xl mb-6">🤠</div>
        <div className="text-xs tracking-widest mb-3" style={{ color: "#8B6914" }}>FRONTIER WARS</div>
        <h2 className="text-2xl font-bold tracking-widest mb-4" style={{ color: "#FFD700" }}>
          THIS FRONTIER AIN&apos;T<br />BUILT FOR SMALL SCREENS
        </h2>
        <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: "#F4E4C1", opacity: 0.7 }}>
          Saddle up on a desktop or laptop for the full experience, partner. You&apos;ll need a keyboard to command your troops.
        </p>
        <div className="border px-4 py-2 text-xs tracking-widest mb-8"
          style={{ borderColor: "#8B5E3C", color: "#8B6914" }}>
          BEST ON DESKTOP · KEYBOARD REQUIRED
        </div>
        <button
          onClick={() => { window.location.href = "/"; }}
          className="text-xs tracking-widest opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: "#F4E4C1" }}
        >
          ← BACK TO SITE
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black select-none overflow-hidden">

      {/* ── MENU ── */}
      {screen === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(180deg, #1a0a2e 0%, #7a3520 60%, #8B5E3C 100%)", fontFamily: "monospace" }}>
          <div className="text-center">
            <div className="text-xs tracking-widest mb-4" style={{ color: "#8B6914" }}>BAILEY LATIMER PRESENTS</div>
            <h1 className="text-7xl font-bold tracking-widest mb-2"
              style={{ color: "#FFD700", textShadow: "0 0 40px #FFD700, 0 0 80px rgba(255,215,0,0.3)" }}>
              FRONTIER
            </h1>
            <h1 className="text-7xl font-bold tracking-widest mb-6"
              style={{ color: "#F4E4C1", textShadow: "0 0 20px rgba(244,228,193,0.5)" }}>
              WARS
            </h1>
            <div className="text-sm tracking-widest mb-12 opacity-60" style={{ color: "#F4E4C1" }}>
              A WESTERN STRATEGY GAME
            </div>

            <div className="border p-6 mb-8 text-left text-sm space-y-2 max-w-sm mx-auto"
              style={{ borderColor: "#8B5E3C", color: "#F4E4C1", background: "rgba(44,24,16,0.6)" }}>
              <div className="text-center mb-3 opacity-60">── HOW TO PLAY ──</div>
              <div><span style={{ color: "#FFD700" }}>[1]</span> Spawn Miner — mines gold</div>
              <div><span style={{ color: "#FFD700" }}>[2]</span> Spawn Deputy — melee fighter</div>
              <div><span style={{ color: "#FFD700" }}>[3]</span> Spawn Gunslinger — ranged</div>
              <div><span style={{ color: "#FFD700" }}>[4]</span> Spawn Dynamiter — AOE</div>
              <div><span style={{ color: "#FFD700" }}>[5]</span> Spawn Marshal — tank</div>
              <div className="pt-2 opacity-60">Click units to select &amp; control them</div>
              <div className="opacity-60">Destroy the enemy Saloon to win</div>
            </div>

            <button
              onClick={() => setScreen("campaign")}
              className="border-2 px-14 py-4 text-2xl tracking-widest font-bold transition-all duration-200 hover:scale-105"
              style={{ borderColor: "#FFD700", color: "#FFD700", fontFamily: "monospace",
                boxShadow: "0 0 30px rgba(255,215,0,0.3)" }}
            >
              PLAY
            </button>

            {saveExists && (() => {
              const save = loadGame();
              return (
                <div className="mt-4 flex flex-col items-center gap-1">
                  <button
                    onClick={handleLoad}
                    className="border px-14 py-3 text-lg tracking-widest font-bold transition-all duration-200 hover:scale-105"
                    style={{ borderColor: "#8B6914", color: "#c8a96e", fontFamily: "monospace" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#FFD700"; (e.currentTarget as HTMLButtonElement).style.color = "#FFD700"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#8B6914"; (e.currentTarget as HTMLButtonElement).style.color = "#c8a96e"; }}
                  >
                    LOAD GAME
                  </button>
                  {save && (
                    <div className="text-xs opacity-40 tracking-widest" style={{ color: "#F4E4C1" }}>
                      {formatSaveDate(save.savedAt)} · TERRITORY {save.currentLevel + 1}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-6">
              <button
                onClick={() => { window.location.href = "/"; }}
                className="text-xs tracking-widest opacity-40 hover:opacity-70 transition-opacity"
                style={{ color: "#F4E4C1", fontFamily: "monospace" }}
              >
                ← BACK TO SITE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CAMPAIGN MAP ── */}
      {screen === "campaign" && (
        <CampaignMap
          currentLevel={currentLevel}
          completedLevels={completedLevels}
          campaignStep={campaignStep}
          onSelectLevel={(level) => {
            // Find the campaign step for this level and show briefing
            const stepIdx = CAMPAIGN_SEQUENCE.findIndex(e => e.kind === "level" && e.index === level);
            const entry: CampaignEntry = stepIdx >= 0 ? CAMPAIGN_SEQUENCE[stepIdx] : { kind: "level", index: level };
            setCurrentLevel(level);
            setBriefingEntry(entry);
            setCampaignStep(stepIdx >= 0 ? stepIdx : 0);
            setScreen("briefing");
          }}
        />
      )}

      {/* ── BRIEFING (parchment wanted poster) ── */}
      {screen === "briefing" && (
        <MissionBriefing
          entry={briefingEntry}
          onBegin={() => startBattleFromEntry(briefingEntry)}
        />
      )}

      {/* ── BATTLE ── */}
      {screen === "battle" && (
        <div ref={containerRef} className="absolute inset-0 flex items-center justify-center bg-black">
          <canvas ref={canvasRef} style={{ display: "block", imageRendering: "pixelated" }} />

          {/* Pause button — top-right, western style */}
          <button
            onClick={() => {
              pausedRef.current = !pausedRef.current;
              setPaused(pausedRef.current);
              if (bgMusicRef.current) bgMusicRef.current.volume = pausedRef.current ? 0.05 : 0.25;
            }}
            className="absolute top-2 right-2 z-20 border px-3 py-1 text-xs tracking-widest transition-all duration-150"
            style={{
              borderColor: paused ? "#FFD700" : "#8B5E3C",
              color: paused ? "#FFD700" : "#F4E4C1",
              fontFamily: "monospace",
              background: paused ? "rgba(255,215,0,0.1)" : "transparent",
            }}
            title="Pause [P]"
          >
            {paused ? "▶ RESUME" : "⏸ PAUSE"}
          </button>

          {/* Pause menu overlay */}
          {paused && (
            <PauseMenu
              onResume={() => {
                pausedRef.current = false;
                setPaused(false);
                if (bgMusicRef.current) bgMusicRef.current.volume = 0.25;
              }}
              onRestart={() => {
                pausedRef.current = false;
                setPaused(false);
                cancelAnimationFrame(animFrameRef.current);
                startBattle(currentLevel);
              }}
              onSave={handleSave}
              onQuitToMenu={() => {
                pausedRef.current = false;
                setPaused(false);
                cancelAnimationFrame(animFrameRef.current);
                stopBgMusic();
                setScreen("menu");
              }}
            />
          )}
        </div>
      )}

      {/* ── UPGRADE ── */}
      {screen === "upgrade" && (
        <UpgradeScreen
          upgrades={upgrades}
          upgradePoints={upgradePoints}
          onUpgrade={handleUpgrade}
          onContinue={() => {
            // After upgrades, show briefing for the next entry
            setScreen("briefing");
          }}
        />
      )}

      {/* ── VICTORY (cinematic end scene) ── */}
      {screen === "victory" && (
        <VictoryScene
          level={currentLevel}
          onContinue={() => {
            // Advance campaign step
            const nextStep = campaignStep + 1;
            if (nextStep >= CAMPAIGN_SEQUENCE.length) {
              setScreen("menu");
              return;
            }
            const nextEntry = CAMPAIGN_SEQUENCE[nextStep];
            setCampaignStep(nextStep);
            setBriefingEntry(nextEntry);
            if (nextEntry.kind === "level") setCurrentLevel(nextEntry.index);
            // Always show upgrade screen between battles (skip for ambush→ambush edge case)
            setScreen("upgrade");
          }}
          isFinalLevel={currentLevel >= LEVELS.length - 1}
        />
      )}

      {/* ── DEFEAT ── */}
      {screen === "defeat" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.9)", fontFamily: "monospace" }}>
          <div className="text-center">
            <div className="text-6xl font-bold tracking-widest mb-4"
              style={{ color: "#cc2200", textShadow: "0 0 40px #cc2200" }}>
              DEFEATED
            </div>
            <div className="text-lg mb-8 opacity-70" style={{ color: "#F4E4C1" }}>
              Your saloon has fallen. Ride again?
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => startBattleFromEntry(currentEntry)}
                className="border-2 px-8 py-3 text-lg tracking-widest"
                style={{ borderColor: "#FFD700", color: "#FFD700", fontFamily: "monospace" }}
              >
                TRY AGAIN
              </button>
              <button
                onClick={() => setScreen("menu")}
                className="border px-8 py-3 text-lg tracking-widest opacity-60"
                style={{ borderColor: "#F4E4C1", color: "#F4E4C1", fontFamily: "monospace" }}
              >
                MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unused gold ref to suppress warning */}
      <span className="hidden">{hudGold}</span>
    </div>
  );
}
