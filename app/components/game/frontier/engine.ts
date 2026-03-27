// ─── Frontier Wars — Game Engine ──────────────────────────────────────────────

import type {
  GameState, Unit, Building, Projectile, GoldPile,
  UnitType, Team, Vec2, Difficulty, AiStrategy,
} from "./types";
import { getStats, WORLD, LEVELS, AMBUSH_LEVELS, GOLD_PILE_POSITIONS, TRAIN_TIME, MAX_UNITS, PASSIVE_GOLD_BASE, DIFFICULTY_DEFS, getUpgradePoints } from "./configs";
import type { Stance } from "./types";

let _idCounter = 0;
const uid = () => `u${++_idCounter}`;

// Maximum Y-axis distance for melee attacks — prevents hitting units on different vertical levels
const Y_ATTACK_THRESHOLD = 55;
// Ranged unit types bypass the Y threshold — they can shoot across vertical lanes
function isRangedUnit(type: string): boolean {
  return type === "gunslinger" || type === "dynamiter" || type === "archer" || type === "shaman";
}

// ─── Initial State ────────────────────────────────────────────────────────────

export function createInitialState(
  level: number,
  upgrades: GameState["upgrades"],
  unlockedUnits: string[] = ["miner", "deputy"],
  difficulty: Difficulty = "gunslinger",
): GameState {
  // level >= 100 → ambush encounter (index = level - 100)
  const isAmbush = level >= 100;
  const ambushIndex = isAmbush ? level - 100 : 0;
  const lvl = isAmbush ? AMBUSH_LEVELS[ambushIndex] : LEVELS[level];
  const diff = DIFFICULTY_DEFS[difficulty];

  // Determine AI strategy and biome for this level
  const aiStrategy: AiStrategy = (!isAmbush && lvl.aiStrategy) ? lvl.aiStrategy : "balanced";
  const biome = lvl.biome ?? "desert";

  // Saloon HP scales with saloonHp upgrade: 1500 base + 300 per tier
  const saloonBaseHp = 1500 + (upgrades.saloonHp ?? 0) * 300;
  const buildings: Building[] = [
    { id: "player_saloon", type: "saloon",      team: "player", pos: { x: WORLD.playerSaloonX, y: WORLD.groundY - 80 }, hp: saloonBaseHp, maxHp: saloonBaseHp, width: 80, height: 80 },
    isAmbush
      ? { id: "enemy_saloon", type: "tipi",        team: "enemy",  pos: { x: WORLD.enemySaloonX,  y: WORLD.groundY - 70 }, hp: 800,  maxHp: 800,  width: 70, height: 70 }
      : { id: "enemy_saloon", type: "enemy_saloon", team: "enemy",  pos: { x: WORLD.enemySaloonX,  y: WORLD.groundY - 80 }, hp: 1500, maxHp: 1500, width: 80, height: 80 },
  ];

  const goldPiles: GoldPile[] = GOLD_PILE_POSITIONS.map((pos, i) => ({
    id: `pile_${i}`,
    pos: { x: pos.x, y: WORLD.groundY - 8 + (pos.yOffset ?? 0) },
    gold: pos.gold,
    maxGold: pos.gold,
  }));

  const startingUnits: Unit[] = [createFreeMiner(upgrades)];

  // Apply difficulty multipliers to starting gold and enemy gold
  const playerGold = Math.round(lvl.startGold * diff.playerStartGold);
  const enemyGold = isAmbush ? 0 : Math.round(lvl.startGold * 1.5 * diff.enemyStartGold);

  return {
    phase: "BATTLE",
    level,
    gold: playerGold,
    units: startingUnits,
    buildings,
    goldPiles,
    projectiles: [],
    particles: [],
    floatingTexts: [],
    spawnQueue: [],
    trainingUnit: null,
    trainingProgress: 0,
    trainingTime: 0,
    passiveGoldTimer: 0,
    stance: "defense",
    garrisonExitTimer: 0,
    enemyGold,
    enemySpawnTimer: isAmbush ? 4.0 : 3.0,
    upgradePoints: 0,
    upgrades,
    cameraX: 0,
    manualCamera: false,
    selectedUnitId: null,
    time: 0,
    nightfall: false,
    soundEvents: [],
    unlockedUnits,
    isAmbushLevel: isAmbush,
    difficulty,
    aiStrategy,
    enemyGarrisoned: false,
    biome,
    levelName: lvl.name,
  };
}

// ─── Lane Y assignment by unit type ──────────────────────────────────────────
// Miners: bottom lane, melee: mid lane, ranged: upper lane
function getLaneY(type: UnitType): number {
  const jitter = (Math.random() - 0.5) * 6; // ±3px variation
  switch (type) {
    case "miner":         return WORLD.groundY - 14 + jitter;
    case "deputy":        return WORLD.groundY - 32 + jitter;
    case "bounty_hunter": return WORLD.groundY - 36 + jitter;
    case "marshal":       return WORLD.groundY - 36 + jitter;
    case "gunslinger":    return WORLD.groundY - 48 + jitter;
    case "dynamiter":     return WORLD.groundY - 44 + jitter;
    // Native units
    case "brave":         return WORLD.groundY - 28 + jitter;
    case "mounted_brave": return WORLD.groundY - 38 + jitter;
    case "archer":        return WORLD.groundY - 50 + jitter;
    case "shaman":        return WORLD.groundY - 46 + jitter;
    case "chief":         return WORLD.groundY - 40 + jitter;
    default:              return WORLD.groundY - 32 + jitter;
  }
}

function createFreeMiner(upgrades: GameState["upgrades"]): Unit {
  const stats = getStats("miner", upgrades);
  const laneY = getLaneY("miner");
  return {
    id: `u_start_miner`,
    type: "miner",
    team: "player",
    pos: { x: WORLD.playerSaloonX + 90, y: laneY },
    stats: { ...stats },
    state: "walking",
    facing: 1,
    attackCooldown: 0,
    mineTimer: 0,
    animFrame: 0,
    animTimer: 0,
    targetId: null,
    goldCarrying: 0,
    selected: false,
    deathTimer: 0,
    laneY,
    magazine: 0, maxMagazine: 0, reloadTimer: 0,
    swingCharge: 0, swingChargeMax: 0,
  };
}

// ─── Spawn Unit ───────────────────────────────────────────────────────────────

// Zero-upgrade baseline for enemy units — upgrades only benefit the player
const ENEMY_UPGRADES: GameState["upgrades"] = {
  minerSpeed: 0, minerCapacity: 0,
  deputyHp: 0, deputyDamage: 0,
  bountyHp: 0, bountyDamage: 0,
  gunslingerRange: 0, gunslingerRate: 0,
  dynamiterRadius: 0, dynamiterRange: 0, marshalHp: 0,
  saloonRevenue: 0, saloonHp: 0, barracks: 0,
};

export function spawnUnit(state: GameState, type: UnitType, team: Team): Unit {
  // Player gets upgraded stats; enemy always uses base stats
  const baseStats = team === "player" ? getStats(type, state.upgrades) : getStats(type, ENEMY_UPGRADES);
  const isPlayer = team === "player";
  const spawnX = isPlayer
    ? WORLD.playerSaloonX + 90
    : WORLD.enemySaloonX - 90;
  const laneY = getLaneY(type);

  // Apply difficulty multipliers to enemy units
  const stats = { ...baseStats };
  if (!isPlayer && state.difficulty) {
    const diff = DIFFICULTY_DEFS[state.difficulty];
    stats.hp = Math.round(stats.hp * diff.enemyHp);
    stats.maxHp = stats.hp;
    stats.damage = Math.round(stats.damage * diff.enemyDamage);
  }

  return {
    id: uid(),
    type,
    team,
    pos: { x: spawnX, y: laneY },
    stats,
    state: "walking",
    facing: isPlayer ? 1 : -1,
    attackCooldown: 0,
    mineTimer: 0,
    animFrame: 0,
    animTimer: 0,
    targetId: null,
    goldCarrying: 0,
    selected: false,
    deathTimer: 0,
    laneY,
    magazine: 0, maxMagazine: 0, reloadTimer: 0,
    swingCharge: 0, swingChargeMax: 0,
  };
}

// ─── Main Update ──────────────────────────────────────────────────────────────

