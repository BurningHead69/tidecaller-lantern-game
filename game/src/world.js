// TIDECALLER's rules and state, with no drawing and no browser in it: the lantern-boat,
// drifting lumen orbs, hunting shadow wisps, light bolts, waves, the combo chain and the
// between-wave upgrades. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react (sound, announcements) without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.

import { BOAT, COMBO, FIELD, ORB, POOL, TOTAL_WAVES, UPGRADES, WAVES, WISP } from './config.js';
import { rangeRandom, shuffleRandom } from './random.js';

export const KIND_DRIFTER = 'drifter';
export const KIND_DARTER = 'darter';
export const KIND_SPLITTER = 'splitter';
export const KIND_MOTE = 'mote';
export const KIND_WARDEN = 'warden';

export const EVENT_ORB = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_SHOOT = 32;
export const EVENT_PULSE = 64;
export const EVENT_WISP_DIE = 128;
export const EVENT_SHIELD = 256;
export const EVENT_WARDEN = 512;

function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2, y: FIELD.height / 2 + 60, angle: -Math.PI / 2,
    hull: BOAT.maxHull, maxHull: BOAT.maxHull, light: BOAT.maxLight, maxLight: BOAT.maxLight,
    invulnerable: 0, fireCooldown: 0, pulseCooldown: 0,
    speedMul: 1, orbScoreMul: 1, orbLightMul: 1, pierce: 0, pulseRadiusMul: 1, pulseDamage: 0,
    fireRateMul: 1, lightDrainMul: 1, shieldCharges: 0,
  };
  const upgradesTaken = {};
  for (const upgrade of UPGRADES) upgradesTaken[upgrade.id] = 0;

  const orbs = [];
  for (let index = 0; index < POOL.orbs; index += 1) {
    orbs.push({ active: false, x: 0, y: 0, age: 0, life: ORB.lifetime, phase: 0 });
  }
  const wisps = [];
  for (let index = 0; index < POOL.wisps; index += 1) {
    wisps.push({
      active: false, kind: KIND_DRIFTER, x: 0, y: 0, vx: 0, vy: 0, hp: 1, radius: 17,
      speed: 95, score: 25, hullDamage: 12, lightDamage: 6, colour: WISP.drifter.colour,
      lungeTimer: 0, lunging: 0, shootTimer: 0, flash: 0, wobble: 0,
    });
  }
  const bolts = [];
  for (let index = 0; index < POOL.bolts; index += 1) {
    bolts.push({ active: false, hostile: false, x: 0, y: 0, vx: 0, vy: 0, damage: 1, pierce: 0, life: 0, radius: 6 });
  }
  const particles = [];
  for (let index = 0; index < POOL.particles; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, colour: '#ffffff' });
  }
  const floaters = [];
  for (let index = 0; index < POOL.floaters; index += 1) {
    floaters.push({ active: false, x: 0, y: 0, text: '', life: 0, maxLife: 1, colour: '#ffffff', size: 18 });
  }

  const state = {
    player, orbs, wisps, bolts, particles, floaters,
    score: 0, combo: 0, comboTimer: 0, bestCombo: 0, kills: 0, orbsCollected: 0,
    wave: 1, waveState: 'fight', spawnQueue: [], spawnTimer: 0, orbTimer: 0,
    time: 0, shake: 0, choices: [], pulsesUsed: 0, boltsFired: 0,
  };

  function free(pool) {
    for (let index = 0; index < pool.length; index += 1) {
      if (!pool[index].active) return pool[index];
    }
    return null;
  }

  function burst(x, y, colour, count, speed, size) {
    for (let index = 0; index < count; index += 1) {
      const particle = free(particles);
      if (particle === null) return;
      const angle = random() * Math.PI * 2;
      const power = speed * (0.3 + random() * 0.7);
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * power;
      particle.vy = Math.sin(angle) * power;
      particle.maxLife = 0.4 + random() * 0.5;
      particle.life = particle.maxLife;
      particle.size = size * (0.6 + random() * 0.8);
      particle.colour = colour;
    }
  }

  function addFloater(x, y, text, colour, size) {
    const floater = free(floaters);
    if (floater === null) return;
    floater.active = true;
    floater.x = x;
    floater.y = y;
    floater.text = text;
    floater.life = 1.1;
    floater.maxLife = 1.1;
    floater.colour = colour;
    floater.size = size || 18;
  }

  function spawnOrb(nearPlayer) {
    const orb = free(orbs);
    if (orb === null) return;
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 8; tries += 1) {
      x = rangeRandom(random, 50, FIELD.width - 50);
      y = rangeRandom(random, 90, FIELD.height - 90);
      if (!nearPlayer || distanceSq(x, y, player.x, player.y) > 120 * 120) break;
    }
    orb.active = true;
    orb.x = x;
    orb.y = y;
    orb.age = 0;
    orb.life = ORB.lifetime;
    orb.phase = random() * Math.PI * 2;
  }

  function spawnWisp(kind, x, y) {
    const def = WISP[kind];
    const wisp = free(wisps);
    if (wisp === null) return null;
    wisp.active = true;
    wisp.kind = kind;
    wisp.x = x !== undefined ? x : random() * FIELD.width;
    wisp.y = y !== undefined ? y : -40;
    wisp.vx = 0;
    wisp.vy = 0;
    wisp.hp = def.hp;
    wisp.radius = def.radius;
    wisp.speed = def.speed * (WAVES[state.wave - 1]?.wispSpeed ?? 1);
    wisp.score = def.score;
    wisp.hullDamage = def.hullDamage;
    wisp.lightDamage = def.lightDamage;
    wisp.colour = def.colour;
    wisp.lungeTimer = 1 + random() * 1.5;
    wisp.lunging = 0;
    wisp.shootTimer = 2.5 + random();
    wisp.flash = 0;
    wisp.wobble = random() * Math.PI * 2;
    return wisp;
  }

  function edgeSpawn() {
    const side = Math.floor(random() * 4);
    if (side === 0) return { x: random() * FIELD.width, y: -40 };
    if (side === 1) return { x: random() * FIELD.width, y: FIELD.height + 40 };
    if (side === 2) return { x: -40, y: random() * FIELD.height };
    return { x: FIELD.width + 40, y: random() * FIELD.height };
  }

  function buildSpawnQueue(waveNumber) {
    const def = WAVES[waveNumber - 1];
    const queue = [];
    for (let index = 0; index < def.drifters; index += 1) queue.push(KIND_DRIFTER);
    for (let index = 0; index < def.darters; index += 1) queue.push(KIND_DARTER);
    for (let index = 0; index < def.splitters; index += 1) queue.push(KIND_SPLITTER);
    for (let index = 0; index < def.wardens; index += 1) queue.push(KIND_WARDEN);
    return shuffleRandom(random, queue);
  }

  function startWave(waveNumber) {
    state.wave = waveNumber;
    state.waveState = 'fight';
    state.spawnQueue = buildSpawnQueue(waveNumber);
    state.spawnTimer = 1.0;
    state.orbTimer = 0.4;
    state.choices = [];
    player.shieldCharges = upgradesTaken.shield > 0 ? 1 : 0;
  }

  function offerChoices() {
    const available = UPGRADES.filter((upgrade) => upgradesTaken[upgrade.id] < upgrade.max);
    const picked = shuffleRandom(random, available).slice(0, 3);
    state.choices = picked;
    state.waveState = 'choice';
  }

  function applyUpgrade(upgradeId) {
    const upgrade = UPGRADES.find((item) => item.id === upgradeId);
    if (!upgrade || state.waveState !== 'choice') return false;
    if (!state.choices.some((choice) => choice.id === upgradeId)) return false;
    upgradesTaken[upgradeId] += 1;
    if (upgradeId === 'beam') player.pierce += 1;
    else if (upgradeId === 'swift') player.speedMul *= 1.18;
    else if (upgradeId === 'shield') player.shieldCharges = 1;
    else if (upgradeId === 'rich') { player.orbScoreMul *= 2; player.orbLightMul *= 1.5; }
    else if (upgradeId === 'pulse') { player.pulseRadiusMul *= 1.6; player.pulseDamage += 1; }
    else if (upgradeId === 'hull') { player.maxHull += 20; player.hull = Math.min(player.maxHull, player.hull + 40); }
    else if (upgradeId === 'flame') { player.maxLight += 20; player.lightDrainMul *= 0.7; player.light = Math.min(player.maxLight, player.light + 20); }
    else if (upgradeId === 'rapid') player.fireRateMul *= 0.75;
    startWave(state.wave + 1);
    return true;
  }

  function killWisp(wisp, events) {
    wisp.active = false;
    state.kills += 1;
    state.score += wisp.score;
    burst(wisp.x, wisp.y, wisp.colour, wisp.kind === KIND_WARDEN ? 40 : 14, 260, 4);
    addFloater(wisp.x, wisp.y, `+${wisp.score}`, '#d9c8ff', 18);
    if (wisp.kind === KIND_SPLITTER) {
      for (let index = 0; index < 2; index += 1) {
        // Keep the motes inside the sea, even when the splitter dies at an edge.
        const moteX = Math.min(FIELD.width - 20, Math.max(20, wisp.x + (index === 0 ? -24 : 24)));
        const moteY = Math.min(FIELD.height - 20, Math.max(20, wisp.y));
        const mote = spawnWisp(KIND_MOTE, moteX, moteY);
        if (mote !== null) mote.hp = 1;
      }
    }
    if (wisp.kind === KIND_WARDEN) {
      burst(wisp.x, wisp.y, '#ffc94d', 30, 320, 5);
      addFloater(wisp.x, wisp.y - 30, 'WARDEN SUNK!', '#ffc94d', 26);
      return events | EVENT_WISP_DIE | EVENT_WARDEN;
    }
    return events | EVENT_WISP_DIE;
  }

  function hurtPlayer(hullDamage, lightDamage, fromX, fromY) {
    if (player.shieldCharges > 0) {
      player.shieldCharges -= 1;
      player.invulnerable = 1.0;
      burst(player.x, player.y, '#9fe8ff', 18, 240, 4);
      addFloater(player.x, player.y - 34, 'SHIELD!', '#9fe8ff', 20);
      return EVENT_SHIELD;
    }
    player.hull -= hullDamage;
    player.light = Math.max(0, player.light - lightDamage);
    player.invulnerable = BOAT.invulnerable;
    state.shake = 14;
    state.combo = 0;
    state.comboTimer = 0;
    burst(player.x, player.y, '#ff5d73', 22, 300, 4);
    const dx = player.x - fromX;
    const dy = player.y - fromY;
    const length = Math.hypot(dx, dy) || 1;
    player.x = Math.min(FIELD.width - 30, Math.max(30, player.x + (dx / length) * 46));
    player.y = Math.min(FIELD.height - 30, Math.max(80, player.y + (dy / length) * 46));
    return EVENT_HIT;
  }

  function updateParticles(dt) {
    for (const particle of particles) {
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) { particle.active = false; continue; }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    }
    for (const floater of floaters) {
      if (!floater.active) continue;
      floater.life -= dt;
      if (floater.life <= 0) { floater.active = false; continue; }
      floater.y -= 34 * dt;
    }
  }

  function updateOrbs(dt, harmless) {
    let activeCount = 0;
    for (const orb of orbs) {
      if (!orb.active) continue;
      activeCount += 1;
      orb.age += dt;
      orb.life -= dt;
      if (orb.life <= 0) { orb.active = false; continue; }
      orb.y += 12 * dt;
      if (orb.y > FIELD.height - 20) orb.y = FIELD.height - 20;
    }
    if (!harmless && activeCount < ORB.maxOnField) {
      state.orbTimer -= dt;
      if (state.orbTimer <= 0) {
        spawnOrb(true);
        state.orbTimer = WAVES[state.wave - 1].orbGap * (0.8 + random() * 0.4);
      }
    }
    return activeCount;
  }

  function updateWisps(dt, harmless) {
    for (const wisp of wisps) {
      if (!wisp.active) continue;
      if (wisp.flash > 0) wisp.flash -= dt;
      const dx = player.x - wisp.x;
      const dy = player.y - wisp.y;
      const distance = Math.hypot(dx, dy) || 1;
      const nx = dx / distance;
      const ny = dy / distance;
      if (wisp.kind === KIND_DARTER) {
        wisp.lungeTimer -= dt;
        if (wisp.lunging > 0) {
          wisp.lunging -= dt;
          wisp.x += wisp.vx * dt;
          wisp.y += wisp.vy * dt;
        } else if (wisp.lungeTimer <= 0 && distance < 420) {
          wisp.lunging = 0.55;
          wisp.vx = nx * wisp.speed * 3.4;
          wisp.vy = ny * wisp.speed * 3.4;
          wisp.lungeTimer = 2.4;
        } else {
          wisp.x += nx * wisp.speed * 0.45 * dt;
          wisp.y += ny * wisp.speed * 0.45 * dt;
        }
      } else if (wisp.kind === KIND_MOTE) {
        wisp.wobble += dt * 6;
        wisp.x += (nx * wisp.speed + Math.cos(wisp.wobble) * 90) * dt;
        wisp.y += (ny * wisp.speed + Math.sin(wisp.wobble) * 90) * dt;
      } else if (wisp.kind === KIND_WARDEN) {
        wisp.x += nx * wisp.speed * dt;
        wisp.y += ny * wisp.speed * dt;
        wisp.shootTimer -= dt;
        if (wisp.shootTimer <= 0 && !harmless) {
          wisp.shootTimer = 3.0;
          const bolt = free(bolts);
          if (bolt !== null) {
            bolt.active = true;
            bolt.hostile = true;
            bolt.x = wisp.x;
            bolt.y = wisp.y;
            bolt.vx = nx * 230;
            bolt.vy = ny * 230;
            bolt.damage = 1;
            bolt.pierce = 0;
            bolt.life = 4;
            bolt.radius = 8;
          }
        }
      } else {
        wisp.x += nx * wisp.speed * dt;
        wisp.y += ny * wisp.speed * dt;
      }
      if (wisp.x < -80 || wisp.x > FIELD.width + 80 || wisp.y < -80 || wisp.y > FIELD.height + 80) {
        wisp.active = false;
      }
    }
  }

  function updateBolts(dt) {
    for (const bolt of bolts) {
      if (!bolt.active) continue;
      bolt.life -= dt;
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      if (bolt.life <= 0 || bolt.x < -20 || bolt.x > FIELD.width + 20 || bolt.y < -20 || bolt.y > FIELD.height + 20) {
        bolt.active = false;
      }
    }
  }

  function collideBoltsWithWisps(events) {
    for (const bolt of bolts) {
      if (!bolt.active || bolt.hostile) continue;
      for (const wisp of wisps) {
        if (!wisp.active) continue;
        const reach = bolt.radius + wisp.radius;
        if (distanceSq(bolt.x, bolt.y, wisp.x, wisp.y) > reach * reach) continue;
        wisp.hp -= bolt.damage;
        wisp.flash = 0.12;
        burst(bolt.x, bolt.y, '#ffd97a', 6, 160, 3);
        if (wisp.hp <= 0) events = killWisp(wisp, events);
        if (bolt.pierce > 0) {
          bolt.pierce -= 1;
        } else {
          bolt.active = false;
          break;
        }
      }
    }
    return events;
  }

  function collideWithPlayer(events) {
    for (const wisp of wisps) {
      if (!wisp.active) continue;
      const reach = BOAT.radius + wisp.radius - 4;
      if (distanceSq(player.x, player.y, wisp.x, wisp.y) > reach * reach) continue;
      if (player.invulnerable > 0) continue;
      events |= hurtPlayer(wisp.hullDamage, wisp.lightDamage, wisp.x, wisp.y);
      wisp.x += (wisp.x - player.x) * 0.4;
      wisp.y += (wisp.y - player.y) * 0.4;
      if (player.hull <= 0 || player.light <= 0) {
        state.waveState = 'lost';
        return events | EVENT_OVER;
      }
    }
    for (const bolt of bolts) {
      if (!bolt.active || !bolt.hostile) continue;
      const reach = BOAT.radius + bolt.radius;
      if (distanceSq(player.x, player.y, bolt.x, bolt.y) > reach * reach) continue;
      bolt.active = false;
      if (player.invulnerable > 0) continue;
      events |= hurtPlayer(8, 5, bolt.x, bolt.y);
      if (player.hull <= 0 || player.light <= 0) {
        state.waveState = 'lost';
        return events | EVENT_OVER;
      }
    }
    return events;
  }

  function collectOrbs(events) {
    for (const orb of orbs) {
      if (!orb.active) continue;
      const reach = BOAT.radius + ORB.radius + 6;
      if (distanceSq(player.x, player.y, orb.x, orb.y) > reach * reach) continue;
      orb.active = false;
      state.orbsCollected += 1;
      state.combo = Math.min(state.combo + 1, COMBO.max);
      state.comboTimer = COMBO.window;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const gained = ORB.value * state.combo * player.orbScoreMul;
      state.score += gained;
      player.light = Math.min(player.maxLight, player.light + ORB.light * player.orbLightMul);
      burst(orb.x, orb.y, '#ffc94d', 10, 180, 3);
      addFloater(orb.x, orb.y - 10, `+${gained}${state.combo > 1 ? ` x${state.combo}` : ''}`, '#ffc94d', 18);
      events |= EVENT_ORB;
    }
    return events;
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2 + 60;
    player.angle = -Math.PI / 2;
    player.hull = BOAT.maxHull;
    player.maxHull = BOAT.maxHull;
    player.light = BOAT.maxLight;
    player.maxLight = BOAT.maxLight;
    player.invulnerable = 0;
    player.fireCooldown = 0;
    player.pulseCooldown = 0;
    player.speedMul = 1;
    player.orbScoreMul = 1;
    player.orbLightMul = 1;
    player.pierce = 0;
    player.pulseRadiusMul = 1;
    player.pulseDamage = 0;
    player.fireRateMul = 1;
    player.lightDrainMul = 1;
    player.shieldCharges = 0;
    for (const upgrade of UPGRADES) upgradesTaken[upgrade.id] = 0;
    for (const pool of [orbs, wisps, bolts, particles, floaters]) {
      for (const item of pool) item.active = false;
    }
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.bestCombo = 0;
    state.kills = 0;
    state.orbsCollected = 0;
    state.time = 0;
    state.shake = 0;
    state.pulsesUsed = 0;
    state.boltsFired = 0;
    startWave(1);
    spawnOrb(true);
    spawnOrb(true);
    spawnOrb(true);
  }

  /**
   * One fixed step. `input` is {mx, my, fire, fireX, fireY, pulse}. With `harmless` set
   * (the title screen's backdrop) the sea drifts, orbs glow and wisps wander, but nothing
   * touches the boat and nothing scores.
   */
  function step(dt, input, harmless) {
    let events = 0;
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);
    updateParticles(dt);

    if (state.waveState === 'choice' || state.waveState === 'won' || state.waveState === 'lost') {
      updateOrbs(dt, true);
      return events;
    }

    if (harmless) {
      player.y = FIELD.height / 2 + 60 + Math.sin(state.time * 0.8) * 8;
      player.x = FIELD.width / 2 + Math.sin(state.time * 0.35) * 60;
      updateOrbs(dt, true);
      if (random() < dt * 0.5) spawnOrb(false);
      if (random() < dt * 0.35) {
        const at = edgeSpawn();
        spawnWisp(KIND_DRIFTER, at.x, at.y);
      }
      updateWisps(dt, true);
      return events;
    }

    // Steering, aim and the lantern's slow burn.
    const speed = BOAT.baseSpeed * player.speedMul;
    player.x = Math.min(FIELD.width - 30, Math.max(30, player.x + input.mx * speed * dt));
    player.y = Math.min(FIELD.height - 30, Math.max(84, player.y + input.my * speed * dt));
    player.angle = Math.atan2(input.fireY - player.y, input.fireX - player.x);
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    if (player.pulseCooldown > 0) player.pulseCooldown -= dt;
    player.light -= BOAT.lightDrain * player.lightDrainMul * dt;
    if (player.light <= 0) {
      player.light = 0;
      state.waveState = 'lost';
      burst(player.x, player.y, '#ffc94d', 30, 260, 4);
      return events | EVENT_OVER;
    }
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // Fire a light bolt toward the aim point.
    if (input.fire && player.fireCooldown <= 0) {
      const bolt = free(bolts);
      if (bolt !== null) {
        const dx = input.fireX - player.x;
        const dy = input.fireY - player.y;
        const length = Math.hypot(dx, dy) || 1;
        bolt.active = true;
        bolt.hostile = false;
        bolt.x = player.x + (dx / length) * 26;
        bolt.y = player.y + (dy / length) * 26;
        bolt.vx = (dx / length) * BOAT.boltSpeed;
        bolt.vy = (dy / length) * BOAT.boltSpeed;
        bolt.damage = BOAT.boltDamage;
        bolt.pierce = player.pierce;
        bolt.life = 1.6;
        bolt.radius = 6 + player.pierce * 2;
        player.fireCooldown = BOAT.fireCooldown * player.fireRateMul;
        state.boltsFired += 1;
        events |= EVENT_SHOOT;
      }
    }

    // The lantern pulse: a shockwave that shoves wisps away.
    if (input.pulse && player.pulseCooldown <= 0 && player.light > BOAT.pulseLightCost) {
      player.light -= BOAT.pulseLightCost;
      player.pulseCooldown = BOAT.pulseCooldown;
      state.pulsesUsed += 1;
      const radius = BOAT.pulseRadius * player.pulseRadiusMul;
      for (const wisp of wisps) {
        if (!wisp.active) continue;
        const dx = wisp.x - player.x;
        const dy = wisp.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > radius + wisp.radius) continue;
        const push = 340 * (1 - distance / (radius + wisp.radius));
        wisp.x += (dx / (distance || 1)) * push * 0.25;
        wisp.y += (dy / (distance || 1)) * push * 0.25;
        wisp.hp -= BOAT.pulseDamage + player.pulseDamage;
        wisp.flash = 0.15;
        if (wisp.hp <= 0) events = killWisp(wisp, events);
      }
      burst(player.x, player.y, '#ffd97a', 26, 380, 4);
      state.shake = Math.max(state.shake, 6);
      events |= EVENT_PULSE;
    }

    // Send the wave's wisps in from the edges.
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        const kind = state.spawnQueue.shift();
        const at = edgeSpawn();
        spawnWisp(kind, at.x, at.y);
        state.spawnTimer = WAVES[state.wave - 1].spawnGap * (0.85 + random() * 0.3);
      }
    }

    updateOrbs(dt, false);
    updateWisps(dt, false);
    updateBolts(dt);
    events = collideBoltsWithWisps(events);
    events = collectOrbs(events);
    events = collideWithPlayer(events);
    if (events & EVENT_OVER) return events;

    // The wave is done when nothing is left to arrive and nothing is left to fight.
    if (state.spawnQueue.length === 0 && !wisps.some((wisp) => wisp.active)) {
      if (state.wave >= TOTAL_WAVES) {
        state.waveState = 'won';
        burst(player.x, player.y, '#ffc94d', 60, 420, 5);
        return events | EVENT_WIN;
      }
      offerChoices();
      return events | EVENT_WAVE_CLEAR;
    }
    return events;
  }

  reset();
  return { state, reset, step, applyUpgrade, upgradesTaken };
}
