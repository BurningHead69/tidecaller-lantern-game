// TIDECALLER — every tuning number, colour and wave definition in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'tidecaller.best';

/** The lantern-boat the player steers. */
export const BOAT = {
  radius: 22,
  baseSpeed: 330,
  maxHull: 100,
  maxLight: 100,
  /** Lantern light lost per second, always, so orbs are never optional. */
  lightDrain: 2.0,
  /** Seconds of mercy after a hit before another can land. */
  invulnerable: 1.1,
  /** Seconds between light bolts. */
  fireCooldown: 0.38,
  boltSpeed: 760,
  boltDamage: 1,
  /** Seconds between lantern pulses. */
  pulseCooldown: 1.4,
  pulseRadius: 170,
  pulseLightCost: 5,
  pulseDamage: 1,
};

/** A drifting lumen orb: fuel for the lantern and the score. */
export const ORB = {
  radius: 11,
  value: 10,
  light: 8,
  /** Seconds an orb lives before it fades back into the sea. */
  lifetime: 14,
  spawnInterval: 1.15,
  maxOnField: 9,
};

/** Seconds a pickup keeps the combo chain alive; each pickup inside the window raises it. */
export const COMBO = { window: 3.5, max: 8 };

/** Shadow wisp kinds. `hp` is bolt hits to sink one; `score` is what sinking it pays. */
export const WISP = {
  drifter: { radius: 17, speed: 112, hp: 2, score: 25, hullDamage: 12, lightDamage: 6, colour: '#8b7cf6' },
  darter: { radius: 13, speed: 168, hp: 2, score: 40, hullDamage: 10, lightDamage: 5, colour: '#c65df0' },
  splitter: { radius: 22, speed: 82, hp: 3, score: 50, hullDamage: 14, lightDamage: 7, colour: '#6f5ae0' },
  mote: { radius: 10, speed: 188, hp: 1, score: 20, hullDamage: 7, lightDamage: 4, colour: '#a78bfa' },
  warden: { radius: 46, speed: 58, hp: 42, score: 500, hullDamage: 26, lightDamage: 14, colour: '#e14b7a' },
};

/** One wave: how many of each wisp it sends, how fast they arrive, and the orb flow. */
export const WAVES = [
  { drifters: 6, darters: 0, splitters: 0, wardens: 0, spawnGap: 1.5, wispSpeed: 1.0, orbGap: 1.1 },
  { drifters: 8, darters: 3, splitters: 0, wardens: 0, spawnGap: 1.3, wispSpeed: 1.05, orbGap: 1.1 },
  { drifters: 9, darters: 5, splitters: 2, wardens: 0, spawnGap: 1.15, wispSpeed: 1.1, orbGap: 1.0 },
  { drifters: 10, darters: 6, splitters: 3, wardens: 0, spawnGap: 1.0, wispSpeed: 1.15, orbGap: 1.0 },
  { drifters: 8, darters: 5, splitters: 3, wardens: 1, spawnGap: 0.95, wispSpeed: 1.2, orbGap: 0.95 },
  { drifters: 11, darters: 8, splitters: 4, wardens: 0, spawnGap: 0.9, wispSpeed: 1.25, orbGap: 0.95 },
  { drifters: 12, darters: 9, splitters: 5, wardens: 0, spawnGap: 0.85, wispSpeed: 1.3, orbGap: 0.9 },
  { drifters: 13, darters: 10, splitters: 6, wardens: 0, spawnGap: 0.8, wispSpeed: 1.35, orbGap: 0.9 },
  { drifters: 13, darters: 11, splitters: 7, wardens: 0, spawnGap: 0.75, wispSpeed: 1.4, orbGap: 0.85 },
  { drifters: 10, darters: 9, splitters: 6, wardens: 1, spawnGap: 0.7, wispSpeed: 1.45, orbGap: 0.85 },
];
export const TOTAL_WAVES = WAVES.length;

/** Between-wave upgrades: one of three is offered, and the pick shapes the rest of the run. */
export const UPGRADES = [
  { id: 'beam', name: 'Wide Beam', desc: 'Bolts fly wider and pierce +1 wisp.', max: 3 },
  { id: 'swift', name: 'Swift Current', desc: '+18% boat speed.', max: 3 },
  { id: 'shield', name: 'Lantern Shield', desc: 'Block one wisp hit each wave.', max: 2 },
  { id: 'rich', name: 'Rich Lumen', desc: 'Orbs pay double score and +50% light.', max: 2 },
  { id: 'pulse', name: 'Storm Pulse', desc: '+60% pulse radius and +1 damage.', max: 2 },
  { id: 'hull', name: 'Oak Hull', desc: 'Repair 40 hull and +20 max hull.', max: 3 },
  { id: 'flame', name: 'Bright Flame', desc: 'Lantern drains 30% slower, +20 max light.', max: 2 },
  { id: 'rapid', name: 'Rapid Lantern', desc: 'Bolts fire 25% faster.', max: 3 },
];

/** Particle and floating-text budgets, allocated once at boot. */
export const POOL = { orbs: 24, wisps: 48, bolts: 64, particles: 256, floaters: 32 };

export const PALETTE = {
  deep: '#04141f',
  seaTop: '#07293b',
  seaDeep: '#03101c',
  moon: '#f4e8c1',
  star: '#cfe4ff',
  gold: '#ffc94d',
  goldSoft: '#ffdf8a',
  lantern: '#ffd97a',
  hull: '#7a4a2b',
  hullDark: '#54301c',
  wisp: '#8b7cf6',
  danger: '#ff5d73',
  text: '#f2ead8',
  muted: '#9db8c4',
  panel: '#0a2a3d',
  panelEdge: '#2a5a74',
  barHull: '#ff7a5c',
  barLight: '#ffc94d',
  combo: '#ff9d3c',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
