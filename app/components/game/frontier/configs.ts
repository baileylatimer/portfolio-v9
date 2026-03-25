// ─── Frontier Wars — Unit & Level Configs ─────────────────────────────────────

import type { UnitStats, UnitType, LevelConfig, UpgradeState, Difficulty, Biome } from "./types";

// ─── Difficulty Multipliers ───────────────────────────────────────────────────

export interface DifficultyMult {
  label: string;
  description: string;
  skulls: number;           // 1-4 for UI display
  enemyHp: number;          // multiplier on enemy unit HP
  enemyDamage: number;      // multiplier on enemy unit damage
  enemyStartGold: number;   // multiplier on enemy starting gold
  enemySpawnSpeed: number;  // multiplier on spawn timer (lower = faster)
  enemyAggression: number;  // additive bonus to aggression
  playerStartGold: number;  // multiplier on player starting gold
  passiveGold: number;      // multiplier on passive gold income
}

export const DIFFICULTY_DEFS: Record<Difficulty, DifficultyMult> = {
  tenderfoot: {
    label: "TENDERFOOT",
    description: "For greenhorns just off the stagecoach. Enemy is slow and underfunded.",
    skulls: 1,
    enemyHp: 0.75, enemyDamage: 0.75, enemyStartGold: 0.6,
    enemySpawnSpeed: 0.65, enemyAggression: -0.12,
    playerStartGold: 1.4, passiveGold: 1.3,
  },
  gunslinger: {
    label: "GUNSLINGER",
    description: "A fair fight. The current balanced experience.",
    skulls: 2,
    enemyHp: 1.0, enemyDamage: 1.0, enemyStartGold: 1.0,
    enemySpawnSpeed: 1.0, enemyAggression: 0,
    playerStartGold: 1.0, passiveGold: 1.0,
  },
  outlaw: {
    label: "OUTLAW",
    description: "They're meaner, faster, and better funded. Bring your best.",
    skulls: 3,
    enemyHp: 1.35, enemyDamage: 1.25, enemyStartGold: 1.6,
    enemySpawnSpeed: 1.35, enemyAggression: 0.15,
    playerStartGold: 0.85, passiveGold: 0.8,
  },
  legend: {
    label: "LEGEND OF THE WEST",
    description: "Only the deadliest survive. No mercy, no quarter.",
    skulls: 4,
    enemyHp: 1.7, enemyDamage: 1.55, enemyStartGold: 2.2,
    enemySpawnSpeed: 1.7, enemyAggression: 0.28,
    playerStartGold: 0.65, passiveGold: 0.55,
  },
};

// ─── Base Unit Stats ──────────────────────────────────────────────────────────

// All speeds bumped +18% from original values for snappier feel
export const BASE_STATS: Record<UnitType, UnitStats> = {
  miner: {
    hp: 60, maxHp: 60,
    damage: 8, speed: 65, range: 30,
    attackRate: 0.8, cost: 150,
    mineAmount: 100, mineTime: 3.0,
  },
  deputy: {
    hp: 120, maxHp: 120,
    damage: 18, speed: 77, range: 40,
    attackRate: 1.2, cost: 200,
    mineAmount: 0, mineTime: 0,
  },
  gunslinger: {
    hp: 80, maxHp: 80,
    damage: 22, speed: 71, range: 180,
    attackRate: 1.5, cost: 400,
    mineAmount: 0, mineTime: 0,
  },
  dynamiter: {
    hp: 90, maxHp: 90,
    damage: 55, speed: 59, range: 120,
    attackRate: 0.5, cost: 600,
    mineAmount: 0, mineTime: 0,
  },
  bounty_hunter: {
    hp: 220, maxHp: 220,
    damage: 28, speed: 53, range: 45,
    attackRate: 0.9, cost: 500,
    mineAmount: 0, mineTime: 0,
  },
  marshal: {
    hp: 400, maxHp: 400,
    damage: 35, speed: 47, range: 50,
    attackRate: 0.8, cost: 1200,
    mineAmount: 0, mineTime: 0,
  },
  // ── Native faction units (enemy-only, no cost) ──
  brave: {
    hp: 80, maxHp: 80,
    damage: 14, speed: 94, range: 35,
    attackRate: 1.4, cost: 0,
    mineAmount: 0, mineTime: 0,
  },
  archer: {
    hp: 60, maxHp: 60,
    damage: 18, speed: 77, range: 160,
    attackRate: 1.0, cost: 0,
    mineAmount: 0, mineTime: 0,
  },
  shaman: {
    hp: 70, maxHp: 70,
    damage: 45, speed: 53, range: 110,
    attackRate: 0.45, cost: 0,
    mineAmount: 0, mineTime: 0,
  },
  chief: {
    hp: 500, maxHp: 500,
    damage: 40, speed: 45, range: 55,
    attackRate: 0.9, cost: 0,
    mineAmount: 0, mineTime: 0,
  },
  mounted_brave: {
    hp: 140, maxHp: 140,
    damage: 28, speed: 153, range: 45,
    attackRate: 1.2, cost: 0,
    mineAmount: 0, mineTime: 0,
  },
};