export function updateGame(state: GameState, dt: number): GameState {
  if (state.phase !== "BATTLE") return state;

  const s = { ...state };
  s.time += dt;
  // Tick down garrison exit timer — miners are held back until this reaches 0
  if (s.garrisonExitTimer > 0) s.garrisonExitTimer = Math.max(0, s.garrisonExitTimer - dt);
  s.units = s.units.map(u => ({ ...u }));
  s.goldPiles = s.goldPiles.map(p => ({ ...p }));
  s.projectiles = s.projectiles.map(p => ({ ...p }));
  s.particles = s.particles.map(p => ({ ...p }));
  s.floatingTexts = s.floatingTexts.map(t => ({ ...t }));

  // ── Nightfall at 3 minutes — double gold mode ──
  const NIGHTFALL_TIME = 180; // 3 minutes
  if (!s.nightfall && s.time >= NIGHTFALL_TIME) {
    s.nightfall = true;
    // Announce nightfall with a big floating text near center of screen
    spawnFloatingText(s, { x: WORLD.width / 2, y: WORLD.groundY - 120 }, "🌙 NIGHTFALL — DOUBLE GOLD!", "#FFD700");
  }

  // ── Passive gold income (scaled by difficulty) ──
  s.passiveGoldTimer += dt;
  if (s.passiveGoldTimer >= 1.0) {
    s.passiveGoldTimer -= 1.0;
    const diffMult = DIFFICULTY_DEFS[s.difficulty]?.passiveGold ?? 1.0;
    const baseIncome = Math.round((PASSIVE_GOLD_BASE + s.upgrades.saloonRevenue * 2) * diffMult);
    const income = s.nightfall ? baseIncome * 2 : baseIncome;
    s.gold += income;
    // Small floating text near saloon
    const saloon = s.buildings.find(b => b.id === "player_saloon");
    if (saloon) {
      spawnFloatingText(s, { x: saloon.pos.x + 40, y: saloon.pos.y - 5 }, `+$${income}`, s.nightfall ? "#88DDFF" : "#FFD700");
    }
  }

  // ── Training system (replaces old spawn queue) ──
  s.units = processTraining(s, dt);

  // ── Auto-deselect if possessed unit died ──
  if (s.selectedUnitId) {
    const possessed = s.units.find(u => u.id === s.selectedUnitId);
    if (!possessed || possessed.state === "dead" || possessed.state === "dying") {
      s.selectedUnitId = null;
      s.units = s.units.map(u => ({ ...u, selected: false }));
    }
  }

  // ── Unit AI — skip possessed unit (controlled by WASD) ──
  s.units.forEach(unit => {
    if (unit.state === "dead") return;
    if (unit.id === s.selectedUnitId) {
      // Still tick cooldowns and animation for possessed unit
      unit.animTimer += dt;
      if (unit.animTimer > 0.15) { unit.animTimer = 0; unit.animFrame = (unit.animFrame + 1) % 4; }
      unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
      // Tick down reload timer — refill magazine when reload completes
      if (unit.reloadTimer > 0) {
        unit.reloadTimer = Math.max(0, unit.reloadTimer - dt);
        if (unit.reloadTimer === 0 && unit.maxMagazine > 0) {
          unit.magazine = unit.maxMagazine; // reload complete!
        }
      }
      // Tick up swing charge for possessed melee units
      if (unit.swingChargeMax > 0) {
        unit.swingCharge = Math.min(1.0, unit.swingCharge + dt / unit.swingChargeMax);
      }
      // Possessed miner: auto-mine when on a pile, auto-deposit when near saloon
      if (unit.type === "miner") {
        if (unit.goldCarrying === 0) {
          updatePossessedMiner(unit, s, dt);
        } else {
          // Carrying gold — auto-deposit when near player saloon
          const saloon = s.buildings.find(b => b.team === "player" && b.type === "saloon");
          if (saloon) {
            const saloonCenter = saloon.pos.x + saloon.width / 2;
            if (Math.abs(unit.pos.x - saloonCenter) <= 35) {
              s.gold += unit.goldCarrying;
              spawnFloatingText(s, { x: saloonCenter, y: saloon.pos.y - 10 }, `+${unit.goldCarrying}g`, "#FFD700");
              unit.goldCarrying = 0;
              unit.state = "idle";
            } else {
              unit.state = "returning"; // show cart while walking back
            }
          }
        }
      }
      // ── Possessed unit auto-garrison: if in garrison stance and inside saloon bounds, garrison + deselect ──
      if (s.stance === "garrison" && unit.type !== "miner") {
        const saloon = s.buildings.find(b => b.id === "player_saloon");
        if (saloon) {
          const saloonCenter = saloon.pos.x + saloon.width / 2;
          if (Math.abs(unit.pos.x - saloonCenter) <= 30) {
            unit.state = "garrison";
            unit.facing = 1;
            s.selectedUnitId = null;
            unit.selected = false;
          }
        }
      }
      // ── Force "returning" state when possessed miner is carrying gold (WASD overrides state) ──
      if (unit.type === "miner" && unit.goldCarrying > 0 && unit.state !== "idle") {
        unit.state = "returning";
      }
      return;
    }
    updateUnit(unit, s, dt);
  });

  // ── Projectiles ──
  updateProjectiles(s, dt);

  // ── Particles ──
  s.particles = s.particles.filter(p => {
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.vel.y += 200 * dt; // gravity
    p.life -= dt;
    return p.life > 0;
  });

  // ── Floating texts ──
  s.floatingTexts = s.floatingTexts.filter(t => {
    t.pos.x += t.vel.x * dt;
    t.pos.y += t.vel.y * dt;
    t.life -= dt;
    return t.life > 0;
  });

  // ── Enemy AI ──
  updateEnemyAI(s, dt);

  // ── Remove dead units (keep corpses for 8s for blood pool rendering) ──
  s.units = s.units.filter(u => {
    if (u.state === "dying") {
      u.deathTimer += dt;
      if (u.deathTimer > 0.6) {
        u.state = "dead";
        u.deathTimer = 0; // reset timer to track corpse duration
      }
    }
    if (u.state === "dead") {
      u.deathTimer += dt;
      return u.deathTimer < 8.0; // keep corpse for 8 seconds
    }
    return true;
  });

  // ── Win/lose check ──
  const playerSaloon = s.buildings.find(b => b.id === "player_saloon");
  const enemySaloon = s.buildings.find(b => b.id === "enemy_saloon");
  if (playerSaloon && playerSaloon.hp <= 0) s.phase = "DEFEAT";
  if (enemySaloon && enemySaloon.hp <= 0) {
    s.phase = "VICTORY";
    s.upgradePoints += getUpgradePoints(s.level >= 100 ? s.level - 100 : s.level, s.isAmbushLevel);
  }

  return s;
}

// ─── Training System ──────────────────────────────────────────────────────────

function processTraining(s: GameState, dt: number): Unit[] {
  const playerCount = s.units.filter(u => u.team === "player" && u.state !== "dead" && u.state !== "dying").length;

  // If currently training a unit
  if (s.trainingUnit) {
    s.trainingProgress += dt;
    if (s.trainingProgress >= s.trainingTime) {
      // Training complete — spawn if under cap
      if (playerCount < MAX_UNITS) {
        const unit = spawnUnit(s, s.trainingUnit, "player");
        s.trainingUnit = null;
        s.trainingProgress = 0;
        s.trainingTime = 0;
        return [...s.units, unit];
      } else {
        // At cap — hold training complete, wait for a slot
        s.trainingProgress = s.trainingTime; // clamp at 100%
      }
    }
    return s.units;
  }

  // Not training — start next in queue if under cap
  if (s.spawnQueue.length > 0 && playerCount < MAX_UNITS) {
    const type = s.spawnQueue.shift()!;
    s.trainingUnit = type;
    s.trainingProgress = 0;
    s.trainingTime = TRAIN_TIME[type] ?? 5;
  }

  return s.units;
}

// ─── Unit AI ──────────────────────────────────────────────────────────────────

function updateUnit(unit: Unit, s: GameState, dt: number) {
  unit.animTimer += dt;
  if (unit.animTimer > 0.15) { unit.animTimer = 0; unit.animFrame = (unit.animFrame + 1) % 4; }
  unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);

  if (unit.state === "dying") return;

  // ── Miner logic ──
  if (unit.type === "miner") {
    updateMiner(unit, s, dt);
    return;
  }

  // ── Combat units — stance-aware AI ──
  if (unit.team === "player") {
    updateCombatUnitWithStance(unit, s, dt);
  } else {
    updateCombatUnitEnemy(unit, s, dt);
  }

  // Clamp to world
  unit.pos.x = Math.max(0, Math.min(WORLD.width, unit.pos.x));
}

// ─── Stance-based Combat AI ───────────────────────────────────────────────────

