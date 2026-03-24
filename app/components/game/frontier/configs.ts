// ─── Frontier Wars — Unit & Level Configs ─────────────────────────────────────

import type { UnitStats, UnitType, LevelConfig, UpgradeState } from "./types";

// ─── Base Unit Stats ──────────────────────────────────────────────────────────

export const BASE_STATS: Record<UnitType, UnitStats> = {
  miner: {
    hp: 60, maxHp: 60,
    damage: 8, speed: 55, range: 30,
    attackRate: 0.8, cost: 150,
    mineAmount: 60, mineTime: 3.0,
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
  marshal: {
    hp: 400, maxHp: 400,
    damage: 35, speed: 40, range: 50,
    attackRate: 0.8, cost: 1200,
    mineAmount: 0, mineTime: 0,
  },
};

// Apply upgrades to base stats
export function getStats(type: UnitType, upgrades: UpgradeState): UnitStats {
  const base = { ...BASE_STATS[type] };
  switch (type) {
    case "miner":
      base.speed += upgrades.minerSpeed * 10;
      base.mineAmount += upgrades.minerCapacity * 20;
      base.mineTime = Math.max(1.5, base.mineTime - upgrades.minerCapacity * 0.3);
      break;
    case "deputy":
      base.hp += upgrades.deputyHp * 40;
      base.maxHp = base.hp;
      base.damage += upgrades.deputyDamage * 8;
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

export const LEVELS: LevelConfig[] = [
  {
    name: "Dusty Gulch",
    subtitle: "The Outlaw Gang moves in. Drive them out.",
    startGold: 500,
    enemyAggression: 0.25,
    enemyBudget: 1200,
    enemyUnits: { miner: 3, deputy: 4 },
    mapX: { x: 120, y: 280 },
    unlocks: ["deputy"],
  },
  {
    name: "Rattlesnake Ridge",
    subtitle: "They've hired guns. Watch your flanks.",
    startGold: 600,
    enemyAggression: 0.35,
    enemyBudget: 2000,
    enemyUnits: { miner: 4, deputy: 5, gunslinger: 3 },
    mapX: { x: 220, y: 240 },
    unlocks: ["gunslinger"],
  },
  {
    name: "Dead Man's Pass",
    subtitle: "Fast and relentless. Don't let them reach your saloon.",
    startGold: 700,
    enemyAggression: 0.5,
    enemyBudget: 2800,
    enemyUnits: { miner: 3, deputy: 8, gunslinger: 4 },
    mapX: { x: 310, y: 200 },
    unlocks: [],
  },
  {
    name: "Goldfield",
    subtitle: "Rich territory. Your miners earn double — but so do theirs.",
    startGold: 800,
    enemyAggression: 0.4,
    enemyBudget: 3500,
    enemyUnits: { miner: 6, deputy: 6, gunslinger: 5 },
    mapX: { x: 400, y: 230 },
    unlocks: ["dynamiter"],
  },
  {
    name: "Tombstone",
    subtitle: "They've got dynamite. Keep your units spread out.",
    startGold: 750,
    enemyAggression: 0.45,
    enemyBudget: 4000,
    enemyUnits: { miner: 4, deputy: 6, gunslinger: 4, dynamiter: 3 },
    mapX: { x: 490, y: 260 },
    unlocks: [],
  },
  {
    name: "Iron Valley",
    subtitle: "The Railroad Baron sends his enforcers.",
    startGold: 900,
    enemyAggression: 0.5,
    enemyBudget: 5000,
    enemyUnits: { miner: 5, deputy: 8, gunslinger: 5, dynamiter: 3, marshal: 2 },
    mapX: { x: 580, y: 210 },
    unlocks: ["marshal"],
  },
  {
    name: "Devil's Canyon",
    subtitle: "Every outlaw in the territory. Hold the line.",
    startGold: 1000,
    enemyAggression: 0.6,
    enemyBudget: 7000,
    enemyUnits: { miner: 6, deputy: 10, gunslinger: 6, dynamiter: 4, marshal: 3 },
    mapX: { x: 660, y: 240 },
    unlocks: [],
  },
  {
    name: "The Last Stand",
    subtitle: "The Cartel's final push. This ends today.",
    startGold: 1200,
    enemyAggression: 0.7,
    enemyBudget: 10000,
    enemyUnits: { miner: 8, deputy: 12, gunslinger: 8, dynamiter: 6, marshal: 5 },
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
  { key: "minerCapacity",    label: "Gold Capacity",       description: "+20 gold per trip, faster mining", cost: 1, maxLevel: 3 },
  { key: "deputyHp",         label: "Deputy Toughness",    description: "+40 HP per level",                cost: 1, maxLevel: 3 },
  { key: "deputyDamage",     label: "Deputy Strength",     description: "+8 damage per level",             cost: 1, maxLevel: 3 },
  { key: "gunslingerRange",  label: "Gunslinger Range",    description: "+30 range per level",             cost: 1, maxLevel: 3 },
  { key: "gunslingerRate",   label: "Quick Draw",          description: "+0.4 attacks/sec per level",      cost: 2, maxLevel: 3 },
  { key: "dynamiterRadius",  label: "Bigger Blast",        description: "+25% explosion radius per level", cost: 2, maxLevel: 3 },
  { key: "marshalHp",        label: "Marshal Fortitude",   description: "+100 HP per level",               cost: 2, maxLevel: 3 },
];

// ─── World Constants ──────────────────────────────────────────────────────────

export const WORLD = {
  width: 2400,       // total world width in pixels
  height: 480,       // canvas height
  groundY: 340,      // y position of ground surface
  hudHeight: 120,    // bottom HUD height
  mineX: 80,         // player mine x position
  playerSaloonX: 40, // player saloon x
  enemySaloonX: 2340,// enemy saloon x
  enemyMineX: 2300,  // enemy mine x
};

// ─── Training Times (seconds to produce each unit) ───────────────────────────

export const TRAIN_TIME: Record<string, number> = {
  miner:      3,
  deputy:     5,
  gunslinger: 7,
  dynamiter:  9,
  marshal:    14,
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
  { x: 200,  gold: 300 },  // near player base — safe, low yield
  { x: 380,  gold: 250 },  // near player base — safe, low yield
  { x: 700,  gold: 400 },  // mid-left — moderate risk
  { x: 900,  gold: 400 },  // mid-left — moderate risk
  { x: 1100, gold: 500 },  // center — contested
  { x: 1200, gold: 600 },  // center — contested, high yield
  { x: 1300, gold: 500 },  // center — contested
  { x: 1500, gold: 400 },  // mid-right — enemy territory
  { x: 1700, gold: 400 },  // mid-right — enemy territory
  { x: 2020, gold: 250 },  // near enemy base — dangerous
  { x: 2200, gold: 300 },  // near enemy base — dangerous
];