// Apply upgrades to base stats
export function getStats(type: UnitType, upgrades: UpgradeState): UnitStats {
  const base = { ...BASE_STATS[type] };
  switch (type) {
    case "miner":
      base.speed += upgrades.minerSpeed * 10;
      base.mineAmount += upgrades.minerCapacity * 25; // 100 → 125 → 150 → 175
      base.mineTime = Math.max(1.5, base.mineTime - upgrades.minerCapacity * 0.3);
      break;
    case "deputy":
      base.hp += upgrades.deputyHp * 40;
      base.maxHp = base.hp;
      base.damage += upgrades.deputyDamage * 8;
      break;
    case "bounty_hunter":
      base.hp += upgrades.bountyHp * 60;
      base.maxHp = base.hp;
      base.damage += upgrades.bountyDamage * 10;
      break;
    case "gunslinger":
      base.range += upgrades.gunslingerRange * 30;
      base.attackRate += upgrades.gunslingerRate * 0.4;
      break;
    case "dynamiter":
      // radius handled in combat
      break;
    case "marshal":
      base.hp += upgrades.marshalHp * 100;
      base.maxHp = base.hp;
      break;
  }
  return base;
}

// ─── Level Configs ────────────────────────────────────────────────────────────

// ─── Ambush Level Configs (Native faction) ────────────────────────────────────

export const AMBUSH_LEVELS: LevelConfig[] = [
  {
    name: "Ambush at Dry Creek",
    subtitle: "A Lakota scouting party blocks your path.",
    startGold: 600,
    enemyAggression: 0.55,
    enemyBudget: 0,
    enemyUnits: { brave: 8, archer: 4 },
    mapX: { x: 170, y: 260 },
    unlocks: [],
    isAmbush: true,
    ambushTier: 1,
    enemyLabel: "LAKOTA CAMP",
    biome: "forest",
    lore: [
      "A Lakota scouting party has spotted your caravan crossing their hunting grounds.",
      "They move fast and strike hard — but their numbers are few.",
      "Drive them back and continue west.",
    ],
  },
  {
    name: "The War Party",
    subtitle: "Chief Running Eagle leads a full war party.",
    startGold: 750,
    enemyAggression: 0.65,
    enemyBudget: 0,
    enemyUnits: { brave: 12, archer: 6, shaman: 3, chief: 1 },
    mapX: { x: 535, y: 258 },
    unlocks: [],
    isAmbush: true,
    ambushTier: 2,
    enemyLabel: "WAR CAMP",
    biome: "river",
    lore: [
      "The Lakota have returned — this time with a war party.",
      "Chief Running Eagle rides at their head. He is not a man to be taken lightly.",
      "They came back stronger. So must you.",
    ],
  },
  {
    name: "The Last Stand of the Lakota",
    subtitle: "The entire nation rides against you. This is their land.",
    startGold: 900,
    enemyAggression: 0.8,
    enemyBudget: 0,
    enemyUnits: { brave: 18, archer: 8, shaman: 5, chief: 2, mounted_brave: 6 },
    mapX: { x: 710, y: 252 },
    unlocks: [],
    isAmbush: true,
    ambushTier: 3,
    enemyLabel: "GREAT CAMP",
    biome: "sacred",
    lore: [
      "The Lakota nation rides against you with everything they have.",
      "Mounted braves charge your lines. Shamans rain fire from the hills.",
      "Chief Running Eagle has called every warrior to this fight.",
      "This is their land — and they want it back.",
    ],
  },
];

// ─── Campaign sequence: regular levels interleaved with ambushes ──────────────
// Indices into LEVELS[] and AMBUSH_LEVELS[]:
// 0=Dusty Gulch, 1=Rattlesnake Ridge, AMBUSH_0, 2=Dead Man's Pass, 3=Goldfield,
// 4=Tombstone, AMBUSH_1, 5=Iron Valley, 6=Devil's Canyon, AMBUSH_2, 7=The Last Stand
export type CampaignEntry =
  | { kind: "level"; index: number }
  | { kind: "ambush"; index: number };