function updateCombatUnitWithStance(unit: Unit, s: GameState, dt: number) {
  const stance = s.stance;

  // ── GARRISON: retreat to saloon, shoot from windows ──
  if (stance === "garrison") {
    const saloon = s.buildings.find(b => b.id === "player_saloon");
    if (!saloon) return;
    const saloonCenter = saloon.pos.x + saloon.width / 2;
    const distToSaloon = Math.abs(unit.pos.x - saloonCenter);

    if (distToSaloon > 30) {
      // Walk back to saloon
      unit.state = "walking";
      unit.facing = saloonCenter > unit.pos.x ? 1 : -1;
      unit.pos.x += unit.facing * unit.stats.speed * dt;
    } else {
      // In garrison — shoot at enemies from saloon at 50% damage, gunslinger range
      unit.state = "garrison";
      unit.facing = 1; // always face right (toward enemy)
      unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
      const garrisonRange = 200;
      const nearestEnemy = findNearestEnemy(unit, s);
      if (nearestEnemy && Math.abs(nearestEnemy.pos.x - unit.pos.x) <= garrisonRange) {
        if (unit.attackCooldown <= 0) {
          // Shoot at 50% damage — aimed at nearest enemy's actual position
          const spawnX = saloon.pos.x + saloon.width;
          const spawnY = saloon.pos.y + 20;
          const aimDx = nearestEnemy.pos.x - spawnX;
          const aimDy = nearestEnemy.pos.y - spawnY;
          const aimDist = Math.hypot(aimDx, aimDy) || 1;
          const speed = 420;
          const vel: Vec2 = { x: (aimDx / aimDist) * speed, y: (aimDy / aimDist) * speed };
          s.projectiles.push({
            id: `g${Date.now()}_${Math.random()}`,
            pos: { x: spawnX, y: spawnY },
            vel, team: "player",
            damage: Math.round(unit.stats.damage * 0.5),
            type: "bullet", life: 1.5, exploded: false,
          });
          unit.attackCooldown = 1 / unit.stats.attackRate;
        }
      }
    }
    return;
  }

  // ── Is this a ranged unit? ──
  const isRanged = unit.type === "gunslinger" || unit.type === "dynamiter";
  // Ranged units stay this far behind the melee front line
  const RANGED_OFFSET = 90; // px behind melee

  // ── DEFENSE: hold a line just ahead of the furthest friendly miner ──
  if (stance === "defense") {
    const saloon = s.buildings.find(b => b.id === "player_saloon");
    // Find furthest active player miner (not garrisoned, not dead)
    const activeMinerX = s.units
      .filter(u => u.team === "player" && u.type === "miner" && u.state !== "dead" && u.state !== "dying" && u.state !== "garrison")
      .reduce((maxX, u) => Math.max(maxX, u.pos.x), saloon ? saloon.pos.x + saloon.width : 0);
    // Defense line = 100px ahead of furthest miner (or 300px from saloon if no miners out)
    const fallbackLine = saloon ? saloon.pos.x + saloon.width + 300 : 400;
    const meleeLine = Math.max(fallbackLine, activeMinerX + 100);
    // Ranged units hold behind the melee line
    const defenseLine = isRanged ? meleeLine - RANGED_OFFSET : meleeLine;

    const enemy = findNearestEnemy(unit, s);
    if (enemy) {
      const dist = Math.abs(unit.pos.x - enemy.pos.x);
      const yDist = Math.abs(unit.pos.y - enemy.pos.y);
      if (dist <= unit.stats.range && (isRanged || yDist <= Y_ATTACK_THRESHOLD)) {
        unit.state = "attacking";
        unit.facing = enemy.pos.x > unit.pos.x ? 1 : -1;
        if (unit.attackCooldown <= 0) {
          performAttack(unit, enemy, s);
          unit.attackCooldown = 1 / unit.stats.attackRate;
        }
      } else if (enemy.pos.x < unit.pos.x + 400) {
        // Enemy is approaching — melee intercepts, ranged holds position
        if (!isRanged) {
          const maxAdvance = meleeLine + 200;
          if (unit.pos.x < maxAdvance) {
            unit.state = "walking";
            unit.facing = enemy.pos.x > unit.pos.x ? 1 : -1;
            unit.pos.x += unit.facing * unit.stats.speed * dt;
          } else {
            unit.state = "idle";
          }
        } else {
          // Ranged: hold at ranged line, just shoot
          unit.state = "idle";
          unit.facing = 1;
        }
      } else {
        // No nearby threat — hold at respective line
        if (unit.pos.x < defenseLine - 10) {
          unit.state = "walking";
          unit.facing = 1;
          unit.pos.x += unit.stats.speed * dt;
        } else if (unit.pos.x > defenseLine + 10) {
          unit.state = "walking";
          unit.facing = -1;
          unit.pos.x -= unit.stats.speed * dt;
        } else {
          unit.state = "idle";
        }
      }
    } else {
      // No enemies — hold at respective line
      if (unit.pos.x < defenseLine - 10) {
        unit.state = "walking";
        unit.facing = 1;
        unit.pos.x += unit.stats.speed * dt;
      } else if (unit.pos.x > defenseLine + 10) {
        unit.state = "walking";
        unit.facing = -1;
        unit.pos.x -= unit.stats.speed * dt;
      } else {
        unit.state = "idle";
      }
    }
    return;
  }

  // ── ATTACK: full aggression, march to enemy base ──
  // Ranged units trail behind the nearest melee unit in front of them
  const enemy = findNearestEnemy(unit, s);
  if (enemy) {
    const dist = Math.abs(unit.pos.x - enemy.pos.x);
    const yDistAtk = Math.abs(unit.pos.y - enemy.pos.y);
    if (dist <= unit.stats.range && (isRanged || yDistAtk <= Y_ATTACK_THRESHOLD)) {
      unit.state = "attacking";
      unit.facing = enemy.pos.x > unit.pos.x ? 1 : -1;
      if (unit.attackCooldown <= 0) {
        performAttack(unit, enemy, s);
        unit.attackCooldown = 1 / unit.stats.attackRate;
      }
    } else {
      if (isRanged) {
        // Find the furthest-forward friendly melee unit
        const frontMeleeX = s.units
          .filter(u => u.team === "player" && (u.type === "deputy" || u.type === "marshal") && u.state !== "dead" && u.state !== "dying")
          .reduce((maxX, u) => Math.max(maxX, u.pos.x), -1);
        const targetX = frontMeleeX > 0 ? frontMeleeX - RANGED_OFFSET : unit.pos.x + 1;
        if (unit.pos.x < targetX - 10) {
          unit.state = "walking";
          unit.facing = 1;
          unit.pos.x += unit.stats.speed * 0.85 * dt; // slightly slower than melee
        } else if (unit.pos.x > targetX + 10) {
          unit.state = "walking";
          unit.facing = -1;
          unit.pos.x -= unit.stats.speed * dt;
        } else {
          unit.state = "idle";
          unit.facing = 1;
        }
      } else {
        unit.state = "walking";
        unit.facing = enemy.pos.x > unit.pos.x ? 1 : -1;
        unit.pos.x += unit.facing * unit.stats.speed * dt;
      }
    }
  } else {
    // No enemy units — march toward enemy saloon and attack it
    const enemySaloon = s.buildings.find(b => b.id === "enemy_saloon");
    unit.facing = 1;

    if (isRanged) {
      // Ranged: stop at max range from saloon, fire from there
      const rangedStopX = enemySaloon
        ? enemySaloon.pos.x - unit.stats.range + 20
        : WORLD.enemySaloonX - unit.stats.range;
      if (unit.pos.x < rangedStopX - 10) {
        unit.state = "walking";
        unit.pos.x += unit.stats.speed * 0.85 * dt;
      } else {
        unit.state = "idle";
      }
    } else {
      // Melee: walk to saloon but STOP at its left edge — don't walk past
      const meleeStopX = enemySaloon
        ? enemySaloon.pos.x - 10
        : WORLD.enemySaloonX - 10;
      if (unit.pos.x < meleeStopX) {
        unit.state = "walking";
        unit.pos.x = Math.min(unit.pos.x + unit.stats.speed * dt, meleeStopX);
      } else {
        unit.state = "idle";
      }
    }

    // Attack saloon if in range
    if (enemySaloon) {
      const dist = Math.abs(unit.pos.x - (enemySaloon.pos.x + enemySaloon.width / 2));
      if (dist <= unit.stats.range + 20 && unit.attackCooldown <= 0) {
        unit.state = "attacking";
        enemySaloon.hp -= unit.stats.damage;
        unit.attackCooldown = 1 / unit.stats.attackRate;
        spawnFloatingText(s, { x: enemySaloon.pos.x + 40, y: enemySaloon.pos.y }, `-${unit.stats.damage}`, "#ff4444");
      }
    }
  }
}

