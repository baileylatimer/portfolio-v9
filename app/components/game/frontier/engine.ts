// ─── Frontier Wars — Game Engine ──────────────────────────────────────────────

import type {
  GameState, Unit, Building, Projectile, GoldPile,
  UnitType, Team, Vec2,
} from "./types";
import { getStats, WORLD, LEVELS, GOLD_PILE_POSITIONS, TRAIN_TIME, MAX_UNITS, PASSIVE_GOLD_BASE } from "./configs";
import type { Stance } from "./types";

let _idCounter = 0;
const uid = () => `u${++_idCounter}`;

// ─── Initial State ────────────────────────────────────────────────────────────

export function createInitialState(level: number, upgrades: GameState["upgrades"]): GameState {
  const lvl = LEVELS[level];
  const buildings: Building[] = [
    { id: "player_saloon", type: "saloon",      team: "player", pos: { x: WORLD.playerSaloonX, y: WORLD.groundY - 80 }, hp: 1000, maxHp: 1000, width: 80, height: 80 },
    { id: "enemy_saloon",  type: "enemy_saloon", team: "enemy",  pos: { x: WORLD.enemySaloonX,  y: WORLD.groundY - 80 }, hp: 1000, maxHp: 1000, width: 80, height: 80 },
  ];

  // Create gold piles spread across the map
  const goldPiles: GoldPile[] = GOLD_PILE_POSITIONS.map((pos, i) => ({
    id: `pile_${i}`,
    pos: { x: pos.x, y: WORLD.groundY - 8 },
    gold: pos.gold,
    maxGold: pos.gold,
  }));

  return {
    phase: "BATTLE",
    level,
    gold: lvl.startGold,
    units: [],
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
    enemyGold: lvl.startGold * 0.8,
    enemySpawnTimer: 3.0,
    upgradePoints: 0,
    upgrades,
    cameraX: 0,
    manualCamera: false,
    selectedUnitId: null,
    time: 0,
  };
}

// ─── Spawn Unit ───────────────────────────────────────────────────────────────

// Zero-upgrade baseline for enemy units — upgrades only benefit the player
const ENEMY_UPGRADES: GameState["upgrades"] = {
  minerSpeed: 0, minerCapacity: 0,
  deputyHp: 0, deputyDamage: 0,
  gunslingerRange: 0, gunslingerRate: 0,
  dynamiterRadius: 0, marshalHp: 0,
  saloonRevenue: 0,
};

export function spawnUnit(state: GameState, type: UnitType, team: Team): Unit {
  // Player gets upgraded stats; enemy always uses base stats
  const stats = team === "player" ? getStats(type, state.upgrades) : getStats(type, ENEMY_UPGRADES);
  const isPlayer = team === "player";
  const spawnX = isPlayer
    ? WORLD.playerSaloonX + 90
    : WORLD.enemySaloonX - 90;

  return {
    id: uid(),
    type,
    team,
    pos: { x: spawnX, y: WORLD.groundY - stats.hp * 0 - 32 }, // ground level
    stats: { ...stats },
    state: type === "miner" ? "walking" : "walking",
    facing: isPlayer ? 1 : -1,
    attackCooldown: 0,
    mineTimer: 0,
    animFrame: 0,
    animTimer: 0,
    targetId: null,
    goldCarrying: 0,
    selected: false,
    deathTimer: 0,
  };
}

// ─── Main Update ──────────────────────────────────────────────────────────────