export const CAMPAIGN_SEQUENCE: CampaignEntry[] = [
  { kind: "level",  index: 0 },  // Dusty Gulch
  { kind: "level",  index: 1 },  // Rattlesnake Ridge
  { kind: "ambush", index: 0 },  // Ambush I — Dry Creek
  { kind: "level",  index: 2 },  // Dead Man's Pass
  { kind: "level",  index: 3 },  // Goldfield
  { kind: "level",  index: 4 },  // Tombstone
  { kind: "ambush", index: 1 },  // Ambush II — War Party
  { kind: "level",  index: 5 },  // Iron Valley
  { kind: "level",  index: 6 },  // Devil's Canyon
  { kind: "ambush", index: 2 },  // Ambush III — Last Stand
  { kind: "level",  index: 7 },  // The Last Stand
];

export const LEVELS: LevelConfig[] = [
  {
    // Level 0 — economy-first: enemy spams miners, slow military buildup
    name: "Dusty Gulch",
    subtitle: "The Outlaw Gang moves in. Drive them out.",
    startGold: 500,
    enemyAggression: 0.3,
    enemyBudget: 1500,
    enemyUnits: { miner: 3, deputy: 5 },
    mapX: { x: 120, y: 280 },
    unlocks: [],
    aiStrategy: "economy_first",
    biome: "desert",
  },
  {
    // Level 1 — rush: fast early aggression with deputies + gunslingers
    name: "Rattlesnake Ridge",
    subtitle: "They've hired guns. Watch your flanks.",
    startGold: 600,
    enemyAggression: 0.4,
    enemyBudget: 2200,
    enemyUnits: { miner: 4, deputy: 6, gunslinger: 3 },
    mapX: { x: 220, y: 240 },
    unlocks: ["gunslinger"],
    aiStrategy: "rush",
    biome: "mesa",
  },
  {
    // Level 2 — turtle: slow build then massive wave
    name: "Dead Man's Pass",
    subtitle: "Fast and relentless. Don't let them reach your saloon.",
    startGold: 700,
    enemyAggression: 0.5,
    enemyBudget: 3000,
    enemyUnits: { miner: 3, deputy: 8, bounty_hunter: 3, gunslinger: 4 },
    mapX: { x: 310, y: 200 },
    unlocks: ["bounty_hunter"],
    aiStrategy: "turtle",
    biome: "canyon",
  },
  {
    // Level 3 — economy war: 6 miners, races for gold supremacy
    name: "Goldfield",
    subtitle: "Rich territory. Your miners earn double — but so do theirs.",
    startGold: 800,
    enemyAggression: 0.45,
    enemyBudget: 3800,
    enemyUnits: { miner: 6, deputy: 6, bounty_hunter: 4, gunslinger: 5 },
    mapX: { x: 400, y: 230 },
    unlocks: [],
    aiStrategy: "economy_war",
    biome: "prairie",
  },
  {
    // Level 4 — siege: dynamiters + gunslingers from range, avoids melee
    name: "Tombstone",
    subtitle: "They've got dynamite. Keep your units spread out.",
    startGold: 750,
    enemyAggression: 0.5,
    enemyBudget: 4500,
    enemyUnits: { miner: 4, deputy: 6, bounty_hunter: 3, gunslinger: 4, dynamiter: 3 },
    mapX: { x: 490, y: 260 },
    unlocks: ["dynamiter"],
    aiStrategy: "siege",
    biome: "badlands",
  },
  {
    // Level 5 — balanced: smart mix of all units, adapts mid-game
    name: "Iron Valley",
    subtitle: "The Railroad Baron sends his enforcers.",
    startGold: 900,
    enemyAggression: 0.55,
    enemyBudget: 5500,
    enemyUnits: { miner: 5, deputy: 8, bounty_hunter: 4, gunslinger: 5, dynamiter: 3, marshal: 2 },
    mapX: { x: 580, y: 210 },
    unlocks: ["marshal"],
    aiStrategy: "balanced",
    biome: "industrial",
  },
  {
    // Level 6 — swarm: floods with cheap units constantly
    name: "Devil's Canyon",
    subtitle: "Every outlaw in the territory. Hold the line.",
    startGold: 1000,
    enemyAggression: 0.65,
    enemyBudget: 7500,
    enemyUnits: { miner: 6, deputy: 10, bounty_hunter: 5, gunslinger: 6, dynamiter: 4, marshal: 3 },
    mapX: { x: 660, y: 240 },
    unlocks: [],
    aiStrategy: "swarm",
    biome: "volcanic",
  },
  {
    // Level 7 — adaptive: analyzes player comp and counters it
    name: "The Last Stand",
    subtitle: "The Cartel's final push. This ends today.",
    startGold: 1200,
    enemyAggression: 0.75,
    enemyBudget: 11000,
    enemyUnits: { miner: 8, deputy: 12, bounty_hunter: 6, gunslinger: 8, dynamiter: 6, marshal: 5 },
    mapX: { x: 760, y: 270 },
    unlocks: [],
    aiStrategy: "adaptive",
    biome: "snow",
  },
];