function updateCombatUnitEnemy(unit: Unit, s: GameState, dt: number) {
  const playerSaloon = s.buildings.find(b => b.type === "saloon");

  // ── Enemy garrison: combat units fall back to defend their saloon ──
  if (s.enemyGarrisoned) {
    const enemySaloon = s.buildings.find(b => b.id === "enemy_saloon");
    if (enemySaloon) {
      const saloonCenter = enemySaloon.pos.x + enemySaloon.width / 2;
      const distToSaloon = Math.abs(unit.pos.x - saloonCenter);
      if (distToSaloon > 60) {
        // Fall back to saloon
        unit.state = "walking";
        unit.facing = saloonCenter > unit.pos.x ? 1 : -1;
        unit.pos.x += unit.facing * unit.stats.speed * dt;
        return;
      } else {
        // In garrison — shoot from saloon windows
        unit.state = "garrison";
        unit.facing = -1;
        const garrisonRange = 220;
        const nearestPlayer = findNearestEnemy(unit, s);
        if (nearestPlayer && Math.abs(nearestPlayer.pos.x - unit.pos.x) <= garrisonRange) {
          if (unit.attackCooldown <= 0) {
            const eSpawnX = enemySaloon.pos.x;
            const eSpawnY = enemySaloon.pos.y + 20;
            const eDx = nearestPlayer.pos.x - eSpawnX;
            const eDy = nearestPlayer.pos.y - eSpawnY;
            const eDist = Math.hypot(eDx, eDy) || 1;
            const eSpeed = 420;
            s.projectiles.push({
              id: uid(),
              pos: { x: eSpawnX, y: eSpawnY },
              vel: { x: (eDx / eDist) * eSpeed, y: (eDy / eDist) * eSpeed },
              team: "enemy",
              damage: Math.round(unit.stats.damage * 0.5),
              type: "bullet", life: 1.5, exploded: false,
            });
            unit.attackCooldown = 1 / unit.stats.attackRate;
          }
        }
        return;
      }
    }
  }

  // ── Player units take priority over the saloon ──
  const enemy = findNearestEnemy(unit, s);
  if (enemy) {
    const dist = Math.hypot(enemy.pos.x - unit.pos.x, (enemy.pos.y - unit.pos.y) * 0.5);
    const isEnemyRanged = isRangedUnit(unit.type);
    const yDistEnemy = Math.abs(enemy.pos.y - unit.pos.y);
    if (dist <= unit.stats.range && (isEnemyRanged || yDistEnemy <= Y_ATTACK_THRESHOLD)) {
      unit.state = "attacking";
      unit.facing = enemy.pos.x > unit.pos.x ? 1 : -1;
      if (unit.attackCooldown <= 0) {
        performAttack(unit, enemy, s);
        unit.attackCooldown = 1 / unit.stats.attackRate;
      }
    } else {
      unit.state = "walking";
      unit.facing = enemy.pos.x > unit.pos.x ? 1 : -1;
      unit.pos.x += unit.facing * unit.stats.speed * dt;
      // ── Y-tracking: nudge toward target's Y so enemies chase you up/down ──
      const dyToTarget = enemy.pos.y - unit.pos.y;
      if (Math.abs(dyToTarget) > 4) {
        unit.pos.y += Math.sign(dyToTarget) * unit.stats.speed * 0.35 * dt;
        // Clamp to valid Y range
        unit.pos.y = Math.max(WORLD.groundY - 120, Math.min(WORLD.groundY - 8, unit.pos.y));
      }
    }
    return;
  }

  // ── No player units — attack saloon if in range, otherwise march toward it ──
  if (playerSaloon) {
    const saloonDist = Math.abs(unit.pos.x - (playerSaloon.pos.x + playerSaloon.width / 2));
    if (saloonDist <= unit.stats.range) {
      unit.state = "attacking";
      unit.facing = -1;
      if (unit.attackCooldown <= 0) {
        playerSaloon.hp -= unit.stats.damage;
        unit.attackCooldown = 1 / unit.stats.attackRate;
        spawnFloatingText(s, { x: playerSaloon.pos.x + 40, y: playerSaloon.pos.y }, `-${unit.stats.damage}`, "#ff4444");
      }
      return;
    }
  }

  // March toward player saloon — drift back to lane Y when no target
  unit.facing = -1;
  unit.state = "walking";
  unit.pos.x -= unit.stats.speed * dt;
  const dyToLane = unit.laneY - unit.pos.y;
  if (Math.abs(dyToLane) > 4) {
    unit.pos.y += Math.sign(dyToLane) * unit.stats.speed * 0.2 * dt;
  }
  if (playerSaloon) {
    unit.pos.x = Math.max(playerSaloon.pos.x, unit.pos.x);
  }
}

function updateMiner(unit: Unit, s: GameState, dt: number) {
  const saloon = s.buildings.find(b => b.team === unit.team && (b.type === "saloon" || b.type === "enemy_saloon"));
  if (!saloon) return;

  const saloonCenter = saloon.pos.x + saloon.width / 2;
  const isPlayer = unit.team === "player";

  // ── Enemy garrison: delegate immediately so updateEnemyMinerGarrison wins ──
  if (!isPlayer && s.enemyGarrisoned) {
    updateEnemyMinerGarrison(unit, s, dt);
    return;
  }

  // ── Garrison stance: miners retreat to saloon too ──
  // garrisonExitTimer > 0 means combat units just left — miners wait for them to clear first
  if (isPlayer && s.stance === "garrison") {
    const distToSaloon = Math.abs(unit.pos.x - saloonCenter);
    if (distToSaloon > 30) {
      // If the garrison exit timer is still counting down, miners hold position
      if (s.garrisonExitTimer > 0) {
        // Show cart if carrying gold while waiting for combat units to clear
        unit.state = unit.goldCarrying > 0 ? "returning" : "idle";
        return;
      }
      // If carrying gold, show cart and move at return speed; otherwise walk normally
      if (unit.goldCarrying > 0) {
        unit.state = "returning";
        unit.facing = saloonCenter > unit.pos.x ? 1 : -1;
        unit.pos.x += unit.facing * unit.stats.speed * 0.6 * dt;
      } else {
        unit.state = "walking";
        unit.facing = saloonCenter > unit.pos.x ? 1 : -1;
        unit.pos.x += unit.facing * unit.stats.speed * dt;
      }
    } else {
      // Deposit gold before entering garrison
      if (unit.goldCarrying > 0) {
        s.gold += unit.goldCarrying;
        spawnFloatingText(s, { x: saloonCenter, y: saloon.pos.y - 10 }, `+${unit.goldCarrying}g`, "#FFD700");
        unit.goldCarrying = 0;
      }
      unit.state = "garrison";
      unit.facing = 1;
      // Only the FIRST garrisoned miner (lowest id alphabetically) shoots
      const garrisonedMiners = s.units.filter(
        u => u.team === "player" && u.type === "miner" && u.state === "garrison"
      );
      const isShooter = garrisonedMiners.length === 0 || garrisonedMiners[0].id === unit.id;
      if (isShooter) {
        unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
        const garrisonRange = 200;
        const nearestEnemy = findNearestEnemy(unit, s);
        if (nearestEnemy && Math.abs(nearestEnemy.pos.x - unit.pos.x) <= garrisonRange) {
          if (unit.attackCooldown <= 0) {
            const mSpawnX = saloon.pos.x + saloon.width;
            const mSpawnY = saloon.pos.y + 30;
            const mDx = nearestEnemy.pos.x - mSpawnX;
            const mDy = nearestEnemy.pos.y - mSpawnY;
            const mDist = Math.hypot(mDx, mDy) || 1;
            const mSpeed = 380;
            s.projectiles.push({
              id: `gm${Date.now()}_${Math.random()}`,
              pos: { x: mSpawnX, y: mSpawnY },
              vel: { x: (mDx / mDist) * mSpeed, y: (mDy / mDist) * mSpeed },
              team: "player",
              damage: Math.round(unit.stats.damage * 0.5),
              type: "bullet", life: 1.5, exploded: false,
            });
            unit.attackCooldown = 1 / unit.stats.attackRate;
          }
        }
      }
    }
    return;
  }


  if (unit.goldCarrying === 0) {
    // Find nearest gold pile with gold remaining
    // Player miners prefer piles on their side (lower x), enemy miners prefer their side (higher x)
    let targetPile: GoldPile | null = null;
    let minDist = Infinity;
    for (const pile of s.goldPiles) {
      if (pile.gold <= 0) continue;
      // Prefer piles on own side, but will go anywhere
      const dist = Math.abs(pile.pos.x - unit.pos.x);
      // Bias toward own side: add penalty for crossing midpoint
      const midpoint = WORLD.width / 2;
      const crossesMid = isPlayer ? pile.pos.x > midpoint : pile.pos.x < midpoint;
      const adjustedDist = dist + (crossesMid ? 400 : 0);
      if (adjustedDist < minDist) { minDist = adjustedDist; targetPile = pile; }
    }

    if (!targetPile) {
      // No gold left — idle near saloon
      unit.state = "idle";
      return;
    }

    // 2D proximity check — miner must be close on BOTH X and Y before mining
    const dx2d = unit.pos.x - targetPile.pos.x;
    const dy2d = unit.pos.y - targetPile.pos.y;
    const dist2d = Math.hypot(dx2d, dy2d);
    if (dist2d > 25) {
      unit.state = "walking";
      unit.facing = targetPile.pos.x > unit.pos.x ? 1 : -1;
      unit.pos.x += unit.facing * unit.stats.speed * dt;
      // Also walk toward the pile's Y position
      const dyToPile = targetPile.pos.y - unit.pos.y;
      if (Math.abs(dyToPile) > 4) {
        unit.pos.y += Math.sign(dyToPile) * unit.stats.speed * 0.5 * dt;
        unit.pos.y = Math.max(WORLD.groundY - 120, Math.min(WORLD.groundY - 4, unit.pos.y));
      }
      unit.targetId = targetPile.id;
    } else {
      // Mine the pile
      unit.state = "mining";
      unit.mineTimer += dt;
      if (unit.mineTimer >= unit.stats.mineTime) {
        unit.mineTimer = 0;
        const mineAmt = Math.min(unit.stats.mineAmount, targetPile.gold);
        targetPile.gold -= mineAmt;
        unit.goldCarrying = mineAmt;
        if (mineAmt > 0) {
          spawnFloatingText(s, { x: targetPile.pos.x, y: targetPile.pos.y - 20 }, `+${mineAmt}g`, "#FFD700");
        }
      }
    }
  } else {
    // Return to saloon with gold — slower because wheeling a cart (60% speed)
    const dist = Math.abs(unit.pos.x - saloonCenter);
    if (dist > 20) {
      unit.state = "returning";
      unit.facing = saloonCenter > unit.pos.x ? 1 : -1;
      unit.pos.x += unit.facing * unit.stats.speed * 0.6 * dt;
    } else {
      // Deposit gold
      if (unit.team === "player") {
        s.gold += unit.goldCarrying;
        spawnFloatingText(s, { x: saloonCenter, y: saloon.pos.y - 10 }, `+${unit.goldCarrying}g`, "#FFD700");
      } else {
        s.enemyGold += unit.goldCarrying;
      }
      unit.goldCarrying = 0;
    }
  }

  // Miners fight back if attacked — deal damage TO the enemy, not to themselves
  const nearbyEnemy = s.units.find(u =>
    u.team !== unit.team && u.state !== "dead" && u.state !== "dying" && u.state !== "garrison" &&
    Math.abs(u.pos.x - unit.pos.x) < unit.stats.range &&
    Math.abs(u.pos.y - unit.pos.y) <= Y_ATTACK_THRESHOLD
  );
  if (nearbyEnemy && unit.attackCooldown <= 0) {
    applyDamage(nearbyEnemy, unit.stats.damage * 0.5, s);
    unit.attackCooldown = 1 / unit.stats.attackRate;
  }
}

