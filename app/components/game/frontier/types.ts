// ─── Frontier Wars — Core Types ───────────────────────────────────────────────

export type UnitType = "miner" | "deputy" | "bounty_hunter" | "gunslinger" | "dynamiter" | "marshal"
  | "brave" | "archer" | "shaman" | "chief" | "mounted_brave";
export type Team = "player" | "enemy";
export type GamePhase = "MENU" | "CAMPAIGN_MAP" | "BATTLE" | "UPGRADE" | "VICTORY" | "DEFEAT";
export type UnitState = "idle" | "walking" | "mining" | "returning" | "attacking" | "garrison" | "dying" | "dead";
export type Stance = "defense" | "garrison" | "attack";
export type Biome =
  | "desert"     // Dusty Gulch — classic orange western
  | "mesa"       // Rattlesnake Ridge — red rock Arizona
  | "canyon"     // Dead Man's Pass — dusty stone canyon
  | "prairie"    // Goldfield — bright open plains
  | "badlands"   // Tombstone — overcast gray/purple
  | "industrial" // Iron Valley — smoky railroad town
  | "volcanic"   // Devil's Canyon — blood red hellscape
  | "snow"       // The Last Stand — cold blue winter
  | "forest"     // Ambush I — wooded ambush
  | "river"      // Ambush II — muddy riverbank
  | "sacred";    // Ambush III — sacred red earth

// ─── Difficulty ───────────────────────────────────────────────────────────────
export type Difficulty = "tenderfoot" | "gunslinger" | "outlaw" | "legend";

// ─── AI Strategy (per level) ──────────────────────────────────────────────────
export type AiStrategy =
  | "economy_first"  // heavy miner spam, slow military
  | "rush"           // fast early aggression
  | "turtle"         // slow build then massive wave
  | "economy_war"    // races for gold supremacy
  | "siege"          // ranged-heavy, avoids melee
  | "balanced"       // smart mix, adapts mid-game
  | "swarm"          // floods with cheap units
  | "adaptive";      // analyzes player comp and counters

export interface Vec2 { x: number; y: number; }

export interface UnitStats {
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  range: number;         // attack range in pixels
  attackRate: number;    // attacks per second
  cost: number;
  mineAmount: number;    // gold per mining trip (miners only)
  mineTime: number;      // seconds to mine
}

export interface Unit {
  id: string;
  type: UnitType;
  team: Team;
  pos: Vec2;
  stats: UnitStats;
  state: UnitState;
  facing: 1 | -1;        // 1 = right, -1 = left
  attackCooldown: number;
  mineTimer: number;
  animFrame: number;
  animTimer: number;
  targetId: string | null;
  goldCarrying: number;
  selected: boolean;     // player-controlled (possession mechanic)
  deathTimer: number;
  laneY: number;         // assigned Y position for this unit's lane
}

export interface Building {
  id: string;
  type: "mine" | "saloon" | "enemy_saloon" | "tipi";
  team: Team;
  pos: Vec2;
  hp: number;
  maxHp: number;
  width: number;
  height: number;
}

export interface GoldPile {
  id: string;
  pos: Vec2;
  gold: number;       // current gold remaining
  maxGold: number;    // starting gold (for phase calculation)
}

export interface Projectile {
  id: string;
  pos: Vec2;
  vel: Vec2;
  team: Team;
  damage: number;
  type: "bullet" | "dynamite" | "shotgun_blast";
  life: number;          // seconds remaining
  exploded: boolean;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  pos: Vec2;
  text: string;
  color: string;
  life: number;
  vel: Vec2;
}

