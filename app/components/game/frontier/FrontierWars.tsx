// ─── Frontier Wars — Main Game Component ──────────────────────────────────────

import { useEffect, useRef, useCallback, useState } from "react";
import type { GameState, UnitType, UpgradeState } from "./types";
import { createInitialState, updateGame, queueUnit, selectUnit, setStance, movePossessedUnit, possessedAttack } from "./engine";
import { render } from "./renderer";
import { WORLD, LEVELS, UPGRADE_DEFS } from "./configs";
import { COLORS } from "./types";

// ─── Default Upgrades ─────────────────────────────────────────────────────────

const DEFAULT_UPGRADES: UpgradeState = {
  minerSpeed: 0, minerCapacity: 0,
  deputyHp: 0, deputyDamage: 0,
  gunslingerRange: 0, gunslingerRate: 0,
  dynamiterRadius: 0, marshalHp: 0,
  saloonRevenue: 0,
};

// ─── Campaign Map Component ───────────────────────────────────────────────────

function CampaignMap({
  currentLevel,
  completedLevels,
  onSelectLevel,
}: {
  currentLevel: number;
  completedLevels: number[];
  onSelectLevel: (level: number) => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(180deg, #1a0a2e 0%, #7a3520 60%, #8B5E3C 100%)", fontFamily: "monospace" }}>
      <div className="text-center mb-8">
        <div className="text-xs tracking-widest mb-2" style={{ color: "#8B6914" }}>FRONTIER WARS</div>
        <h2 className="text-4xl font-bold tracking-widest" style={{ color: "#FFD700", textShadow: "0 0 20px #FFD700" }}>
          CAMPAIGN MAP
        </h2>
        <div className="text-sm mt-2" style={{ color: "#F4E4C1", opacity: 0.7 }}>Select your next territory</div>
      </div>

      {/* Trail map */}
      <div className="relative" style={{ width: 900, height: 320 }}>
        {/* Trail line */}
        <svg className="absolute inset-0" width="900" height="320">
          <path
            d="M 120 280 Q 170 260 220 240 Q 265 220 310 200 Q 355 215 400 230 Q 445 245 490 260 Q 535 235 580 210 Q 620 225 660 240 Q 710 255 760 270"
            fill="none" stroke="#8B6914" strokeWidth="3" strokeDasharray="8,4" opacity="0.6"
          />
        </svg>

        {/* Level nodes */}
        {LEVELS.map((lvl, i) => {
          const isCompleted = completedLevels.includes(i);
          const isCurrent = i === currentLevel;
          const isLocked = i > currentLevel && !completedLevels.includes(i);
          const positions = [
            { x: 120, y: 280 }, { x: 220, y: 240 }, { x: 310, y: 200 },
            { x: 400, y: 230 }, { x: 490, y: 260 }, { x: 580, y: 210 },
            { x: 660, y: 240 }, { x: 760, y: 270 },
          ];
          const pos = positions[i];

          return (
            <div
              key={i}
              role="button"
              tabIndex={isLocked ? -1 : 0}
              className="absolute flex flex-col items-center cursor-pointer group"
              style={{ left: pos.x - 30, top: pos.y - 30, width: 60 }}
              onClick={() => !isLocked && onSelectLevel(i)}
              onKeyDown={(e) => { if (!isLocked && (e.key === "Enter" || e.key === " ")) onSelectLevel(i); }}
            >
              {/* Node circle */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200"
                style={{
                  background: isCompleted ? "#4CAF50" : isCurrent ? "#FFD700" : isLocked ? "#333" : "#8B5E3C",
                  borderColor: isCompleted ? "#2d8a30" : isCurrent ? "#FFD700" : isLocked ? "#555" : "#6B4423",
                  boxShadow: isCurrent ? "0 0 20px #FFD700" : isCompleted ? "0 0 10px #4CAF50" : "none",
                  opacity: isLocked ? 0.4 : 1,
                }}
              >
                <span className="text-lg">
                  {isCompleted ? "✓" : isLocked ? "🔒" : `${i + 1}`}
                </span>
              </div>
              {/* Label */}
              <div
                className="text-center mt-1 text-xs leading-tight"
                style={{ color: isCurrent ? "#FFD700" : isCompleted ? "#4CAF50" : "#F4E4C1", opacity: isLocked ? 0.4 : 1 }}
              >
                {lvl.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected level info */}
      <div className="mt-6 border p-4 text-center" style={{ borderColor: "#8B5E3C", color: "#F4E4C1", minWidth: 320 }}>
        <div className="text-lg font-bold" style={{ color: "#FFD700" }}>
          {LEVELS[currentLevel].name}
        </div>
        <div className="text-sm mt-1 opacity-70">{LEVELS[currentLevel].subtitle}</div>
        <button
          onClick={() => onSelectLevel(currentLevel)}
          className="mt-4 border-2 px-8 py-2 text-sm tracking-widest font-bold transition-all duration-200 hover:bg-yellow-600"
          style={{ borderColor: "#FFD700", color: "#FFD700", fontFamily: "monospace" }}
        >
          RIDE OUT →
        </button>
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

      <div className="grid grid-cols-2 gap-3 max-w-2xl w-full px-4">
        {UPGRADE_DEFS.map(def => {
          const current = upgrades[def.key];
          const maxed = current >= def.maxLevel;
          const canAfford = upgradePoints >= def.cost;

          return (
            <div
              key={def.key}
              className="border p-3"
              style={{ borderColor: maxed ? "#4CAF50" : "#8B5E3C", background: "rgba(44,24,16,0.8)" }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-bold" style={{ color: maxed ? "#4CAF50" : "#FFD700" }}>
                    {def.label}
                  </div>
                  <div className="text-xs opacity-60 mt-0.5" style={{ color: "#F4E4C1" }}>
                    {def.description}
                  </div>
                </div>
                <div className="text-xs ml-2" style={{ color: "#8B6914" }}>
                  {def.cost}pt
                </div>
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
  const [isMobile, setIsMobile] = useState(false);

  // ── Mobile detection ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || ("ontouchstart" in window && window.innerWidth < 1024));
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [screen, setScreen] = useState<"menu" | "campaign" | "battle" | "upgrade" | "victory" | "defeat">("menu");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeState>(DEFAULT_UPGRADES);
  const [upgradePoints, setUpgradePoints] = useState(0);
  const [hudGold, setHudGold] = useState(0);

  // ── Game loop ──
  const gameLoop = useCallback((timestamp: number) => {
    if (!canvasRef.current || !stateRef.current) return;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

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

    // Camera: arrow keys override auto-follow (only when no unit possessed)
    const leftHeld = keysHeldRef.current.has("ArrowLeft");
    const rightHeld = keysHeldRef.current.has("ArrowRight");

    if (leftHeld || rightHeld) {
      // Manual scroll — 500px/sec
      stateRef.current.manualCamera = true;
      stateRef.current.cameraX += (rightHeld ? 1 : -1) * 500 * dt;
      stateRef.current.cameraX = Math.max(0, Math.min(maxCam, stateRef.current.cameraX));
    } else {
      stateRef.current.manualCamera = false;
      const playerUnits = stateRef.current.units.filter(u => u.team === "player" && u.state !== "dead");
      if (playerUnits.length > 0) {
        const avgX = playerUnits.reduce((s, u) => s + u.pos.x, 0) / playerUnits.length;
        const targetCam = Math.max(0, Math.min(maxCam, avgX - vw * 0.4));
        stateRef.current.cameraX += (targetCam - stateRef.current.cameraX) * 0.05;
      }
    }

    // Sync gold to React state (throttled)
    setHudGold(stateRef.current.gold);

    // Check phase transitions
    if (stateRef.current.phase === "VICTORY") {
      setUpgradePoints(prev => prev + 2);
      setCompletedLevels(prev => [...new Set([...prev, currentLevel])]);
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

  // ── Start battle ──
  const startBattle = useCallback((level: number) => {
    stateRef.current = createInitialState(level, upgrades);
    setScreen("battle");
    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(gameLoop);

    // Background music — use dramatic.mp3 (already in public/sounds)
    stopBgMusic();
    try {
      const music = new Audio("/sounds/dramatic.mp3");
      music.volume = 0.25;
      music.loop = true;
      music.play().catch(() => {});
      bgMusicRef.current = music;
    } catch (e) { void e; }
  }, [upgrades, gameLoop]);

  const stopBgMusic = () => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current = null;
    }
  };

  // ── Input handling ──
  useEffect(() => {
    if (screen !== "battle") return;

    const keyMap: Record<string, UnitType> = {
      "1": "miner", "2": "deputy", "3": "gunslinger", "4": "dynamiter", "5": "marshal",
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

      // Prevent arrow/space from scrolling the page
      if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
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

        // ── Stance buttons (left side, at hudY+68, matching renderer) ──
        const stanceBtnW = 58, stanceBtnH = 22, stanceGap = 4;
        const stanceStartX = 16, stanceStartY = hudY + 68;
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
        const unitTypes: UnitType[] = ["miner", "deputy", "gunslinger", "dynamiter", "marshal"];

        for (let i = 0; i < 5; i++) {
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
          onSelectLevel={(level) => {
            setCurrentLevel(level);
            startBattle(level);
          }}
        />
      )}

      {/* ── BATTLE ── */}
      {screen === "battle" && (
        <div ref={containerRef} className="absolute inset-0 flex items-center justify-center bg-black">
          <canvas ref={canvasRef} style={{ display: "block", imageRendering: "pixelated" }} />
          {/* Overlay: gold display (React-synced) */}
          <div className="absolute top-2 left-2 z-10 pointer-events-none"
            style={{ fontFamily: "monospace", color: COLORS.uiGold, fontSize: 14 }}>
          </div>
          {/* Retreat button — positioned relative to canvas */}
          <button
            onClick={() => {
              cancelAnimationFrame(animFrameRef.current);
              stopBgMusic();
              setScreen("campaign");
            }}
            className="absolute top-2 right-2 z-10 border px-3 py-1 text-xs tracking-widest opacity-50 hover:opacity-80 transition-opacity"
            style={{ borderColor: "#8B5E3C", color: "#F4E4C1", fontFamily: "monospace" }}
          >
            RETREAT
          </button>
        </div>
      )}

      {/* ── UPGRADE ── */}
      {screen === "upgrade" && (
        <UpgradeScreen
          upgrades={upgrades}
          upgradePoints={upgradePoints}
          onUpgrade={handleUpgrade}
          onContinue={() => {
            const nextLevel = Math.min(currentLevel + 1, LEVELS.length - 1);
            setCurrentLevel(nextLevel);
            setScreen("campaign");
          }}
        />
      )}

      {/* ── VICTORY (cinematic end scene) ── */}
      {screen === "victory" && (
        <VictoryScene
          level={currentLevel}
          onContinue={() => {
            const nextLevel = currentLevel + 1;
            if (nextLevel >= LEVELS.length) {
              // Beat the whole campaign — show grand finale
              setScreen("menu");
            } else {
              setScreen("upgrade");
            }
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
                onClick={() => startBattle(currentLevel)}
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
