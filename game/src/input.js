// Keyboard and mouse input for TIDECALLER. Held keys steer the boat in two dimensions;
// one-shot presses (start, pause, restart, pulse, upgrade picks) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost or counted twice.
// Mouse position aims the light bolt; a click fires it (or presses a menu button).

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_PULSE = 8;
export const ACTION_CHOICE_1 = 16;
export const ACTION_CHOICE_2 = 32;
export const ACTION_CHOICE_3 = 64;
export const ACTION_MUTE = 128;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const PULSE = new Set(['ShiftLeft', 'ShiftRight']);
const MUTE = new Set(['KeyM']);
const CHOICES = new Map([['Digit1', ACTION_CHOICE_1], ['Digit2', ACTION_CHOICE_2], ['Digit3', ACTION_CHOICE_3]]);

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false };
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let clickX = -1;
  let clickY = -1;

  function steer(code, pressed) {
    if (UP.has(code)) held.up = pressed;
    else if (DOWN.has(code)) held.down = pressed;
    else if (LEFT.has(code)) held.left = pressed;
    else if (RIGHT.has(code)) held.right = pressed;
    else return false;
    return true;
  }

  window.addEventListener('keydown', (event) => {
    if (steer(event.code, true)) {
      event.preventDefault();
      return;
    }
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (PULSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PULSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (CHOICES.has(event.code)) {
      if (!event.repeat) actions |= CHOICES.get(event.code);
    }
  });
  window.addEventListener('keyup', (event) => {
    steer(event.code, false);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.up = false;
    held.down = false;
    held.left = false;
    held.right = false;
    mouseDown = false;
  });

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const point = canvasPoint(event);
    mouseX = point.x;
    mouseY = point.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    mouseX = point.x;
    mouseY = point.y;
    mouseDown = true;
    clickX = point.x;
    clickY = point.y;
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Steering as {x, y}, each -1, 0 or 1, normalised so diagonals are not faster. */
    steerVector() {
      const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (x !== 0 && y !== 0) {
        const scale = Math.SQRT1_2;
        return { x: x * scale, y: y * scale };
      }
      return { x, y };
    },
    /** Where the mouse aims, in field coordinates. */
    aim() {
      return { x: mouseX, y: mouseY };
    },
    /** True while the mouse button is held: hold to keep firing bolts. */
    firing() {
      return mouseDown;
    },
    /** The last click point since the previous take, or null. */
    takeClick() {
      if (clickX < 0) return null;
      const point = { x: clickX, y: clickY };
      clickX = -1;
      clickY = -1;
      return point;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