export function updateGame(state: GameState, dt: number): GameState {
  if (state.phase !== "BATTLE") return state;

  const s = { ...state };
  s.time += dt;
  s.units = s.units.map(u => ({ ...u }));
  s.goldPiles = s.goldPiles.map(p => ({ ...p }));
  s.projectiles = s.projectiles.map(p => ({ ...p }));
  s.particles = s.particles.map(p => ({ ...p }));
  s.floatingTexts = s.floatingTexts.map(t => ({ ...t }));

  // ── Passive gold income ──
  s.passiveGoldTimer += dt;
  if (s.passiveGoldTimer >= 1.0) {
    s.passiveGoldTimer -= 1.0;
    const income = PASSIVE_GOLD_BASE + s.upgrades.saloonRevenue * 2;
    s.gold += income;
    // Small floating text near saloon
    const saloon = s.buildings.find(b => b.id === "player_saloon");
    if (saloon) {
      spawnFloatingText(s, { x: saloon.pos.x + 40, y: saloon.pos.y - 5 }, `+${income}g`, "#FFD700");
    }
  }

  // ── Training system (replaces old spawn queue) ──
  s.units = processTraining(s, dt);

  // ── Unit AI ──
  s.units.forEach(unit => {
    if (unit.state === "dead") return;
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
    s.upgradePoints += 2;
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
          // Shoot at 50% damage
          const vel: Vec2 = { x: 400, y: -10 };
          s.projectiles.push({
            id: `g${Date.now()}_${Math.random()}`,
            pos: { x: saloon.pos.x + saloon.width, y: saloon.pos.y + 20 },
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

  // ── DEFENSE: hold a line ~300px ahead of saloon, engage enemies that approach ──
  if (stance === "defense") {
    const saloon = s.buildings.find(b => b.id === "player_saloon");
    const defenseLine = saloon ? saloon.pos.x + saloon.width + 300 : 400;

    const enemy = findNearestEnemy(unit, s);
    if (enemy) {
      const dist = Math.abs(unit.pos.x - enemy.pos.x);
      if (dist <= unit.stats.range) {
        unit.state = "attacking";
        unit.facing = enemy.pos.x > unit.pos.x ? 1 : -1;
        if (unit.attackCooldown <= 0) {
          performAttack(unit, enemy, s);
          unit.attackCooldown = 1 / unit.stats.attackRate;
        }
      } else if (enemy.pos.x < unit.pos.x + 400) {
        // Enemy is approaching — move to intercept (but don't go past defense line + 200)
        const maxAdvance = defenseLine + 200;
        if (unit.pos.x < maxAdvance) {
          unit.state = "walking";
          unit.facing = enemy.pos.x > unit.pos.x ? 1 : -1;
          unit.pos.x += unit.facing * unit.stats.speed * dt;
        } else {
          unit.state = "idle";
        }
      } else {
        // No nearby threat — hold at defense line
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
      // No enemies — hold at defense line
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
  const enemy = findNearestEnemy(unit, s);
  if (enemy) {
    const dist = Math.abs(unit.pos.x - enemy.pos.x);
    if (dist <= unit.stats.range) {
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
    }
  } else {
    const targetX = WORLD.enemySaloonX;
    unit.facing = 1;
    unit.state = "walking";
    unit.pos.x += unit.stats.speed * dt;
    const enemySaloon = s.buildings.find(b => b.type === "enemy_saloon");
    if (enemySaloon) {
      const dist = Math.abs(unit.pos.x - (enemySaloon.pos.x + enemySaloon.width / 2));
      if (dist <= unit.stats.range && unit.attackCooldown <= 0) {
        unit.state = "attacking";
        enemySaloon.hp -= unit.stats.damage;
        unit.attackCooldown = 1 / unit.stats.attackRate;
        spawnFloatingText(s, { x: enemySaloon.pos.x + 40, y: enemySaloon.pos.y }, `-${unit.stats.damage}`, "#ff4444");
      }
    }
    void targetX;
  }
}

function updateCombatUnitEnemy(unit: Unit, s: GameState, dt: number) {
  // Enemy always attacks (no stance system for enemy)
  const enemy = findNearestEnemy(unit, s);
  if (enemy) {
    const dist = Math.abs(unit.pos.x - enemy.pos.x);
    if (dist <= unit.stats.range) {
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
    }
  } else {
    unit.facing = -1;
    unit.state = "walking";
    unit.pos.x -= unit.stats.speed * dt;
    const playerSaloon = s.buildings.find(b => b.type === "saloon");
    if (playerSaloon) {
      const dist = Math.abs(unit.pos.x - (playerSaloon.pos.x + playerSaloon.width / 2));
      if (dist <= unit.stats.range && unit.attackCooldown <= 0) {
        unit.state = "attacking";
        playerSaloon.hp -= unit.stats.damage;
        unit.attackCooldown = 1 / unit.stats.attackRate;
        spawnFloatingText(s, { x: playerSaloon.pos.x + 40, y: playerSaloon.pos.y }, `-${unit.stats.damage}`, "#ff4444");
      }
    }
  }
}

function updateMiner(unit: Unit, s: GameState, dt: number) {
  const saloon = s.buildings.find(b => b.team === unit.team && (b.type === "saloon" || b.type === "enemy_saloon"));
  if (!saloon) return;

  const saloonCenter = saloon.pos.x + saloon.width / 2;
  const isPlayer = unit.team === "player";

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

    const dist = Math.abs(unit.pos.x - targetPile.pos.x);
    if (dist > 18) {
      unit.state = "walking";
      unit.facing = targetPile.pos.x > unit.pos.x ? 1 : -1;
      unit.pos.x += unit.facing * unit.stats.speed * dt;
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
    // Return to saloon with gold
    const dist = Math.abs(unit.pos.x - saloonCenter);
    if (dist > 20) {
      unit.state = "returning";
      unit.facing = saloonCenter > unit.pos.x ? 1 : -1;
      unit.pos.x += unit.facing * unit.stats.speed * dt;
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

  // Miners fight back if attacked
  const nearbyEnemy = s.units.find(u =>
    u.team !== unit.team && u.state !== "dead" && u.state !== "dying" &&
    Math.abs(u.pos.x - unit.pos.x) < unit.stats.range
  );
  if (nearbyEnemy && unit.attackCooldown <= 0) {
    unit.stats.hp -= nearbyEnemy.stats.damage * 0.5;
    unit.attackCooldown = 1 / unit.stats.attackRate;
  }
}

function findNearestEnemy(unit: Unit, s: GameState): Unit | null {
  let nearest: Unit | null = null;
  let minDist = Infinity;
  for (const other of s.units) {
    if (other.team === unit.team || other.state === "dead" || other.state === "dying") continue;
    const dist = Math.abs(other.pos.x - unit.pos.x);
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
  unit.stats.hp -= damage;
  spawnFloatingText(s, { x: unit.pos.x, y: unit.pos.y - 40 }, `-${damage}`, "#ff4444");
  if (unit.stats.hp <= 0) {
    unit.state = "dying";
    unit.deathTimer = 0;
    spawnDeathParticles(s, unit.pos);
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
      // Check unit hits
      for (const unit of s.units) {
        if (unit.team === proj.team || unit.state === "dead" || unit.state === "dying") continue;
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
    if (unit.team === proj.team || unit.state === "dead") continue;
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

// ─── Enemy AI ─────────────────────────────────────────────────────────────────

function updateEnemyAI(s: GameState, dt: number) {
  const lvl = LEVELS[s.level];
  s.enemySpawnTimer -= dt;

  if (s.enemySpawnTimer <= 0) {
    s.enemySpawnTimer = 2.5 - lvl.enemyAggression * 1.5;

    // Decide what to spawn based on budget and unit caps
    const enemyUnitCounts: Partial<Record<UnitType, number>> = {};
    for (const u of s.units.filter(u => u.team === "enemy")) {
      enemyUnitCounts[u.type] = (enemyUnitCounts[u.type] || 0) + 1;
    }

    // Always try to have miners
    const maxMiners = lvl.enemyUnits.miner || 0;
    const currentMiners = enemyUnitCounts.miner || 0;
    if (currentMiners < maxMiners && s.enemyGold >= 150) {
      const unit = spawnUnit(s, "miner", "enemy");
      s.units.push(unit);
      s.enemyGold -= 150;
      return;
    }

    // Spawn combat units based on budget
    const combatTypes: UnitType[] = ["deputy", "gunslinger", "dynamiter", "marshal"];
    const combatCosts: Record<string, number> = { deputy: 200, gunslinger: 400, dynamiter: 600, marshal: 1200 };
    const available = combatTypes.filter(t => {
      const max = lvl.enemyUnits[t] || 0;
      const current = enemyUnitCounts[t] || 0;
      const cost = combatCosts[t] || 999;
      return max > current && s.enemyGold >= cost;
    });

    if (available.length > 0 && Math.random() < lvl.enemyAggression) {
      const type = available[Math.floor(Math.random() * available.length)];
      const cost = combatCosts[type] || 999;
      if (s.enemyGold >= cost) {
        const unit = spawnUnit(s, type, "enemy");
        s.units.push(unit);
        s.enemyGold -= cost;
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
  return { ...state, stance };
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

// Min Y a unit can reach (top of walking lane — about 60px above ground)
const POSSESSED_MIN_Y = WORLD.groundY - 70;
const POSSESSED_MAX_Y = WORLD.groundY - 10;

export function movePossessedUnit(state: GameState, dx: number, dy: number, dt: number): GameState {
  if (!state.selectedUnitId) return state;
  const speed = 180;
  return {
    ...state,
    units: state.units.map(u => {
      if (u.id !== state.selectedUnitId) return u;
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

export function possessedAttack(state: GameState): GameState {
  if (!state.selectedUnitId) return state;
  const attacker = state.units.find(u => u.id === state.selectedUnitId);
  if (!attacker || attacker.attackCooldown > 0) return state;

  // Find nearest enemy in range (use 2× normal range for possessed)
  const range = attacker.stats.range * 2;
  let target: Unit | null = null;
  let minDist = Infinity;
  for (const u of state.units) {
    if (u.team === "player" || u.state === "dead" || u.state === "dying") continue;
    const dist = Math.hypot(u.pos.x - attacker.pos.x, u.pos.y - attacker.pos.y);
    if (dist < range && dist < minDist) { minDist = dist; target = u; }
  }

  // Also check enemy saloon
  const enemySaloon = state.buildings.find(b => b.id === "enemy_saloon");
  const saloonDist = enemySaloon
    ? Math.abs(attacker.pos.x - (enemySaloon.pos.x + enemySaloon.width / 2))
    : Infinity;

  const s = { ...state, units: state.units.map(u => ({ ...u })) };

  if (target) {
    // Direct damage + set attacker cooldown
    const dmg = attacker.stats.damage * 1.5; // possessed hits harder
    const t = s.units.find(u => u.id === target!.id)!;
    t.stats.hp -= dmg;
    spawnFloatingText(s, { x: t.pos.x, y: t.pos.y - 40 }, `-${Math.round(dmg)}`, "#ff4444");
    if (t.stats.hp <= 0) { t.state = "dying"; t.deathTimer = 0; spawnDeathParticles(s, t.pos); }
    const a = s.units.find(u => u.id === state.selectedUnitId)!;
    a.attackCooldown = 1 / a.stats.attackRate;
    a.state = "attacking";
  } else if (enemySaloon && saloonDist < range) {
    enemySaloon.hp -= attacker.stats.damage;
    spawnFloatingText(s, { x: enemySaloon.pos.x + 40, y: enemySaloon.pos.y }, `-${attacker.stats.damage}`, "#ff4444");
    const a = s.units.find(u => u.id === state.selectedUnitId)!;
    a.attackCooldown = 1 / a.stats.attackRate;
    a.state = "attacking";
  }

  return s;
}