// ─── Upgrade Definitions ──────────────────────────────────────────────────────

export interface UpgradeDef {
  key: keyof UpgradeState;
  label: string;
  description: string;
  cost: number; // upgrade points per level
  maxLevel: number;
}

export const UPGRADE_DEFS: UpgradeDef[] = [
  { key: "saloonRevenue",    label: "Saloon Revenue",      description: "+2 gold/sec per level (2→10)",    cost: 1, maxLevel: 4 },
  { key: "minerSpeed",       label: "Prospector Speed",    description: "+10 move speed per level",        cost: 1, maxLevel: 3 },
  { key: "minerCapacity",    label: "Gold Capacity",       description: "+25 gold per trip, faster mining", cost: 1, maxLevel: 3 },
  { key: "deputyHp",         label: "Deputy Toughness",    description: "+40 HP per level",                cost: 1, maxLevel: 3 },
  { key: "deputyDamage",     label: "Deputy Strength",     description: "+8 damage per level",             cost: 1, maxLevel: 3 },
  { key: "bountyHp",         label: "Bounty Hunter HP",    description: "+60 HP per level",                cost: 1, maxLevel: 3 },
  { key: "bountyDamage",     label: "Bounty Hunter Power", description: "+10 damage per level",            cost: 2, maxLevel: 3 },
  { key: "gunslingerRange",  label: "Gunslinger Range",    description: "+30 range per level",             cost: 1, maxLevel: 3 },
  { key: "gunslingerRate",   label: "Quick Draw",          description: "+0.4 attacks/sec per level",      cost: 2, maxLevel: 3 },
  { key: "dynamiterRadius",  label: "Bigger Blast",        description: "+25% explosion radius per level", cost: 2, maxLevel: 3 },
  { key: "marshalHp",        label: "Marshal Fortitude",   description: "+100 HP per level",               cost: 2, maxLevel: 3 },
  { key: "saloonHp",         label: "Saloon Fortification", description: "+300 max HP per level (1500→2400)", cost: 1, maxLevel: 3 },
];

// ─── Upgrade Points Per Level ─────────────────────────────────────────────────
// Scales with campaign progress: early=2, mid=3, late=4, ambush=1 bonus
export function getUpgradePoints(level: number, isAmbush: boolean): number {
  if (isAmbush) return 1;
  if (level <= 2) return 2;
  if (level <= 5) return 3;
  return 4; // levels 6-7
}

// ─── Biome Palette ────────────────────────────────────────────────────────────
export interface BiomePalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  groundTop: string;
  groundMid: string;
  groundBottom: string;
  mtnFar: string;
  mtnNear: string;
  dustColor: string;
  nightSkyTop: string;
  nightSkyMid: string;
  nightSkyBottom: string;
  nightGroundTop: string;
  nightGroundMid: string;
  nightGroundBottom: string;
}

