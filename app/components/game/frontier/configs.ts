// ─── Frontier Wars — Unit & Level Configs ─────────────────────────────────────

import type { UnitStats, UnitType, LevelConfig, UpgradeState } from "./types";

// ─── Base Unit Stats ──────────────────────────────────────────────────────────

export const BASE_STATS: Record<UnitType, UnitStats> = {
  miner: {
    hp: 60, maxHp: 60,
    damage: 8, speed: 55, range: 30,
    attackRate: 0.8, cost: 150,
    mineAmount: 100, mineTime: 3.0,
  },
  deputy: {
    hp: 120, maxHp: 120,
    damage: 18, speed: 65, range: 40,
    attackRate: 1.2, cost: 200,
    mineAmount: 0, mineTime: 0,
  },
  gunslinger: {
    hp: 80, maxHp: 80,
    damage: 22, speed: 60, range: 180,
    attackRate: 1.5, cost: 400,
    mineAmount: 0, mineTime: 0,
  },
  dynamiter: {
    hp: 90, maxHp: 90,
    damage: 55, speed: 50, range: 120,
    attackRate: 0.5, cost: 600,
    mineAmount: 0, mineTime: 0,
  },
  bounty_hunter: {
    hp: 220, maxHp: 220,
    damage: 28, speed: 45, range: 45,
    attackRate: 0.9, cost: 500,
    mineAmount: 0, mineTime: 0,
  },
  marshal: {
    hp: 400, maxHp: 400,
    damage: 35, speed: 40, range: 50,
    attackRate: 0.8, cost: 1200,
    mineAmount: 0, mineTime: 0,
  },
  // ── Native faction units (enemy-only, no cost) ──
  brave: {
    hp: 80, maxHp: 80,
    damage: 14, speed: 80, range: 35,
    attackRate: 1.4, cost: 0,
    mineAmount: 0, mineTime: 0,
  },
  archer: {
    hp: 60, maxHp: 60,
    damage: 18, speed: 65, range: 160,
    attackRate: 1.0, cost: 0,
    mineAmount: 0, mineTime: 0,
  },
  shaman: {
    hp: 70, maxHp: 70,
    damage: 45, speed: 45, range: 110,
    attackRate: 0.45, cost: 0,
    mineAmount: 0, mineTime: 0,
  },
  chief: {
    hp: 500, maxHp: 500,
    damage: 40, speed: 38, range: 55,
    attackRate: 0.9, cost: 0,
    mineAmount: 0, mineTime: 0,
  },
  mounted_brave: {
    hp: 140, maxHp: 140,
    damage: 28, speed: 130, range: 45,
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
    // Level 0 — enemy has miner + deputy only; no new unlocks (you already start with both)
    name: "Dusty Gulch",
    subtitle: "The Outlaw Gang moves in. Drive them out.",
    startGold: 500,
    enemyAggression: 0.3,
    enemyBudget: 1500,
    enemyUnits: { miner: 3, deputy: 5 },
    mapX: { x: 120, y: 280 },
    unlocks: [], // miner + deputy already unlocked at start
  },
  {
    // Level 1 — first time you face Gunslingers; beat them to unlock them
    name: "Rattlesnake Ridge",
    subtitle: "They've hired guns. Watch your flanks.",
    startGold: 600,
    enemyAggression: 0.4,
    enemyBudget: 2200,
    enemyUnits: { miner: 4, deputy: 6, gunslinger: 3 },
    mapX: { x: 220, y: 240 },
    unlocks: ["gunslinger"], // beat gunslingers → unlock gunslingers
  },
  {
    // Level 2 — first time you face Bounty Hunters; beat them to unlock them
    name: "Dead Man's Pass",
    subtitle: "Fast and relentless. Don't let them reach your saloon.",
    startGold: 700,
    enemyAggression: 0.5,
    enemyBudget: 3000,
    enemyUnits: { miner: 3, deputy: 8, bounty_hunter: 3, gunslinger: 4 },
    mapX: { x: 310, y: 200 },
    unlocks: ["bounty_hunter"], // beat bounty hunters → unlock bounty hunters
  },
  {
    name: "Goldfield",
    subtitle: "Rich territory. Your miners earn double — but so do theirs.",
    startGold: 800,
    enemyAggression: 0.45,
    enemyBudget: 3800,
    enemyUnits: { miner: 6, deputy: 6, bounty_hunter: 4, gunslinger: 5 },
    mapX: { x: 400, y: 230 },
    unlocks: [],
  },
  {
    // Level 4 — first time you face Dynamiters; beat them to unlock them
    name: "Tombstone",
    subtitle: "They've got dynamite. Keep your units spread out.",
    startGold: 750,
    enemyAggression: 0.5,
    enemyBudget: 4500,
    enemyUnits: { miner: 4, deputy: 6, bounty_hunter: 3, gunslinger: 4, dynamiter: 3 },
    mapX: { x: 490, y: 260 },
    unlocks: ["dynamiter"], // beat dynamiters → unlock dynamiters
  },
  {
    // Level 5 — first time you face Marshals; beat them to unlock them
    name: "Iron Valley",
    subtitle: "The Railroad Baron sends his enforcers.",
    startGold: 900,
    enemyAggression: 0.55,
    enemyBudget: 5500,
    enemyUnits: { miner: 5, deputy: 8, bounty_hunter: 4, gunslinger: 5, dynamiter: 3, marshal: 2 },
    mapX: { x: 580, y: 210 },
    unlocks: ["marshal"], // beat marshals → unlock marshals
  },
  {
    name: "Devil's Canyon",
    subtitle: "Every outlaw in the territory. Hold the line.",
    startGold: 1000,
    enemyAggression: 0.65,
    enemyBudget: 7500,
    enemyUnits: { miner: 6, deputy: 10, bounty_hunter: 5, gunslinger: 6, dynamiter: 4, marshal: 3 },
    mapX: { x: 660, y: 240 },
    unlocks: [],
  },
  {
    name: "The Last Stand",
    subtitle: "The Cartel's final push. This ends today.",
    startGold: 1200,
    enemyAggression: 0.75,
    enemyBudget: 11000,
    enemyUnits: { miner: 8, deputy: 12, bounty_hunter: 6, gunslinger: 8, dynamiter: 6, marshal: 5 },
    mapX: { x: 760, y: 270 },
    unlocks: [],
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
];

// ─── World Constants ──────────────────────────────────────────────────────────

export const WORLD = {
  width: 2600,       // total world width — extra room behind enemy saloon
  height: 480,       // canvas height
  groundY: 410,      // y position of ground surface — lower, like Stick Wars (~85% from top)
  hudHeight: 120,    // bottom HUD height
  mineX: 80,         // player mine x position
  playerSaloonX: 40, // player saloon x
  enemySaloonX: 2460,// enemy saloon x (pushed right, ~140px from right edge)
  enemyMineX: 2500,  // enemy mine x
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

export const GOLD_PILE_POSITIONS: Array<{ x: number; gold: number }> = [
  { x: 200,  gold: 400 },  // near player base — safe, low yield
  { x: 380,  gold: 350 },  // near player base — safe, low yield
  { x: 700,  gold: 500 },  // mid-left — moderate risk
  { x: 900,  gold: 500 },  // mid-left — moderate risk
  { x: 1100, gold: 600 },  // center — contested
  { x: 1200, gold: 700 },  // center — contested, high yield
  { x: 1300, gold: 600 },  // center — contested
  { x: 1500, gold: 500 },  // mid-right — enemy territory
  { x: 1700, gold: 500 },  // mid-right — enemy territory
  { x: 2020, gold: 350 },  // near enemy base — dangerous
  { x: 2200, gold: 400 },  // near enemy base — dangerous
];