function findNearestEnemy(unit: Unit, s: GameState): Unit | null {
  let nearest: Unit | null = null;
  let minDist = Infinity;
  for (const other of s.units) {
    // Skip dead, dying, AND garrisoned units — garrisoned units are immune and
    // should not be targeted so enemies fall through to attacking the building
    if (other.team === unit.team || other.state === "dead" || other.state === "dying" || other.state === "garrison") continue;
    // Use 2D distance so Y-axis position matters (enables dodging for possessed units)
    const dist = Math.hypot(other.pos.x - unit.pos.x, (other.pos.y - unit.pos.y) * 0.5);
    if (dist < minDist) { minDist = dist; nearest = other; }
  }
  return nearest;
}

function performAttack(attacker: Unit, target: Unit, s: GameState) {
  if (attacker.type === "gunslinger") {
    // Spawn bullet projectile
    const vel: Vec2 = { x: attacker.facing * 400, y: -20 };
    s.projectiles.push({
      id: uid(), pos: { ...attacker.pos }, vel,
      team: attacker.team, damage: attacker.stats.damage,
      type: "bullet", life: 1.5, exploded: false,
    });
    s.soundEvents.push("colt-shot");
  } else if (attacker.type === "dynamiter") {
    // Lob dynamite
    const dx = target.pos.x - attacker.pos.x;
    s.projectiles.push({
      id: uid(), pos: { x: attacker.pos.x, y: attacker.pos.y - 20 },
      vel: { x: dx * 0.6, y: -250 },
      team: attacker.team, damage: attacker.stats.damage,
      type: "dynamite", life: 2.0, exploded: false,
    });
  } else {
    // Melee — direct damage
    applyDamage(target, attacker.stats.damage, s);
  }
}

function applyDamage(unit: Unit, damage: number, s: GameState) {
  // Garrisoned units are untouchable — only the building can be damaged
  if (unit.state === "garrison") return;
  unit.stats.hp = Math.max(0, unit.stats.hp - damage);
  spawnFloatingText(s, { x: unit.pos.x, y: unit.pos.y - 40 }, `-${damage}`, "#ff4444");
  if (unit.stats.hp <= 0) {
    unit.state = "dying";
    unit.deathTimer = 0;
    spawnDeathParticles(s, unit.pos);
    // Gold steal: if an enemy miner dies while carrying gold, player gets it
    if (unit.team === "enemy" && unit.type === "miner" && unit.goldCarrying > 0) {
      s.gold += unit.goldCarrying;
      spawnFloatingText(s, { x: unit.pos.x, y: unit.pos.y - 60 }, `+${unit.goldCarrying}g STOLEN!`, "#FFD700");
      unit.goldCarrying = 0;
    }
  }
}

// ─── Projectiles ──────────────────────────────────────────────────────────────

function updateProjectiles(s: GameState, dt: number) {
  s.projectiles = s.projectiles.filter(proj => {
    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;
    proj.life -= dt;

    if (proj.type === "dynamite") {
      proj.vel.y += 400 * dt; // gravity
      // Explode on ground
      if (proj.pos.y >= WORLD.groundY - 10 && !proj.exploded) {
        proj.exploded = true;
        explodeDynamite(proj, s);
        return false;
      }
    } else if (proj.type === "bullet") {
      // Check unit hits — garrisoned units are immune
      for (const unit of s.units) {
        if (unit.team === proj.team || unit.state === "dead" || unit.state === "dying" || unit.state === "garrison") continue;
        if (Math.abs(unit.pos.x - proj.pos.x) < 20 && Math.abs(unit.pos.y - proj.pos.y) < 30) {
          applyDamage(unit, proj.damage, s);
          spawnHitParticles(s, proj.pos, "#ff8800");
          return false;
        }
      }
      // Check building hits
      for (const bld of s.buildings) {
        if (bld.team === proj.team) continue;
        if (proj.pos.x > bld.pos.x && proj.pos.x < bld.pos.x + bld.width &&
            proj.pos.y > bld.pos.y && proj.pos.y < bld.pos.y + bld.height) {
          bld.hp -= proj.damage;
          spawnHitParticles(s, proj.pos, "#8B5E3C");
          return false;
        }
      }
    }

    return proj.life > 0;
  });
}

function explodeDynamite(proj: Projectile, s: GameState) {
  const radius = 80;
  spawnExplosionParticles(s, proj.pos);
  for (const unit of s.units) {
    // Garrisoned units are immune to explosions too
    if (unit.team === proj.team || unit.state === "dead" || unit.state === "garrison") continue;
    const dist = Math.hypot(unit.pos.x - proj.pos.x, unit.pos.y - proj.pos.y);
    if (dist < radius) {
      const falloff = 1 - dist / radius;
      applyDamage(unit, Math.round(proj.damage * falloff), s);
    }
  }
  for (const bld of s.buildings) {
    if (bld.team === proj.team) continue;
    const dist = Math.hypot(bld.pos.x + bld.width / 2 - proj.pos.x, bld.pos.y + bld.height / 2 - proj.pos.y);
    if (dist < radius) bld.hp -= proj.damage * 0.5;
  }
}

// ─── Possessed Miner Auto-Mine ────────────────────────────────────────────────

function updatePossessedMiner(unit: Unit, s: GameState, dt: number) {
  // Find nearest gold pile within mining range — use 2D distance
  let targetPile: GoldPile | null = null;
  let minDist = Infinity;
  for (const pile of s.goldPiles) {
    if (pile.gold <= 0) continue;
    const dist = Math.hypot(pile.pos.x - unit.pos.x, pile.pos.y - unit.pos.y);
    if (dist < minDist) { minDist = dist; targetPile = pile; }
  }
  if (!targetPile || minDist > 25) return; // not close enough to any pile (2D check)

  // Mine it — 35% faster than normal (possessed bonus)
  unit.state = "mining";
  unit.mineTimer += dt;
  const fastMineTime = unit.stats.mineTime * 0.65; // 35% faster
  if (unit.mineTimer >= fastMineTime) {
    unit.mineTimer = 0;
    const mineAmt = Math.min(unit.stats.mineAmount, targetPile.gold);
    targetPile.gold -= mineAmt;
    unit.goldCarrying = mineAmt;
    if (mineAmt > 0) {
      spawnFloatingText(s, { x: targetPile.pos.x, y: targetPile.pos.y - 20 }, `+$${mineAmt} ⚡`, "#FFD700");
    }
  }
}

// ─── Enemy Miner Garrison (Stick War style retreat) ──────────────────────────

function updateEnemyMinerGarrison(unit: Unit, s: GameState, dt: number) {
  // If enemy is garrisoned, miners run back to their saloon
  if (!s.enemyGarrisoned) return false;
  const enemySaloon = s.buildings.find(b => b.id === "enemy_saloon");
  if (!enemySaloon) return false;
  const saloonCenter = enemySaloon.pos.x + enemySaloon.width / 2;
  const dist = Math.abs(unit.pos.x - saloonCenter);
  if (dist > 30) {
    // If carrying gold, keep cart + move at slow return speed (punishable)
    // If empty, walk at normal speed
    const fleeSpeed = unit.goldCarrying > 0
      ? unit.stats.speed * 0.6   // same slow speed as normal gold return — can be chased
      : unit.stats.speed;
    unit.state = unit.goldCarrying > 0 ? "returning" : "walking";
    unit.facing = saloonCenter > unit.pos.x ? 1 : -1;
    unit.pos.x += unit.facing * fleeSpeed * dt;
  } else {
    unit.state = "garrison";
    unit.facing = -1;
  }
  return true;
}

// ─── Enemy AI ─────────────────────────────────────────────────────────────────