export const BIOME_PALETTES: Record<Biome, BiomePalette> = {
  desert: {
    skyTop: "#1a0a2e", skyMid: "#7a3520", skyBottom: "#c2713a",
    groundTop: "#8B5E3C", groundMid: "#A0714F", groundBottom: "#6B4423",
    mtnFar: "#3d1a0a", mtnNear: "#5c2a12",
    dustColor: "rgba(180,120,60,0.15)",
    nightSkyTop: "#050510", nightSkyMid: "#0a0520", nightSkyBottom: "#1a0a10",
    nightGroundTop: "#4a3020", nightGroundMid: "#3a2010", nightGroundBottom: "#2a1008",
  },
  mesa: {
    skyTop: "#2a0a1a", skyMid: "#8B3520", skyBottom: "#cc5520",
    groundTop: "#8B3020", groundMid: "#A04030", groundBottom: "#6B2010",
    mtnFar: "#5c1a0a", mtnNear: "#8B2a12",
    dustColor: "rgba(180,80,40,0.15)",
    nightSkyTop: "#0a0008", nightSkyMid: "#1a0510", nightSkyBottom: "#2a0a08",
    nightGroundTop: "#3a1010", nightGroundMid: "#2a0808", nightGroundBottom: "#1a0404",
  },
  canyon: {
    skyTop: "#1a1a0a", skyMid: "#6B5020", skyBottom: "#a07030",
    groundTop: "#5a4020", groundMid: "#6B5030", groundBottom: "#4a3010",
    mtnFar: "#3d2a0a", mtnNear: "#5c3a12",
    dustColor: "rgba(150,120,60,0.15)",
    nightSkyTop: "#080808", nightSkyMid: "#181008", nightSkyBottom: "#281808",
    nightGroundTop: "#2a2010", nightGroundMid: "#1a1008", nightGroundBottom: "#0a0800",
  },
  prairie: {
    skyTop: "#0a1a3a", skyMid: "#2a5a8B", skyBottom: "#6aaa60",
    groundTop: "#8B8B20", groundMid: "#a0a030", groundBottom: "#6B6B10",
    mtnFar: "#2a4a0a", mtnNear: "#4a6a1a",
    dustColor: "rgba(180,180,60,0.1)",
    nightSkyTop: "#020510", nightSkyMid: "#050a20", nightSkyBottom: "#0a1a08",
    nightGroundTop: "#3a3a10", nightGroundMid: "#2a2a08", nightGroundBottom: "#1a1a04",
  },
  badlands: {
    skyTop: "#1a1a2a", skyMid: "#4a3a5a", skyBottom: "#7a6a8a",
    groundTop: "#5a5a5a", groundMid: "#6a6a6a", groundBottom: "#4a4a4a",
    mtnFar: "#3a3a4a", mtnNear: "#5a5a6a",
    dustColor: "rgba(150,150,150,0.15)",
    nightSkyTop: "#080810", nightSkyMid: "#101018", nightSkyBottom: "#181820",
    nightGroundTop: "#282828", nightGroundMid: "#181818", nightGroundBottom: "#080808",
  },
  industrial: {
    skyTop: "#1a0a0a", skyMid: "#5a3010", skyBottom: "#8a5020",
    groundTop: "#3a2a1a", groundMid: "#4a3a2a", groundBottom: "#2a1a0a",
    mtnFar: "#2a1a0a", mtnNear: "#4a2a10",
    dustColor: "rgba(160,100,40,0.2)",
    nightSkyTop: "#080404", nightSkyMid: "#100808", nightSkyBottom: "#180c04",
    nightGroundTop: "#1a1208", nightGroundMid: "#100c04", nightGroundBottom: "#080400",
  },
  volcanic: {
    skyTop: "#0a0000", skyMid: "#3a0000", skyBottom: "#8a1000",
    groundTop: "#1a0a00", groundMid: "#2a1000", groundBottom: "#0a0500",
    mtnFar: "#1a0000", mtnNear: "#3a0500",
    dustColor: "rgba(200,50,0,0.15)",
    nightSkyTop: "#050000", nightSkyMid: "#0a0000", nightSkyBottom: "#150000",
    nightGroundTop: "#0f0500", nightGroundMid: "#080300", nightGroundBottom: "#040100",
  },
  snow: {
    skyTop: "#0a1a2a", skyMid: "#2a4a6a", skyBottom: "#6a8aaa",
    groundTop: "#d0d8e0", groundMid: "#e0e8f0", groundBottom: "#b0b8c0",
    mtnFar: "#8a9aaa", mtnNear: "#aabaca",
    dustColor: "rgba(200,220,240,0.1)",
    nightSkyTop: "#020508", nightSkyMid: "#050a10", nightSkyBottom: "#0a1018",
    nightGroundTop: "#8090a0", nightGroundMid: "#6a7a8a", nightGroundBottom: "#505a68",
  },
  forest: {
    skyTop: "#0a1a0a", skyMid: "#2a4a1a", skyBottom: "#5a8a3a",
    groundTop: "#2a4a1a", groundMid: "#3a5a2a", groundBottom: "#1a3a0a",
    mtnFar: "#1a3a0a", mtnNear: "#2a5a1a",
    dustColor: "rgba(100,150,60,0.1)",
    nightSkyTop: "#020804", nightSkyMid: "#040c06", nightSkyBottom: "#081408",
    nightGroundTop: "#101a08", nightGroundMid: "#0a1004", nightGroundBottom: "#040800",
  },
  river: {
    skyTop: "#0a1a2a", skyMid: "#2a4a6a", skyBottom: "#5a8aaa",
    groundTop: "#4a3a1a", groundMid: "#5a4a2a", groundBottom: "#3a2a0a",
    mtnFar: "#2a3a4a", mtnNear: "#4a5a6a",
    dustColor: "rgba(100,120,140,0.1)",
    nightSkyTop: "#020508", nightSkyMid: "#040a10", nightSkyBottom: "#081018",
    nightGroundTop: "#201808", nightGroundMid: "#181004", nightGroundBottom: "#0c0800",
  },
  sacred: {
    skyTop: "#1a0a2a", skyMid: "#4a1a5a", skyBottom: "#8a3a8a",
    groundTop: "#5a1a0a", groundMid: "#6a2a1a", groundBottom: "#4a0a00",
    mtnFar: "#3a0a2a", mtnNear: "#5a1a4a",
    dustColor: "rgba(180,100,180,0.1)",
    nightSkyTop: "#080410", nightSkyMid: "#100818", nightSkyBottom: "#180c18",
    nightGroundTop: "#280a04", nightGroundMid: "#1a0602", nightGroundBottom: "#0c0200",
  },
};

