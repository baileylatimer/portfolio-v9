// ─── Frontier Wars — Main Game Component ──────────────────────────────────────

import { useEffect, useRef, useCallback, useState } from "react";
import CustomButton from "~/components/custom-button";
import type { GameState, UnitType, UpgradeState, Difficulty } from "./types";
import { createInitialState, updateGame, queueUnit, selectUnit, setStance, movePossessedUnit, possessedAttack } from "./engine";
import { render } from "./renderer";
import { WORLD, LEVELS, AMBUSH_LEVELS, CAMPAIGN_SEQUENCE, UPGRADE_DEFS, DIFFICULTY_DEFS } from "./configs";
import type { CampaignEntry } from "./configs";

// ─── Default Upgrades ─────────────────────────────────────────────────────────

const DEFAULT_UPGRADES: UpgradeState = {
  minerSpeed: 0, minerCapacity: 0,
  deputyHp: 0, deputyDamage: 0,
  bountyHp: 0, bountyDamage: 0,
  gunslingerRange: 0, gunslingerRate: 0,
  dynamiterRadius: 0, dynamiterRange: 0, marshalHp: 0,
  saloonRevenue: 0, saloonHp: 0, barracks: 0,
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
  difficulty?: Difficulty;
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
  dynamiterRange:  { unit: "dynamiter",  tier: u => u.dynamiterRange },
  marshalHp:       { unit: "marshal",    tier: u => u.marshalHp },
  saloonRevenue:   { unit: "saloon",     tier: u => u.saloonRevenue },
  saloonHp:        { unit: "saloon_hp",  tier: u => u.saloonHp },
  barracks:        { unit: "deputy",     tier: u => u.barracks },
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

  // ── Saloon HP (fortification) ──
  if (unitType === "saloon_hp") {
    // Fortified saloon: thicker walls, reinforced beams, watchtower per tier
    ctx.fillStyle = "#4a2810";
    ctx.fillRect(6, 18, 48, 44);
    ctx.fillStyle = "#3d1f0a";
    ctx.fillRect(4, 8, 52, 12);
    // Reinforced beams
    ctx.fillStyle = "#2a1008";
    ctx.fillRect(6, 18, 4, 44);
    ctx.fillRect(50, 18, 4, 44);
    // Windows
    ctx.fillStyle = "#FFD060";
    ctx.globalAlpha = 0.6;
    ctx.fillRect(12, 24, 10, 8);
    ctx.fillRect(38, 24, 10, 8);
    ctx.globalAlpha = 1;
    // HP bar indicator
    ctx.fillStyle = "#4CAF50";
    const hpW = Math.round(40 * (tier / 3));
    ctx.fillRect(10, 66, 40, 4);
    ctx.fillStyle = "#2a8a30";
    ctx.fillRect(10, 66, hpW, 4);
    // Tier upgrades
    if (tier >= 1) {
      // Iron reinforcement strips
      ctx.fillStyle = "#888";
      ctx.fillRect(4, 30, 52, 2);
      ctx.fillRect(4, 44, 52, 2);
    }
    if (tier >= 2) {
      // Sandbag barricade at base
      ctx.fillStyle = "#8B6914";
      ctx.fillRect(4, 58, 52, 4);
      ctx.fillStyle = "#a07830";
      for (let i = 0; i < 5; i++) ctx.fillRect(5 + i * 10, 56, 9, 4);
    }
    if (tier >= 3) {
      // Watchtower on top
      ctx.fillStyle = "#3d1f0a";
      ctx.fillRect(20, 2, 20, 8);
      ctx.fillStyle = "#cc2200";
      ctx.fillRect(28, 0, 4, 4); // flag
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 6px monospace";
      ctx.textAlign = "center";
      ctx.fillText("⚔", cx, 7);
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
  onRespec,
  onContinue,
}: {
  upgrades: UpgradeState;
  upgradePoints: number;
  onUpgrade: (key: keyof UpgradeState) => void;
  onRespec: () => void;
  onContinue: () => void;
}) {
  const totalSpent = Object.values(upgrades).reduce((sum, v) => sum + v, 0);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto py-8"
      style={{ background: "rgba(0,0,0,0.92)", fontFamily: "monospace" }}>
      <div className="text-center mb-4">
        <div className="text-xs tracking-widest mb-2" style={{ color: "#8B6914" }}>BETWEEN ROUNDS</div>
        <h2 className="text-4xl font-bold tracking-widest" style={{ color: "#FFD700", textShadow: "0 0 20px #FFD700" }}>
          UPGRADES
        </h2>
        <div className="text-sm mt-2" style={{ color: "#F4E4C1" }}>
          Upgrade Points: <span style={{ color: "#FFD700", fontWeight: "bold" }}>{upgradePoints}</span>
        </div>
        {totalSpent > 0 && (
          <button
            onClick={onRespec}
            className="mt-2 px-4 py-1 text-xs tracking-widest border transition-all duration-150"
            style={{ borderColor: "#cc4400", color: "#cc4400", fontFamily: "monospace", background: "transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(204,68,0,0.15)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            title={`Refund all ${totalSpent} spent upgrade points`}
          >
            ↺ RESET ALL UPGRADES (+{totalSpent}pts)
          </button>
        )}
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

interface MenuNPC {
  x: number; y: number; type: string; dir: number;
  speed: number; frame: number; frameTimer: number;
  shootTimer: number; shootFlash: number;
}
interface MenuParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}
function menuLerpColor(a: string, b: string, t: number): string {
  const h = (s: string) => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)] as const;
  const [r1,g1,b1] = h(a), [r2,g2,b2] = h(b);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function drawMenuBg(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const phase = (Math.sin(t * 0.12) + 1) / 2;
  const grad = ctx.createLinearGradient(0, 0, 0, H * 0.78);
  grad.addColorStop(0, menuLerpColor("#1a0a2e", "#2a0e1a", phase));
  grad.addColorStop(0.45, menuLerpColor("#7a3520", "#c86030", phase));
  grad.addColorStop(1, "#8B5E3C");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const groundY = H * 0.78;

  // Far mountains
  ctx.fillStyle = "#3D1A08";
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  const mPts = [0,0.12,0.22,0.35,0.48,0.58,0.70,0.82,0.92,1.0];
  const mH   = [0,0.28,0.12,0.32,0.18,0.30,0.14,0.26,0.10,0];
  for (let i = 0; i < mPts.length; i++) ctx.lineTo(mPts[i]*W, groundY - mH[i]*groundY);
  ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();

  // Near mountains
  ctx.fillStyle = "#5C2E10";
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  const m2Pts = [0,0.08,0.20,0.32,0.45,0.60,0.72,0.85,0.95,1.0];
  const m2H   = [0,0.16,0.06,0.20,0.08,0.18,0.05,0.15,0.07,0];
  for (let i = 0; i < m2Pts.length; i++) ctx.lineTo(m2Pts[i]*W, groundY - m2H[i]*groundY);
  ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();

  // Ground
  ctx.fillStyle = "#6B4423";
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = "#7a5030";
  ctx.fillRect(0, groundY, W, 5);

  // Cacti
  for (const px of [0.07, 0.19, 0.63, 0.79, 0.92]) {
    const sc = 0.7 + Math.sin(px * 13) * 0.25;
    const cx = px * W, cy = groundY;
    const h = 50 * sc, w = 9 * sc;
    ctx.fillStyle = "#2a5a2a";
    ctx.fillRect(cx - w/2, cy - h, w, h);
    ctx.fillRect(cx - w/2 - 14*sc, cy - h*0.65, 14*sc, w*0.75);
    ctx.fillRect(cx - w/2 - 14*sc, cy - h*0.65 - 14*sc, w*0.75, 14*sc);
    ctx.fillRect(cx + w/2, cy - h*0.75, 14*sc, w*0.75);
    ctx.fillRect(cx + w/2, cy - h*0.75 - 12*sc, w*0.75, 12*sc);
  }
}

function drawMenuChar(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, dir: number, frame: number, flash: number) {
  const s = 3;
  ctx.save();
  ctx.translate(x, y);
  if (dir === -1) ctx.scale(-1, 1);

  const walk = frame % 4;
  const ll = walk < 2 ? 3 : -3, lr = walk < 2 ? -3 : 3;
  const al = walk < 2 ? -2 : 2;

  // Legs
  ctx.fillStyle = "#3D2B1F";
  ctx.fillRect(-4*s, ll, 3*s, 9*s);
  ctx.fillRect(s, lr, 3*s, 9*s);

  // Body
  const bc = type === "deputy" ? "#4a7a9b" : type === "gunslinger" ? "#8B4513" : type === "bounty_hunter" ? "#5a3a1a" : "#8B6914";
  ctx.fillStyle = bc;
  ctx.fillRect(-5*s, -12*s, 10*s, 12*s);

  // Arms
  ctx.fillStyle = "#D4A574";
  ctx.fillRect(-8*s, -10*s + al, 3*s, 7*s);
  if (type === "gunslinger" && flash > 0) {
    ctx.fillStyle = "#888";
    ctx.fillRect(5*s, -14*s, 8*s, 2*s);
    ctx.fillStyle = "#FFD700";
    ctx.globalAlpha = flash;
    ctx.fillRect(12*s, -17*s, 5*s, 5*s);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = "#D4A574";
    const ar = walk < 2 ? 2 : -2;
    ctx.fillRect(5*s, -10*s + ar, 3*s, 7*s);
  }

  // Head
  ctx.fillStyle = "#D4A574";
  ctx.fillRect(-4*s, -22*s, 8*s, 8*s);

  // Hat
  ctx.fillStyle = "#3D2B1F";
  ctx.fillRect(-6*s, -24*s, 12*s, 3*s);
  ctx.fillRect(-4*s, -31*s, 8*s, 8*s);

  // Type details
  if (type === "deputy") {
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(-s, -9*s, 2*s, 2*s);
  } else if (type === "miner") {
    ctx.fillStyle = "#888";
    ctx.fillRect(-11*s, -11*s + al, 7*s, 2*s);
  } else if (type === "brave") {
    // Brave: red body, feather headdress, no hat
    // Override body color (already drawn above as #8B6914 fallback)
    ctx.fillStyle = "#8B3A1A";
    ctx.fillRect(-5*s, -12*s, 10*s, 12*s);
    // Feather headdress — 3 feathers above head
    const featherColors = ["#cc2200", "#FFD700", "#cc2200"];
    for (let fi = 0; fi < 3; fi++) {
      ctx.fillStyle = featherColors[fi];
      ctx.fillRect((-3 + fi * 2.5)*s, -32*s, s, 8*s);
    }
    // Headband
    ctx.fillStyle = "#8B6914";
    ctx.fillRect(-4*s, -24*s, 8*s, 2*s);
    // Erase the cowboy hat (draw skin over it)
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(-6*s, -31*s, 12*s, 10*s);
    // Re-draw head
    ctx.fillStyle = "#C4905A";
    ctx.fillRect(-4*s, -22*s, 8*s, 8*s);
    // Headband on head
    ctx.fillStyle = "#8B3A1A";
    ctx.fillRect(-4*s, -20*s, 8*s, 2*s);
    // Feathers above head
    for (let fi = 0; fi < 3; fi++) {
      ctx.fillStyle = featherColors[fi];
      ctx.fillRect((-3 + fi * 2.5)*s, -30*s, s, 9*s);
    }
  } else if (type === "archer") {
    // Archer: tan body, single tall feather, bow in hand
    ctx.fillStyle = "#7A5A2A";
    ctx.fillRect(-5*s, -12*s, 10*s, 12*s);
    // Erase hat, draw skin
    ctx.fillStyle = "#D4A574";
    ctx.fillRect(-6*s, -31*s, 12*s, 10*s);
    // Re-draw head
    ctx.fillStyle = "#C4905A";
    ctx.fillRect(-4*s, -22*s, 8*s, 8*s);
    // Single tall red feather
    ctx.fillStyle = "#cc2200";
    ctx.fillRect(2*s, -32*s, s, 11*s);
    ctx.fillStyle = "#FF6600";
    ctx.fillRect(3*s, -30*s, s, 7*s);
    // Bow — arc on the right arm side
    ctx.strokeStyle = "#5C3A10";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8*s, -8*s, 7*s, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
    // Bowstring
    ctx.strokeStyle = "#D4A574";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8*s, -8*s - 7*s * Math.sin(Math.PI * 0.6));
    ctx.lineTo(8*s, -8*s + 7*s * Math.sin(Math.PI * 0.6));
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Main Game Component ──────────────────────────────────────────────────────

export default function FrontierWars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const keysHeldRef = useRef<Set<string>>(new Set());
  const cameraIdleTimerRef = useRef<number>(0); // seconds since last manual scroll
  const menuCanvasRef = useRef<HTMLCanvasElement>(null);
  const menuAnimRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  // ── Mobile detection ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || ("ontouchstart" in window && window.innerWidth < 1024));
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [screen, setScreen] = useState<"menu" | "difficulty" | "campaign" | "briefing" | "battle" | "upgrade" | "victory" | "defeat">("menu");

  // ── Menu canvas animation ──
  useEffect(() => {
    if (screen !== "menu") return;
    const canvas = menuCanvasRef.current;
    if (!canvas) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const npcs: MenuNPC[] = [
      { x: 0.12, y: 0.74, type: "deputy",       dir:  1, speed: 0.06, frame: 0, frameTimer: 0, shootTimer: 0,   shootFlash: 0 },
      { x: 0.28, y: 0.76, type: "miner",         dir: -1, speed: 0.04, frame: 2, frameTimer: 0, shootTimer: 0,   shootFlash: 0 },
      { x: 0.50, y: 0.72, type: "gunslinger",    dir:  1, speed: 0.05, frame: 1, frameTimer: 0, shootTimer: 2.5, shootFlash: 0 },
      { x: 0.65, y: 0.75, type: "bounty_hunter", dir: -1, speed: 0.045,frame: 3, frameTimer: 0, shootTimer: 0,   shootFlash: 0 },
      { x: 0.82, y: 0.73, type: "deputy",        dir:  1, speed: 0.035,frame: 0, frameTimer: 0, shootTimer: 0,   shootFlash: 0 },
      { x: 0.40, y: 0.77, type: "miner",         dir:  1, speed: 0.03, frame: 2, frameTimer: 0, shootTimer: 0,   shootFlash: 0 },
      // Native characters — wander from the right side
      { x: 0.88, y: 0.75, type: "brave",         dir: -1, speed: 0.055,frame: 1, frameTimer: 0, shootTimer: 0,   shootFlash: 0 },
      { x: 0.73, y: 0.73, type: "archer",        dir: -1, speed: 0.04, frame: 3, frameTimer: 0, shootTimer: 0,   shootFlash: 0 },
    ];
    const particles: MenuParticle[] = [];
    let t = 0, last = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now; t += dt;
      const W = canvas.width, H = canvas.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawMenuBg(ctx, W, H, t);

      for (const npc of npcs) {
        npc.frameTimer += dt;
        if (npc.frameTimer > 0.15) { npc.frameTimer = 0; npc.frame = (npc.frame + 1) % 4; }
        npc.x += npc.dir * npc.speed * dt;
        if (npc.x < 0.05) { npc.x = 0.05; npc.dir = 1; }
        if (npc.x > 0.95) { npc.x = 0.95; npc.dir = -1; }

        if (npc.type === "gunslinger") {
          npc.shootTimer -= dt;
          if (npc.shootTimer <= 0) {
            npc.shootTimer = 3.5 + Math.random() * 3;
            npc.shootFlash = 1.0;
            for (let i = 0; i < 10; i++) {
              particles.push({
                x: npc.x * W + (npc.dir > 0 ? 30 : -30),
                y: npc.y * H - 42,
                vx: (Math.random() - 0.5) * 80,
                vy: -120 - Math.random() * 80,
                life: 0.6, maxLife: 0.6,
                color: i % 2 === 0 ? "#FFD700" : "#FF8800",
                size: 3 + Math.random() * 3,
              });
            }
          }
          npc.shootFlash = Math.max(0, npc.shootFlash - dt * 4);
        }

        drawMenuChar(ctx, npc.x * W, npc.y * H, npc.type, npc.dir, npc.frame, npc.shootFlash);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      menuAnimRef.current = requestAnimationFrame(tick);
    };

    menuAnimRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(menuAnimRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [screen]);

  // campaignStep = index into CAMPAIGN_SEQUENCE (0..10)
  const [campaignStep, setCampaignStep] = useState(0);
  // briefingEntry = the entry we're about to play (set before showing briefing)
  const [briefingEntry, setBriefingEntry] = useState<CampaignEntry>(CAMPAIGN_SEQUENCE[0]);
  // currentEntry = the entry currently being played (used for "Try Again" on defeat)
  const [currentEntry, setCurrentEntry] = useState<CampaignEntry>(CAMPAIGN_SEQUENCE[0]);

  const [currentLevel, setCurrentLevel] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeState>(DEFAULT_UPGRADES);
  const [upgradePoints, setUpgradePoints] = useState(0);
  const [unlockedUnits, setUnlockedUnits] = useState<string[]>(["miner", "deputy"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("gunslinger");
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
      setUpgradePoints(prev => prev + (stateRef.current?.upgradePoints ?? 2));
      setCompletedLevels(prev => [...new Set([...prev, currentLevel])]);
      // Unlock units earned from this level
      // Derive unlocks from live game state (avoids stale closure on currentEntry)
      const liveLevel = stateRef.current?.level ?? 0;
      const liveIsAmbush = liveLevel >= 100;
      const liveLevelIdx = liveIsAmbush ? liveLevel - 100 : liveLevel;
      const lvlUnlocks = (!liveIsAmbush && LEVELS[liveLevelIdx]?.unlocks) || [];
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

  // ── Start battle from a CampaignEntry (regular or ambush) ──
  const startBattleFromEntry = useCallback((entry: CampaignEntry) => {
    // Ambush levels encoded as 100+index so engine can distinguish them
    const engineLevel = entry.kind === "ambush" ? 100 + entry.index : entry.index;
    stateRef.current = createInitialState(engineLevel, upgrades, unlockedUnits, difficulty);
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
  }, [upgrades, unlockedUnits, difficulty, gameLoop]);

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
      if (e.key === " " && !e.repeat && stateRef.current.selectedUnitId) {
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
        const unitTypes: UnitType[] = ["miner", "deputy", "gunslinger", "bounty_hunter", "dynamiter", "marshal"];
        const totalW = unitTypes.length * (btnW + btnGap) - btnGap;
        const startX = (canvasRef.current.width - totalW) / 2;

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
      difficulty,
    });
    setSaveExists(true);
  }, [campaignStep, currentLevel, completedLevels, upgrades, upgradePoints, unlockedUnits, difficulty]);

  const handleLoad = useCallback(() => {
    const data = loadGame();
    if (!data) return;
    setCampaignStep(data.campaignStep);
    setCurrentLevel(data.currentLevel);
    setCompletedLevels(data.completedLevels);
    setUpgrades(data.upgrades);
    setUpgradePoints(data.upgradePoints);
    setUnlockedUnits(data.unlockedUnits ?? ["miner", "deputy"]);
    if (data.difficulty) setDifficulty(data.difficulty);
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

  // ── Respec handler — refund all spent upgrade points ──
  const handleRespec = () => {
    const spent = Object.values(upgrades).reduce((sum, v) => sum + v, 0);
    setUpgrades(DEFAULT_UPGRADES);
    setUpgradePoints(prev => prev + spent);
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
        <div className="absolute inset-0 overflow-hidden">
          {/* Living background canvas */}
          <canvas ref={menuCanvasRef} className="absolute inset-0 w-full h-full" />

          {/* Page flap — top-left corner fold back to site */}
          <button
            className="page-flap"
            onClick={() => { window.location.href = "/"; }}
            title="Back to site"
            aria-label="Back to site"
          >
            <span className="page-flap-arrow">←</span>
          </button>

          {/* FRONTIER — top, full width */}
          <div className="absolute top-0 left-0 right-0 px-3 pt-1 pointer-events-none select-none">
            <span
              className="font-accent game-title-text block"
              style={{
                color: "#FFD700",
                textShadow: "0 6px 0 rgba(0,0,0,0.55), 0 0 80px rgba(255,215,0,0.15)",
                letterSpacing: "-0.02em",
              }}
            >
              FRONTIER
            </span>
          </div>

          {/* Bottom row: WARS left, buttons right */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-3 pb-2">
            {/* WARS */}
            <span
              className="font-accent game-title-text select-none pointer-events-none"
              style={{
                color: "#FFD700",
                textShadow: "0 6px 0 rgba(0,0,0,0.55), 0 0 80px rgba(255,215,0,0.15)",
                letterSpacing: "-0.02em",
              }}
            >
              WARS
            </span>

            {/* Buttons — bottom right, centered column */}
            <div className="flex flex-col items-center gap-2 pb-10 pr-4">
              <CustomButton
                onClick={() => setScreen("difficulty")}
                fillColor="#FFD700"
                strokeColor="#FFD700"
                textColor="#2C1810"
              >
                PLAY NOW
              </CustomButton>
              {saveExists && (
                <button
                  onClick={handleLoad}
                  className="text-sm tracking-widest font-bold hover:opacity-80 transition-opacity"
                  style={{ color: "#FFD700", fontFamily: "monospace", textShadow: "0 2px 0 rgba(0,0,0,0.6)" }}
                >
                  LOAD GAME
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DIFFICULTY SELECT ── */}
      {screen === "difficulty" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "radial-gradient(ellipse at center, #2a1a0a 0%, #1a0a00 60%, #0a0500 100%)", fontFamily: "monospace" }}
        >
          {/* Parchment card */}
          <div
            className="relative flex flex-col items-center px-12 py-10"
            style={{
              background: "linear-gradient(160deg, #c8a96e 0%, #b8924a 40%, #a07830 100%)",
              border: "3px solid #6B4423",
              boxShadow: "0 0 0 6px rgba(107,68,35,0.3), 0 20px 60px rgba(0,0,0,0.8)",
              minWidth: 520,
              clipPath: "polygon(0 2%, 3% 0, 97% 0, 100% 2%, 100% 98%, 97% 100%, 3% 100%, 0 98%)",
            }}
          >
            <div className="text-xs tracking-widest mb-1 opacity-60" style={{ color: "#3d1f0a" }}>── FRONTIER WARS ──</div>
            <h2 className="text-3xl font-bold tracking-widest mb-2" style={{ color: "#1a0a00" }}>SELECT DIFFICULTY</h2>
            <div className="text-xs tracking-widest mb-8 opacity-50" style={{ color: "#3d1f0a" }}>
              Choose your challenge, partner
            </div>

            <div className="flex flex-col gap-3 w-full">
              {(["tenderfoot", "gunslinger", "outlaw", "legend"] as Difficulty[]).map((d) => {
                const def = DIFFICULTY_DEFS[d];
                const isSelected = difficulty === d;
                const skullColors = ["#8B6914", "#c8a000", "#cc4400", "#cc0000"];
                const dIdx = ["tenderfoot", "gunslinger", "outlaw", "legend"].indexOf(d);
                const skullColor = skullColors[dIdx];
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className="flex items-center gap-4 px-5 py-4 text-left transition-all duration-150"
                    style={{
                      background: isSelected ? "rgba(107,68,35,0.4)" : "rgba(107,68,35,0.1)",
                      border: `2px solid ${isSelected ? "#6B4423" : "rgba(107,68,35,0.3)"}`,
                      outline: isSelected ? "2px solid #FFD700" : "none",
                      outlineOffset: -2,
                      fontFamily: "monospace",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(107,68,35,0.3)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isSelected ? "rgba(107,68,35,0.4)" : "rgba(107,68,35,0.1)"; }}
                  >
                    {/* Skulls */}
                    <div className="flex gap-0.5 flex-shrink-0 w-16 justify-center">
                      {Array.from({ length: def.skulls }).map((_, i) => (
                        <span key={i} style={{ color: skullColor, fontSize: 16 }}>💀</span>
                      ))}
                    </div>
                    {/* Info */}
                    <div className="flex-1">
                      <div className="font-bold tracking-widest text-sm" style={{ color: isSelected ? "#FFD700" : "#1a0a00" }}>
                        {def.label}
                      </div>
                      <div className="text-xs mt-0.5 opacity-70" style={{ color: "#3d1f0a" }}>
                        {def.description}
                      </div>
                    </div>
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="text-lg flex-shrink-0" style={{ color: "#FFD700" }}>★</div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setScreen("campaign")}
              className="mt-8 border-2 px-12 py-3 text-lg tracking-widest font-bold transition-all duration-200 hover:scale-105"
              style={{
                borderColor: "#FFD700", color: "#FFD700", fontFamily: "monospace",
                boxShadow: "0 0 20px rgba(255,215,0,0.3)",
              }}
            >
              RIDE OUT →
            </button>

            <button
              onClick={() => setScreen("menu")}
              className="mt-3 text-xs tracking-widest opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: "#3d1f0a", fontFamily: "monospace" }}
            >
              ← BACK
            </button>
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
                startBattleFromEntry(currentEntry);
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
          onRespec={handleRespec}
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