function updateEnemyAI(s: GameState, dt: number) {
  const isAmbush = s.level >= 100;
  const ambushIndex = isAmbush ? s.level - 100 : 0;
  const lvl = isAmbush ? AMBUSH_LEVELS[ambushIndex] : LEVELS[s.level];
  const diff = DIFFICULTY_DEFS[s.difficulty];

  // ── Garrison + emergency defense check ──
  if (!isAmbush) {
    const midpoint = WORLD.width / 2;
    const enemySaloonBuilding = s.buildings.find(b => b.id === "enemy_saloon");
    const enemySaloonX = enemySaloonBuilding ? enemySaloonBuilding.pos.x + enemySaloonBuilding.width / 2 : WORLD.enemySaloonX;

    const playerCombatPastMid = s.units.filter(u =>
      u.team === "player" && u.state !== "dead" && u.state !== "dying" &&
      u.type !== "miner" && u.pos.x > midpoint
    ).length;
    const enemyCombatAlive = s.units.filter(u =>
      u.team === "enemy" && u.state !== "dead" && u.state !== "dying" && u.type !== "miner"
    ).length;

    // ── Emergency defense: any player unit within 350px of enemy saloon ──
    const playerUnitsNearBase = s.units.filter(u =>
      u.team === "player" && u.state !== "dead" && u.state !== "dying" &&
      Math.abs(u.pos.x - enemySaloonX) < 350
    );
    const playerRaidingBase = playerUnitsNearBase.length > 0;

    // Trigger garrison:
    // 1. Classic: 3+ player combat units past midpoint AND enemy has <2 combat units
    // 2. Emergency: any player unit within 350px of enemy saloon AND enemy outnumbered there
    const playerNearBaseCount = playerUnitsNearBase.length;
    const enemyCombatNearBase = s.units.filter(u =>
      u.team === "enemy" && u.state !== "dead" && u.state !== "dying" && u.type !== "miner" &&
      Math.abs(u.pos.x - enemySaloonX) < 400
    ).length;

    if (
      (playerCombatPastMid >= 3 && enemyCombatAlive < 2) ||
      (playerRaidingBase && playerNearBaseCount > enemyCombatNearBase)
    ) {
      s.enemyGarrisoned = true;
    }
    // Un-garrison: enemy has rebuilt 3+ combat units AND no player units near base
    if (s.enemyGarrisoned && enemyCombatAlive >= 3 && !playerRaidingBase) {
      s.enemyGarrisoned = false;
    }

    // Apply garrison to enemy miners
    for (const unit of s.units) {
      if (unit.team === "enemy" && unit.type === "miner" && unit.state !== "dead" && unit.state !== "dying") {
        updateEnemyMinerGarrison(unit, s, dt);
      }
    }

    // ── Emergency spawn: player is raiding the base — bypass normal spawn timer ──
    // Spawn the cheapest available combat unit immediately (human panic response)
    if (playerRaidingBase && s.enemySpawnTimer > 0.3) {
      const combatCostsEmergency: Record<string, number> = {
        deputy: 200, bounty_hunter: 500, gunslinger: 400, dynamiter: 600, marshal: 1200,
      };
      const emergencyOrder: UnitType[] = ["deputy", "gunslinger", "bounty_hunter", "dynamiter", "marshal"];
      for (const type of emergencyOrder) {
        const max = lvl.enemyUnits[type] || 0;
        const current = s.units.filter(u => u.team === "enemy" && u.type === type && u.state !== "dead" && u.state !== "dying").length;
        const cost = combatCostsEmergency[type] || 999;
        if (current < max && s.enemyGold >= cost) {
          const unit = spawnUnit(s, type, "enemy");
          s.units.push(unit);
          s.enemyGold -= cost;
          // Reset spawn timer so we don't double-spawn this tick
          s.enemySpawnTimer = 1.5 / diff.enemySpawnSpeed;
          break;
        }
      }
    }
  }

  s.enemySpawnTimer -= dt;
  if (s.enemySpawnTimer > 0) return;

  // ── AMBUSH MODE: phased wave-spawn Native units ──
  if (isAmbush) {
    const phase = s.time < 30 ? 1 : s.time < 70 ? 2 : 3;
    // Apply difficulty to spawn speed
    const baseInterval = phase === 1 ? 6.0 : phase === 2 ? 4.0 : 2.5;
    s.enemySpawnTimer = baseInterval / diff.enemySpawnSpeed;

    const livingEnemies = s.units.filter(u => u.team === "enemy" && u.state !== "dead" && u.state !== "dying");
    const enemyUnitCounts: Partial<Record<UnitType, number>> = {};
    for (const u of livingEnemies) {
      enemyUnitCounts[u.type] = (enemyUnitCounts[u.type] || 0) + 1;
    }

    const phaseTypes: Record<number, UnitType[]> = {
      1: ["brave"],
      2: ["brave", "archer", "mounted_brave"],
      3: ["brave", "archer", "mounted_brave", "shaman", "chief"],
    };
    const allowedTypes = phaseTypes[phase];
    const available = allowedTypes.filter(t => {
      const max = lvl.enemyUnits[t] || 0;
      const current = enemyUnitCounts[t] || 0;
      return max > current;
    });
    if (available.length === 0) return;

    const weights: Partial<Record<UnitType, number>> = {
      brave: 5, archer: 3, mounted_brave: 3, shaman: 2, chief: 1,
    };
    const pool: UnitType[] = [];
    for (const t of available) {
      const w = weights[t] ?? 1;
      for (let i = 0; i < w; i++) pool.push(t);
    }
    const type = pool[Math.floor(Math.random() * pool.length)];
    const unit = spawnUnit(s, type, "enemy");
    s.units.push(unit);

    if (phase === 3 && type === "brave" && Math.random() < 0.4) {
      const extra = spawnUnit(s, "brave", "enemy");
      extra.pos.y += (Math.random() - 0.5) * 20;
      s.units.push(extra);
    }
    return;
  }

  // ── REGULAR MODE: strategy-aware budget spawning ──
  const strategy = s.aiStrategy;
  const baseAggression = lvl.enemyAggression + diff.enemyAggression;
  const aggression = Math.min(0.95, baseAggression);

  // Base spawn interval — difficulty speeds it up
  const baseInterval = Math.max(0.6, 2.5 - aggression * 1.5);
  s.enemySpawnTimer = baseInterval / diff.enemySpawnSpeed;

  const combatCosts: Record<string, number> = {
    deputy: 200, bounty_hunter: 500, gunslinger: 400, dynamiter: 600, marshal: 1200,
  };

  const enemyUnitCounts: Partial<Record<UnitType, number>> = {};
  for (const u of s.units.filter(u => u.team === "enemy" && u.state !== "dead" && u.state !== "dying")) {
    enemyUnitCounts[u.type] = (enemyUnitCounts[u.type] || 0) + 1;
  }

  const maxMiners = lvl.enemyUnits.miner || 0;
  const currentMiners = enemyUnitCounts.miner || 0;

  // ── Helper: spawn a specific unit type if affordable and under cap ──
  const trySpawn = (type: UnitType): boolean => {
    const max = lvl.enemyUnits[type] || 0;
    const current = enemyUnitCounts[type] || 0;
    const cost = type === "miner" ? 150 : (combatCosts[type] || 999);
    if (current < max && s.enemyGold >= cost) {
      const unit = spawnUnit(s, type, "enemy");
      s.units.push(unit);
      s.enemyGold -= cost;
      return true;
    }
    return false;
  };

  // ── Helper: pick best affordable combat unit ──
  const pickCombat = (priorityOrder: UnitType[]): boolean => {
    for (const type of priorityOrder) {
      if (trySpawn(type)) return true;
    }
    return false;
  };

  // ── Analyze player army for adaptive strategy ──
  const playerCounts: Partial<Record<UnitType, number>> = {};
  for (const u of s.units.filter(u => u.team === "player" && u.state !== "dead" && u.state !== "dying")) {
    playerCounts[u.type] = (playerCounts[u.type] || 0) + 1;
  }
  const playerHasMelee = (playerCounts.deputy || 0) + (playerCounts.bounty_hunter || 0) + (playerCounts.marshal || 0) > 2;
  const playerHasRanged = (playerCounts.gunslinger || 0) > 1;
  const playerHasTanks = (playerCounts.marshal || 0) > 0;

  switch (strategy) {
    case "economy_first": {
      // 70% miners early, only spawn combat after 3+ miners
      if (currentMiners < maxMiners && currentMiners < 3 && s.enemyGold >= 150) {
        trySpawn("miner"); return;
      }
      if (currentMiners < maxMiners && Math.random() < 0.5 && s.enemyGold >= 150) {
        trySpawn("miner"); return;
      }
      if (Math.random() < aggression) pickCombat(["deputy", "gunslinger", "bounty_hunter", "dynamiter", "marshal"]);
      break;
    }

    case "rush": {
      // Skip miners, spam cheapest combat immediately
      if (Math.random() < aggression * 1.2) {
        pickCombat(["deputy", "gunslinger", "bounty_hunter", "dynamiter", "marshal"]);
      }
      break;
    }

    case "turtle": {
      // Build economy for 50s, then dump everything
      if (s.time < 50) {
        // Economy phase: max miners, hoard gold
        if (currentMiners < maxMiners && s.enemyGold >= 150) { trySpawn("miner"); return; }
      } else {
        // Attack phase: spend everything on strongest units
        if (Math.random() < aggression * 1.3) {
          pickCombat(["marshal", "bounty_hunter", "dynamiter", "gunslinger", "deputy"]);
        }
      }
      break;
    }

    case "economy_war": {
      // Max miners first, then balanced combat
      if (currentMiners < maxMiners && s.enemyGold >= 150) { trySpawn("miner"); return; }
      if (Math.random() < aggression) {
        pickCombat(["gunslinger", "bounty_hunter", "deputy", "dynamiter", "marshal"]);
      }
      break;
    }

    case "siege": {
      // Prioritize ranged: gunslingers + dynamiters, minimal melee
      if (currentMiners < Math.min(maxMiners, 2) && s.enemyGold >= 150) { trySpawn("miner"); return; }
      if (Math.random() < aggression) {
        pickCombat(["gunslinger", "dynamiter", "bounty_hunter", "deputy", "marshal"]);
      }
      break;
    }

    case "balanced": {
      // Smart mix: maintain miners, then balanced combat
      if (currentMiners < maxMiners && s.enemyGold >= 150 && Math.random() < 0.4) {
        trySpawn("miner"); return;
      }
      if (Math.random() < aggression) {
        pickCombat(["deputy", "gunslinger", "bounty_hunter", "dynamiter", "marshal"]);
      }
      break;
    }

    case "swarm": {
      // Flood with cheapest units constantly — skip miners
      if (Math.random() < aggression * 1.4) {
        // Prefer deputies (cheapest combat) for maximum unit count
        pickCombat(["deputy", "gunslinger", "bounty_hunter", "dynamiter", "marshal"]);
        // Sometimes double-spawn on swarm
        if (Math.random() < 0.3) {
          pickCombat(["deputy", "gunslinger", "bounty_hunter", "dynamiter", "marshal"]);
        }
      }
      break;
    }

    case "adaptive": {
      // Counter player composition
      if (currentMiners < maxMiners && s.enemyGold >= 150 && Math.random() < 0.3) {
        trySpawn("miner"); return;
      }
      if (Math.random() < aggression) {
        if (playerHasTanks) {
          // Counter tanks with dynamiters
          pickCombat(["dynamiter", "gunslinger", "marshal", "bounty_hunter", "deputy"]);
        } else if (playerHasRanged && !playerHasMelee) {
          // Counter ranged-only with fast melee
          pickCombat(["bounty_hunter", "deputy", "marshal", "gunslinger", "dynamiter"]);
        } else if (playerHasMelee && !playerHasRanged) {
          // Counter melee with ranged
          pickCombat(["gunslinger", "dynamiter", "bounty_hunter", "marshal", "deputy"]);
        } else {
          // Balanced counter
          pickCombat(["marshal", "bounty_hunter", "gunslinger", "dynamiter", "deputy"]);
        }
      }
      break;
    }

    default: {
      // Fallback: original behavior
      if (currentMiners < maxMiners && s.enemyGold >= 150) { trySpawn("miner"); return; }
      if (Math.random() < aggression) {
        pickCombat(["deputy", "bounty_hunter", "gunslinger", "dynamiter", "marshal"]);
      }
    }
  }
}

