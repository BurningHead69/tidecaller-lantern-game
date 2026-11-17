# tidecaller-lantern-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/BurningHead69/tidecaller-lantern-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/BurningHead69/tidecaller-lantern-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

TIDECALLER — Keep the Lantern Lit: a 2D canvas arcade survival game, built for the make.fun bounty "Make the best game"
(best-game-01). No libraries, no network requests, no audio files: every pixel is drawn
in code and every sound is synthesised with WebAudio.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=49r466ra&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## The game

You steer a small lantern-boat on a night sea. The Great Lantern burns down a little
every second, and shadow wisps hunt its light. Gather drifting lumen orbs to feed the
lantern and score, blast wisps with light bolts, and survive all ten waves.

- **Win:** clear wave 10 and see the dawn break.
- **Lose:** your hull reaches 0, or the lantern light reaches 0.
- **Combo:** pick up orbs one after another to raise a score multiplier (up to x8).
- **Upgrades:** after every cleared wave, choose 1 of 3 blessings — a wider beam, a
  swifter boat, a lantern shield, richer lumen, a stronger pulse, a sturdier hull, a
  brighter flame, or a faster lantern. The picks shape the rest of the run.
- **Enemies:** drifting wisps, lunging darters, splitters that break into motes, and a
  Warden mini-boss on waves 5 and 10 that shoots shadow bolts.
- **Feel:** particles, screen shake, floating score text, a pulsing lantern glow,
  parallax stars, moon and wave crests, and synthesised sound effects plus a slow
  ambient pad.

## Controls

- **WASD / arrow keys** — steer the boat
- **Mouse** — aim; **click / hold** — fire a light bolt
- **Space** — lantern pulse (a shockwave that shoves wisps away; costs a little light)
- **P / Esc** — pause · **R** — restart · **1 / 2 / 3** — pick an upgrade · **M** — mute

## Screenshots

- `screenshots/1-start.jpg` — the title screen over a living sea
- `screenshots/2-play.jpg` — mid-wave play with the HUD, orbs and combo
- `screenshots/3-wave.jpg` — wave 8, bolts flying and the pulse ring up
- `screenshots/4-end.jpg` — the game-over screen with run stats and restart

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

`?seed=N` fixes the sea's pattern for a reproducible game; `?shot=start|play|wave|end|victory`
stages a screenshot scene instead of running the loop.

## Files

- `game/index.html` — the page, one canvas and the module entry point
- `game/src/config.js` — tuning, waves, upgrades, palette
- `game/src/random.js` — the seeded RNG
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — WebAudio-synthesised sound
- `game/src/world.js` — rules, entities, waves, upgrades
- `game/src/render.js` — all drawing, HUD and menus
- `game/src/shots.js` — deterministic screenshot staging and autopilot
- `game/src/main.js` — boot and the game loop

## License

MIT — see `LICENSE`.
