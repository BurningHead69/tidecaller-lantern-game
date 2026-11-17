// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is there.
// The game moves between six screens: title, play, upgrade choice, paused, game over and
// victory. Mouse clicks fire bolts in play and press the menu buttons elsewhere.
//
// ?seed=N fixes the sea's pattern. ?shot=start|play|wave|end|victory (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady for
// a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_ORB, EVENT_OVER, EVENT_PULSE, EVENT_SHIELD, EVENT_WARDEN, EVENT_WAVE_CLEAR, EVENT_WIN, EVENT_WISP_DIE } from './world.js';
import { ACTION_CHOICE_1, ACTION_CHOICE_2, ACTION_CHOICE_3, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_PULSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { buttonForPoint, createRenderer, SCREEN_CHOICE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const audio = createAudio();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // A pulse press is queued here by handleActions and spent by the next world step, so a
  // press between two frames is never lost and never fires twice.
  let pulseQueued = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.click();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Keep the lantern lit through ten waves.');
  }

  function finishRun(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.win();
    else audio.lose();
    announce(won ? `Victory! Score ${world.state.score}. Best ${best}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function pickUpgrade(index) {
    const choice = world.state.choices[index];
    if (!choice) return;
    audio.upgradePick();
    world.applyUpgrade(choice.id);
    screen = SCREEN_PLAY;
    announce(`Wave ${world.state.wave}. Blessing: ${choice.name}.`);
  }

  function handleClick(point) {
    if (point === null) return;
    const pressed = buttonForPoint(point.x, point.y, screen);
    if (pressed === 'start' && screen === SCREEN_TITLE) startGame();
    else if (pressed === 'restart' && (screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    else if (pressed !== null && pressed.startsWith('choice:') && screen === SCREEN_CHOICE) {
      pickUpgrade(Number.parseInt(pressed.slice('choice:'.length), 10));
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const click = input.takeClick();
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (actions & ACTION_PULSE) pulseQueued = true;
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) {
      if (click === null || buttonForPoint(click.x, click.y, screen) === 'start') startGame();
      return;
    }
    if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && (actions & (ACTION_CONFIRM | ACTION_RESTART))) {
      if (click === null || buttonForPoint(click.x, click.y, screen) === 'restart') startGame();
      return;
    }
    if (screen === SCREEN_CHOICE) {
      if (actions & ACTION_CHOICE_1) pickUpgrade(0);
      else if (actions & ACTION_CHOICE_2) pickUpgrade(1);
      else if (actions & ACTION_CHOICE_3) pickUpgrade(2);
      else handleClick(click);
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_RESTART && screen === SCREEN_PLAY) {
      startGame();
    }
  }

  function stepInput() {
    const steer = input.steerVector();
    const aim = input.aim();
    const pulse = pulseQueued;
    pulseQueued = false;
    return {
      mx: steer.x,
      my: steer.y,
      fire: input.firing(),
      fireX: aim.x,
      fireY: aim.y,
      pulse,
    };
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { mx: 0, my: 0, fire: false, fireX: 0, fireY: 0, pulse: false }, true);
      return;
    }
    const events = world.step(STEP, stepInput(), false);
    if (events & EVENT_ORB) audio.pickup(world.state.combo);
    if (events & EVENT_WISP_DIE) audio.wispDie();
    if (events & EVENT_WARDEN) audio.wardenDie();
    if (events & EVENT_PULSE) audio.pulse();
    if (events & EVENT_SHIELD) audio.shieldBlock();
    if (events & EVENT_HIT) {
      audio.hit();
      announce(`Hit! Hull ${Math.max(0, Math.ceil(world.state.player.hull))}.`);
    }
    if (events & EVENT_WAVE_CLEAR) {
      audio.waveClear();
      screen = SCREEN_CHOICE;
      announce(`Wave ${world.state.wave} clear. Choose a blessing.`);
    }
    if (events & EVENT_WIN) finishRun(true);
    else if (events & EVENT_OVER) finishRun(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    audio.update(STEP);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting wisps hunt unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Tidecaller. Press Space or click to set sail.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