// ─── Particles ────────────────────────────────────────────────────────────────

function spawnDeathParticles(s: GameState, pos: Vec2) {
  for (let i = 0; i < 12; i++) {
    s.particles.push({
      pos: { ...pos },
      vel: { x: (Math.random() - 0.5) * 150, y: -Math.random() * 200 },
      life: 0.8, maxLife: 0.8,
      color: "#cc4400", size: 3 + Math.random() * 3,
    });
  }
}

function spawnHitParticles(s: GameState, pos: Vec2, color: string) {
  for (let i = 0; i < 5; i++) {
    s.particles.push({
      pos: { ...pos },
      vel: { x: (Math.random() - 0.5) * 100, y: -Math.random() * 100 },
      life: 0.4, maxLife: 0.4,
      color, size: 2,
    });
  }
}

function spawnExplosionParticles(s: GameState, pos: Vec2) {
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 200;
    s.particles.push({
      pos: { ...pos },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 100 },
      life: 0.8, maxLife: 0.8,
      color: i % 3 === 0 ? "#FFD700" : i % 3 === 1 ? "#ff6600" : "#cc2200",
      size: 3 + Math.random() * 5,
    });
  }
}

function spawnFloatingText(s: GameState, pos: Vec2, text: string, color: string) {
  s.floatingTexts.push({
    pos: { ...pos },
    text, color,
    life: 1.2,
    vel: { x: 0, y: -40 },
  });
}

// ─── Queue Unit ───────────────────────────────────────────────────────────────

export function queueUnit(state: GameState, type: UnitType): GameState {
  // Block if unit not yet unlocked
  if (!state.unlockedUnits.includes(type)) return state;
  const cost = state.upgrades ? getStats(type, state.upgrades).cost : 999;
  if (state.gold < cost) return state;
  // Don't queue if already at max units + full queue (prevent infinite gold drain)
  const playerCount = state.units.filter(u => u.team === "player" && u.state !== "dead" && u.state !== "dying").length;
  const queueCount = state.spawnQueue.length + (state.trainingUnit ? 1 : 0);
  if (playerCount + queueCount >= MAX_UNITS) return state;
  return {
    ...state,
    gold: state.gold - cost,
    spawnQueue: [...state.spawnQueue, type],
  };
}

// ─── Set Stance ───────────────────────────────────────────────────────────────

export function setStance(state: GameState, stance: Stance): GameState {
  // When leaving garrison, give miners a 2.5s head-start delay so combat units
  // exit first and don't leave miners exposed at the front
  const wasGarrison = state.stance === "garrison";
  const leavingGarrison = wasGarrison && stance !== "garrison";
  return {
    ...state,
    stance,
    garrisonExitTimer: leavingGarrison ? 2.5 : state.garrisonExitTimer,
  };
}

// ─── Select Unit (possession) ─────────────────────────────────────────────────

export function selectUnit(state: GameState, worldX: number, worldY: number): GameState {
  let found: Unit | null = null;
  for (const unit of state.units) {
    if (unit.team !== "player" || unit.state === "dead" || unit.state === "dying") continue;
    if (Math.abs(unit.pos.x - worldX) < 20 && Math.abs(unit.pos.y - worldY) < 30) {
      found = unit;
      break;
    }
  }
  return {
    ...state,
    selectedUnitId: found?.id ?? null,
    units: state.units.map(u => ({ ...u, selected: u.id === found?.id })),
  };
}

// ─── Move Possessed Unit ──────────────────────────────────────────────────────

// Y range for possessed unit — full battlefield height (mountain line to near-ground)
const POSSESSED_MIN_Y = WORLD.groundY - 80; // ~330 — keeps unit in playable ground area
const POSSESSED_MAX_Y = WORLD.groundY - 4;

export function movePossessedUnit(state: GameState, dx: number, dy: number, dt: number): GameState {
  if (!state.selectedUnitId) return state;
  return {
    ...state,
    units: state.units.map(u => {
      if (u.id !== state.selectedUnitId) return u;
      // Never move a dead or dying unit
      if (u.state === "dead" || u.state === "dying") return u;
      // Use the unit's own speed + 10% boost (not a hardcoded 200)
      // +15% speed bonus on top of the already-bumped base speeds
      const speed = u.stats.speed * 1.15;
      const nx = Math.max(0, Math.min(WORLD.width, u.pos.x + dx * speed * dt));
      const ny = Math.max(POSSESSED_MIN_Y, Math.min(POSSESSED_MAX_Y, u.pos.y + dy * speed * dt));
      return {
        ...u,
        pos: { x: nx, y: ny },
        facing: dx !== 0 ? (dx > 0 ? 1 : -1) : u.facing,
        state: (dx !== 0 || dy !== 0) ? "walking" : "idle",
      };
    }),
  };
}

// ─── Possessed Unit Attack (Space) ───────────────────────────────────────────
// Two distinct systems:
//   RANGED (gunslinger, dynamiter) → Magazine system: burst fire then reload
//   MELEE  (deputy, bounty_hunter, marshal) → Power Strike: charge meter scales damage
//   MINER  → Simple cooldown (same as normal attack rate)

// ─── Ranged magazine config ───────────────────────────────────────────────────
// maxMag: shots before reload | betweenCooldown: seconds between shots | reloadTime: seconds
const MAGAZINE_CONFIG: Record<string, { maxMag: number; betweenCooldown: number; reloadTime: number }> = {
  gunslinger: { maxMag: 6, betweenCooldown: 0.25, reloadTime: 1.4 }, // 6-shooter, ~4 shots/sec burst
  dynamiter:  { maxMag: 3, betweenCooldown: 0.5,  reloadTime: 2.0 }, // 3 sticks, weighty throws
};

// ─── Melee power-strike config ────────────────────────────────────────────────
// chargeTime: seconds to reach full charge (1.0) from 0
// Damage scales with charge: 0-30%→20%, 30-70%→55%, 70-99%→100%, 100%→135%
const MELEE_CHARGE_CONFIG: Record<string, { chargeTime: number }> = {
  deputy:        { chargeTime: 0.7  }, // light, fast fighter
  bounty_hunter: { chargeTime: 0.85 }, // balanced
  marshal:       { chargeTime: 1.1  }, // heavy hitter — patience rewarded
};

