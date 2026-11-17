// A small deterministic random source (mulberry32): the same seed always deals the same
// sea, so a screenshot URL with ?seed=N replays the same game every time.

export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one entry of `list` with the given random source. */
export function pickRandom(random, list) {
  if (list.length === 0) return undefined;
  return list[Math.floor(random() * list.length)];
}

/** A float uniformly in [min, max) from the given random source. */
export function rangeRandom(random, min, max) {
  return min + random() * (max - min);
}

/** Shuffle a copy of `list` with the given random source (Fisher-Yates). */
export function shuffleRandom(random, list) {
  const out = list.slice();
  for (let index = out.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = out[index];
    out[index] = out[other];
    out[other] = held;
  }
  return out;
}