export interface GameState {
  phase: GamePhase;
  level: number;
  gold: number;
  units: Unit[];
  buildings: Building[];
  goldPiles: GoldPile[];
  projectiles: Projectile[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  spawnQueue: UnitType[];
  // Training system
  trainingUnit: UnitType | null;
  trainingProgress: number;   // seconds elapsed
  trainingTime: number;       // total seconds needed
  // Passive income
  passiveGoldTimer: number;
  // Stance
  stance: Stance;
  garrisonExitTimer: number;  // countdown before miners leave garrison (2.5s delay)
  // Enemy
  enemyGold: number;
  enemySpawnTimer: number;
  upgradePoints: number;
  upgrades: UpgradeState;
  cameraX: number;
  manualCamera: boolean;
  selectedUnitId: string | null;
  time: number;
  nightfall: boolean;
  soundEvents: string[]; // sound IDs to play this frame (consumed by FrontierWars)
  unlockedUnits: string[]; // unit types the player can currently spawn
  isAmbushLevel: boolean;  // true → hide enemy gold, no miner economy
  difficulty: Difficulty;  // selected difficulty
  aiStrategy: AiStrategy;  // current level's AI strategy
  enemyGarrisoned: boolean; // enemy has retreated to garrison
  biome: Biome;             // visual biome for this level's background
}

export interface UpgradeState {
  minerSpeed: number;       // 0-3
  minerCapacity: number;    // 0-3
  deputyHp: number;         // 0-3
  deputyDamage: number;     // 0-3
  bountyHp: number;         // 0-3
  bountyDamage: number;     // 0-3
  gunslingerRange: number;  // 0-3
  gunslingerRate: number;   // 0-3
  dynamiterRadius: number;  // 0-3
  marshalHp: number;        // 0-3
  saloonRevenue: number;    // 0-4 → 2/4/6/8/10 gold/sec
  saloonHp: number;         // 0-3 → +300 HP/level, grows saloon visually
}

export interface LevelConfig {
  name: string;
  subtitle: string;
  startGold: number;
  enemyAggression: number;  // 0-1, how often enemy spawns
  enemyBudget: number;      // total gold enemy can spend
  enemyUnits: Partial<Record<UnitType, number>>; // max of each type
  mapX: Vec2;               // position on campaign map
  unlocks: UnitType[];      // units unlocked after this level
  isAmbush?: boolean;       // Native ambush encounter — no mining, wave spawns
  ambushTier?: 1 | 2 | 3;  // 1=scouts, 2=war party, 3=last stand
  lore?: string[];          // multi-line lore text for briefing screen
  enemyLabel?: string;      // label shown on enemy structure in HUD
  aiStrategy?: AiStrategy;  // AI behavior pattern for this level
  biome?: Biome;            // visual biome for this level's background
}

// ─── Color Palette ────────────────────────────────────────────────────────────

export const COLORS = {
  // Sky
  skyTop: "#1a0a2e",
  skyBottom: "#c2713a",
  // Ground
  ground: "#8B5E3C",
  groundDark: "#6B4423",
  dirt: "#A0714F",
  // Desert
  sand: "#D4A96A",
  sandLight: "#E8C88A",
  mesa: "#B85C38",
  // Vegetation
  cactus: "#4A7C59",
  cactusDark: "#2D5C3A",
  // Player units
  playerSkin: "#F4C27F",
  playerCloth: "#4A6FA5",
  playerHat: "#3D2B1F",
  playerBadge: "#FFD700",
  // Enemy units
  enemySkin: "#E8A060",
  enemyCloth: "#8B2020",
  enemyHat: "#1A1A1A",
  // Gold
  gold: "#FFD700",
  goldDark: "#B8860B",
  // UI
  uiBg: "#2C1810",
  uiBorder: "#8B5E3C",
  uiText: "#F4E4C1",
  uiGold: "#FFD700",
  uiRed: "#CC2200",
  uiGreen: "#4CAF50",
  // HP bars
  hpGreen: "#4CAF50",
  hpRed: "#CC2200",
  hpBg: "#333",
  // Buildings
  saloonWood: "#8B5E3C",
  saloonRoof: "#5C3317",
  mineShaft: "#4A3728",
  mineBeam: "#6B4423",
};