// ─── World Constants ──────────────────────────────────────────────────────────

export const WORLD = {
  width: 3000,       // total world width — wider map for more exploration
  height: 480,       // canvas height
  groundY: 410,      // y position of ground surface — lower, like Stick Wars (~85% from top)
  hudHeight: 120,    // bottom HUD height
  mineX: 80,         // player mine x position
  playerSaloonX: 40, // player saloon x
  enemySaloonX: 2860,// enemy saloon x (pushed right, ~140px from right edge)
  enemyMineX: 2900,  // enemy mine x
};

// ─── Training Times (seconds to produce each unit) ───────────────────────────

export const TRAIN_TIME: Record<string, number> = {
  miner:          3,
  deputy:         5,
  bounty_hunter:  8,
  gunslinger:     7,
  dynamiter:      9,
  marshal:        14,
  // Native units — enemy-only, not player-trainable, but engine needs these
  brave:        2,
  archer:       3,
  shaman:       5,
  chief:        10,
  mounted_brave: 4,
};

// ─── Unit Cap ─────────────────────────────────────────────────────────────────

export const MAX_UNITS = 20;

// ─── Passive Gold ─────────────────────────────────────────────────────────────

export const PASSIVE_GOLD_BASE = 2; // gold/sec at upgrade level 0
// Each saloonRevenue upgrade level adds 2 more gold/sec: 2, 4, 6, 8, 10

export const SPAWN_INTERVAL = 0.8; // kept for enemy AI compatibility

// ─── Gold Pile Positions ──────────────────────────────────────────────────────
// Spread across the 2400px world. Player base ~40px, enemy base ~2340px.
// Near player: 200, 380 | Mid-left: 700, 900 | Center: 1100, 1200, 1300 | Mid-right: 1500, 1700 | Near enemy: 2020, 2200

// yOffset scatters piles vertically across the battlefield (relative to groundY - 8)
// Negative = higher up the screen (toward mountains), positive = lower (toward ground)
export const GOLD_PILE_POSITIONS: Array<{ x: number; gold: number; yOffset?: number }> = [
  { x: 220,  gold: 400, yOffset:   0  },  // near player base — ground level
  { x: 400,  gold: 350, yOffset: -55  },  // near player base — mid-height
  { x: 750,  gold: 500, yOffset: -90  },  // mid-left — high up (near mountains)
  { x: 950,  gold: 500, yOffset: -30  },  // mid-left — slightly elevated
  { x: 1200, gold: 600, yOffset: -70  },  // center — elevated
  { x: 1350, gold: 700, yOffset:   0  },  // center — ground level, high yield
  { x: 1500, gold: 600, yOffset: -50  },  // center — mid-height
  { x: 1750, gold: 500, yOffset: -85  },  // mid-right — high up
  { x: 1950, gold: 500, yOffset: -20  },  // mid-right — near ground
  { x: 2300, gold: 350, yOffset: -60  },  // near enemy base — elevated
  { x: 2550, gold: 400, yOffset:   0  },  // near enemy base — ground level
];
