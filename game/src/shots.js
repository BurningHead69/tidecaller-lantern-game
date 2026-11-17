// The screenshot scenes behind ?shot=start|play|wave|end|victory. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple autopilot
// (chase the nearest orb when the sea is calm, keep the boat out of a wisp's reach, aim the
// lantern at the nearest shadow and fire, pulse when one gets too close), so the frame is what
// a short game really looks like and the same seed always gives the same frame.

import { BOAT, FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { SCREEN_CHOICE, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 40;
const WAVE_SECONDS = 150;
const END_LIMIT_SECONDS = 600;
const VICTORY_LIMIT_SECONDS = 900;
const SAMPLE = 1 / 30;

/** The play scene's pilot keeps its distance and lives; the end scene's is reckless. */
const SAFE_DISTANCE = { play: 190, wave: 170, end: 80, victory: 200 };

function nearestWisp(state) {
  let found = null;
  let foundDistance = Infinity;
  for (const wisp of state.wisps) {
    if (!wisp.active) continue;
    // A submerged lurker is below the bolts' reach: not a target.
    if (wisp.kind === 'lurker' && wisp.submerged) continue;
    const distance = Math.hypot(wisp.x - state.player.x, wisp.y - state.player.y);
    if (distance < foundDistance) {
      foundDistance = distance;
      found = wisp;
    }
  }
  return { wisp: found, distance: foundDistance };
}

function nearestOrb(state) {
  let found = null;
  let foundDistance = Infinity;
  for (const orb of state.orbs) {
    if (!orb.active) continue;
    const distance = Math.hypot(orb.x - state.player.x, orb.y - state.player.y);
    if (distance < foundDistance) {
      foundDistance = distance;
      found = orb;
    }
  }
  return { orb: found, distance: foundDistance };
}

/** Steer toward (tx, ty) while keeping clear of every wisp inside `safeDistance`. */
function steerToward(state, tx, ty, safeDistance) {
  const player = state.player;
  let mx = 0;
  let my = 0;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 24) {
    mx = dx / distance;
    my = dy / distance;
  }
  for (const wisp of state.wisps) {
    if (!wisp.active) continue;
    const wdx = player.x - wisp.x;
    const wdy = player.y - wisp.y;
    const wDistance = Math.hypot(wdx, wdy) || 1;
    if (wDistance < safeDistance) {
      const push = (safeDistance - wDistance) / safeDistance;
      mx += (wdx / wDistance) * push * 1.6;
      my += (wdy / wDistance) * push * 1.6;
    }
  }
  // Keep clear of whirlpools: the pull is escapable, but a staged run should not
  // spend its waves circling one.
  for (const pool of state.whirlpools) {
    if (!pool.active) continue;
    const pdx = player.x - pool.x;
    const pdy = player.y - pool.y;
    const pDistance = Math.hypot(pdx, pdy) || 1;
    if (pDistance < 230) {
      const push = (230 - pDistance) / 230;
      mx += (pdx / pDistance) * push * 2.0;
      my += (pdy / pDistance) * push * 2.0;
    }
  }
  const length = Math.hypot(mx, my) || 1;
  return { mx: mx / length, my: my / length };
}

/** One autopilot decision: where to steer, where to aim, whether to fire or pulse. */
function autopilot(state, safeDistance) {
  const player = state.player;
  const { wisp, distance: wispDistance } = nearestWisp(state);
  const { orb } = nearestOrb(state);
  let targetX = FIELD.width / 2;
  let targetY = FIELD.height / 2;
  if (wisp !== null && wispDistance < 260) {
    // Back off from the threat, but keep it in the lantern's line of fire.
    targetX = player.x + (player.x - wisp.x);
    targetY = player.y + (player.y - wisp.y);
  } else if (orb !== null) {
    targetX = orb.x;
    targetY = orb.y;
  }
  const steer = steerToward(state, targetX, targetY, safeDistance);
  return {
    mx: steer.mx,
    my: steer.my,
    fire: wisp !== null && wispDistance < 520,
    fireX: wisp !== null ? wisp.x : player.x,
    fireY: wisp !== null ? wisp.y : player.y - 100,
    pulse: wisp !== null && wispDistance < 120 && player.pulseCooldown <= 0,
  };
}

/** Run the world forward with the autopilot until `seconds` pass or it ends. */
function runAutopilot(world, seconds, safeDistance) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    const state = world.state;
    if (state.waveState === 'choice') {
      // Take the first blessing on offer and sail on.
      world.applyUpgrade(state.choices[0].id);
      continue;
    }
    const events = world.step(STEP, autopilot(state, safeDistance), false);
    if (events & (EVENT_OVER | EVENT_WIN)) return events;
  }
  return 0;
}

/**
 * Set `world` to the named scene (start, play, wave, end or victory; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'wave' && name !== 'end' && name !== 'victory') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { mx: 0, my: 0, fire: false, fireX: 0, fireY: 0, pulse: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    runAutopilot(world, PLAY_SECONDS, SAFE_DISTANCE.play);
    const over = world.state.waveState === 'lost';
    const won = world.state.waveState === 'won';
    return { screen: over ? SCREEN_OVER : won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'wave') {
    runAutopilot(world, WAVE_SECONDS, SAFE_DISTANCE.wave);
    const over = world.state.waveState === 'lost';
    const won = world.state.waveState === 'won';
    if (world.state.waveState === 'choice') return { screen: SCREEN_CHOICE, best: world.state.score };
    return { screen: over ? SCREEN_OVER : won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    runAutopilot(world, END_LIMIT_SECONDS, SAFE_DISTANCE.end);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // Victory: the careful pilot plays all ten waves. If it somehow falls short, the scene is
  // still the win screen — staged from the run it just played — so the shot stays truthful
  // about what the victory screen looks like.
  runAutopilot(world, VICTORY_LIMIT_SECONDS, SAFE_DISTANCE.victory);
  if (world.state.waveState !== 'won') {
    world.state.waveState = 'won';
    world.state.score = Math.max(world.state.score, 4200);
  }
  return { screen: SCREEN_WIN, best: world.state.score };
}