// Returns damage multiplier based on charge level (0.0 → 1.0)
function getMeleeChargeDamage(charge: number, baseDamage: number): { dmg: number; label: string; color: string } {
  if (charge >= 1.0) return { dmg: baseDamage * 1.35, label: `⚡ -${Math.round(baseDamage * 1.35)} POWER!`, color: "#FFD700" };
  if (charge >= 0.7) return { dmg: baseDamage * 1.0,  label: `-${Math.round(baseDamage)}`,         color: "#ff4444" };
  if (charge >= 0.3) return { dmg: baseDamage * 0.55, label: `-${Math.round(baseDamage * 0.55)}`,  color: "#ff8844" };
  return                    { dmg: baseDamage * 0.2,  label: `-${Math.round(baseDamage * 0.2)}`,   color: "#ff6666" };
}

export function possessedAttack(state: GameState): GameState {
  if (!state.selectedUnitId) return state;
  const attacker = state.units.find(u => u.id === state.selectedUnitId);
  if (!attacker) return state;

  // ── Block if between-shot cooldown active (all unit types) ──
  if (attacker.attackCooldown > 0) return state;

  const s = { ...state, units: state.units.map(u => ({ ...u })) };
  const a = s.units.find(u => u.id === state.selectedUnitId)!;

  // ── RANGED: Magazine system ───────────────────────────────────────────────
  if (attacker.type === "gunslinger" || attacker.type === "dynamiter") {
    const cfg = MAGAZINE_CONFIG[attacker.type];

    // Block if reloading
    if (a.reloadTimer > 0) return state;

    // Initialize magazine on first use
    if (a.maxMagazine === 0) {
      a.maxMagazine = cfg.maxMag;
      a.magazine = cfg.maxMag;
    }

    // Magazine empty — start reload (shouldn't normally reach here since reload
    // is queued immediately after last shot, but safety net)
    if (a.magazine <= 0) {
      a.reloadTimer = cfg.reloadTime;
      a.magazine = 0;
      return s;
    }

    // Fire a shot
    a.magazine -= 1;
    a.attackCooldown = cfg.betweenCooldown;
    a.state = "attacking";

    // Queue reload immediately after last shot
    if (a.magazine === 0) {
      a.reloadTimer = cfg.reloadTime;
    }

    // Find target in 2× range
    const range = attacker.stats.range * 2;
    let target: Unit | null = null;
    let minDist = Infinity;
    for (const u of s.units) {
      if (u.team === "player" || u.state === "dead" || u.state === "dying") continue;
      const dist = Math.hypot(u.pos.x - attacker.pos.x, u.pos.y - attacker.pos.y);
      if (dist < range && dist < minDist) { minDist = dist; target = u; }
    }

    const enemySaloon = s.buildings.find(b => b.id === "enemy_saloon");
    const saloonDist = enemySaloon
      ? Math.abs(attacker.pos.x - (enemySaloon.pos.x + enemySaloon.width / 2))
      : Infinity;

    if (target) {
      const dmg = attacker.stats.damage * 1.3;
      const t = s.units.find(u => u.id === target!.id)!;
      t.stats.hp -= dmg;
      spawnFloatingText(s, { x: t.pos.x, y: t.pos.y - 40 }, `-${Math.round(dmg)}`, "#ff4444");
      if (t.stats.hp <= 0) {
        t.state = "dying"; t.deathTimer = 0;
        spawnDeathParticles(s, t.pos);
        if (t.team === "enemy" && t.type === "miner" && t.goldCarrying > 0) {
          s.gold += t.goldCarrying;
          spawnFloatingText(s, { x: t.pos.x, y: t.pos.y - 60 }, `+$${t.goldCarrying} STOLEN!`, "#FFD700");
          t.goldCarrying = 0;
        }
      }
    } else if (enemySaloon && saloonDist < range) {
      enemySaloon.hp -= attacker.stats.damage;
      spawnFloatingText(s, { x: enemySaloon.pos.x + 40, y: enemySaloon.pos.y }, `-${attacker.stats.damage}`, "#ff4444");
    } else {
      // No target — fire projectile anyway
      if (attacker.type === "gunslinger") {
        s.projectiles.push({
          id: `pa_${Date.now()}`,
          pos: { x: attacker.pos.x, y: attacker.pos.y - 20 },
          vel: { x: attacker.facing * 400, y: -15 },
          team: "player", damage: attacker.stats.damage,
          type: "bullet", life: 0.6, exploded: false,
        });
        s.soundEvents.push("colt-shot");
      } else {
        const throwDist = attacker.facing * 200;
        s.projectiles.push({
          id: `pa_${Date.now()}`,
          pos: { x: attacker.pos.x, y: attacker.pos.y - 20 },
          vel: { x: throwDist * 0.6, y: -250 },
          team: "player", damage: attacker.stats.damage,
          type: "dynamite", life: 2.0, exploded: false,
        });
      }
    }
    return s;
  }

  // ── MELEE: Power Strike charge system ────────────────────────────────────
  if (attacker.type === "deputy" || attacker.type === "bounty_hunter" || attacker.type === "marshal") {
    const cfg = MELEE_CHARGE_CONFIG[attacker.type];

    // Initialize charge system on first possession
    if (a.swingChargeMax === 0) {
      a.swingChargeMax = cfg.chargeTime;
      a.swingCharge = 0; // start at 0 — must charge up first
    }

    // Calculate damage based on current charge level
    const { dmg, label, color } = getMeleeChargeDamage(a.swingCharge, attacker.stats.damage);

    // Set cooldown based on charge — full charge = normal attack rate, spam = faster but weaker
    // This prevents spam from being faster than normal AI attacks
    const normalCooldown = 1 / attacker.stats.attackRate;
    a.attackCooldown = normalCooldown * 0.5; // always 50% of normal cooldown between swings
    a.swingCharge = 0; // reset charge after swing
    a.state = "attacking";

    // Find nearest enemy in 2× range
    const range = attacker.stats.range * 2;
    let target: Unit | null = null;
    let minDist = Infinity;
    for (const u of s.units) {
      if (u.team === "player" || u.state === "dead" || u.state === "dying") continue;
      const dist = Math.hypot(u.pos.x - attacker.pos.x, u.pos.y - attacker.pos.y);
      if (dist < range && Math.abs(u.pos.y - attacker.pos.y) <= Y_ATTACK_THRESHOLD && dist < minDist) {
        minDist = dist; target = u;
      }
    }

    const enemySaloon = s.buildings.find(b => b.id === "enemy_saloon");
    const saloonDist = enemySaloon
      ? Math.abs(attacker.pos.x - (enemySaloon.pos.x + enemySaloon.width / 2))
      : Infinity;

    if (target) {
      const t = s.units.find(u => u.id === target!.id)!;
      t.stats.hp -= dmg;
      spawnFloatingText(s, { x: t.pos.x, y: t.pos.y - 40 }, label, color);
      if (t.stats.hp <= 0) {
        t.state = "dying"; t.deathTimer = 0;
        spawnDeathParticles(s, t.pos);
        if (t.team === "enemy" && t.type === "miner" && t.goldCarrying > 0) {
          s.gold += t.goldCarrying;
          spawnFloatingText(s, { x: t.pos.x, y: t.pos.y - 60 }, `+$${t.goldCarrying} STOLEN!`, "#FFD700");
          t.goldCarrying = 0;
        }
      }
    } else if (enemySaloon && saloonDist < range) {
      enemySaloon.hp -= dmg;
      spawnFloatingText(s, { x: enemySaloon.pos.x + 40, y: enemySaloon.pos.y }, label, color);
    }
    return s;
  }

  // ── MINER: Simple cooldown (same as normal attack rate) ──────────────────
  // Miners aren't fighters — just a basic swing with no special system
  const minerCooldown = 1 / attacker.stats.attackRate;
  const s2 = { ...state, units: state.units.map(u => ({ ...u })) };
  const a2 = s2.units.find(u => u.id === state.selectedUnitId)!;
  a2.attackCooldown = minerCooldown;
  a2.state = "attacking";

  const range2 = attacker.stats.range * 1.5;
  let target2: Unit | null = null;
  let minDist2 = Infinity;
  for (const u of s2.units) {
    if (u.team === "player" || u.state === "dead" || u.state === "dying") continue;
    const dist = Math.hypot(u.pos.x - attacker.pos.x, u.pos.y - attacker.pos.y);
    if (dist < range2 && Math.abs(u.pos.y - attacker.pos.y) <= Y_ATTACK_THRESHOLD && dist < minDist2) {
      minDist2 = dist; target2 = u;
    }
  }
  if (target2) {
    const t = s2.units.find(u => u.id === target2!.id)!;
    const dmg = attacker.stats.damage;
    t.stats.hp -= dmg;
    spawnFloatingText(s2, { x: t.pos.x, y: t.pos.y - 40 }, `-${Math.round(dmg)}`, "#ff4444");
    if (t.stats.hp <= 0) {
      t.state = "dying"; t.deathTimer = 0;
      spawnDeathParticles(s2, t.pos);
    }
  }
  return s2;
}
