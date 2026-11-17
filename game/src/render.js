// Every pixel of TIDECALLER, drawn in code: the night sea, the moon, the lantern-boat,
// the shadow wisps, the HUD and every menu. The renderer only reads state; it never
// changes a rule. Screens are named constants so main.js and shots.js can ask for them.

import { BOAT, FIELD, FONT, ORB, PALETTE } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CHOICE = 'choice';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const START_BUTTON = { x: 490, y: 520, width: 300, height: 64 };
const RESTART_BUTTON = { x: 490, y: 540, width: 300, height: 64 };
const CHOICE_CARDS = [
  { x: 170, y: 300, width: 280, height: 210 },
  { x: 500, y: 300, width: 280, height: 210 },
  { x: 830, y: 300, width: 280, height: 210 },
];

/** Which menu action, if any, a click at field coordinates (x, y) presses on this screen. */
export function buttonForPoint(x, y, screen) {
  function inside(rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }
  if (screen === SCREEN_TITLE && inside(START_BUTTON)) return 'start';
  if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && inside(RESTART_BUTTON)) return 'restart';
  if (screen === SCREEN_CHOICE) {
    for (let index = 0; index < CHOICE_CARDS.length; index += 1) {
      if (inside(CHOICE_CARDS[index])) return `choice:${index}`;
    }
  }
  return null;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  // The night sky never changes: one fixed starfield, drawn every frame behind the sea.
  const skyRandom = createRandom(20261118);
  const stars = [];
  for (let index = 0; index < 130; index += 1) {
    stars.push({
      x: skyRandom() * FIELD.width,
      y: skyRandom() * 300,
      radius: 0.6 + skyRandom() * 1.6,
      twinkle: skyRandom() * Math.PI * 2,
      speed: 0.5 + skyRandom() * 1.5,
    });
  }
  // Slow wave crests that slide across the sea, each with its own depth and speed.
  const crests = [];
  for (let index = 0; index < 9; index += 1) {
    crests.push({ y: 120 + index * 68, speed: 12 + index * 4, phase: skyRandom() * Math.PI * 2, alpha: 0.05 + index * 0.008 });
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function drawSea(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.seaTop);
    gradient.addColorStop(0.55, '#062033');
    gradient.addColorStop(1, PALETTE.seaDeep);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const star of stars) {
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(time * star.speed + star.twinkle));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The moon and its road of light on the water.
    const moonX = 1060;
    const moonY = 92;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 150);
    moonGlow.addColorStop(0, 'rgba(244,232,193,0.55)');
    moonGlow.addColorStop(1, 'rgba(244,232,193,0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(moonX - 150, moonY - 150, 300, 300);
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(190,175,140,0.5)';
    ctx.beginPath();
    ctx.arc(moonX - 14, moonY - 8, 9, 0, Math.PI * 2);
    ctx.arc(moonX + 12, moonY + 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(244,232,193,0.10)';
    for (let index = 0; index < 7; index += 1) {
      const width = 120 - index * 12;
      ctx.fillRect(moonX - width / 2, moonY + 60 + index * 26, width, 7);
    }

    // Parallax crests sliding past.
    ctx.strokeStyle = '#9fd8e8';
    ctx.lineWidth = 2;
    for (const crest of crests) {
      ctx.globalAlpha = crest.alpha;
      ctx.beginPath();
      for (let x = 0; x <= FIELD.width; x += 16) {
        const y = crest.y + Math.sin(x * 0.008 + time * 0.7 + crest.phase) * 7 + Math.sin(x * 0.021 - time * 0.4) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawLanternGlow(x, y, radius, alpha) {
    const glow = ctx.createRadialGradient(x, y, 4, x, y, radius);
    glow.addColorStop(0, `rgba(255,217,122,${alpha})`);
    glow.addColorStop(0.4, `rgba(255,180,60,${alpha * 0.35})`);
    glow.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawOrb(orb, time) {
    const pulse = 1 + Math.sin(time * 3 + orb.phase) * 0.15;
    const radius = ORB.radius * pulse;
    const fade = Math.min(1, orb.life / 2);
    ctx.globalAlpha = fade;
    const glow = ctx.createRadialGradient(orb.x, orb.y, 2, orb.x, orb.y, radius * 3);
    glow.addColorStop(0, 'rgba(255,201,77,0.7)');
    glow.addColorStop(1, 'rgba(255,201,77,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(orb.x - radius * 3, orb.y - radius * 3, radius * 6, radius * 6);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(orb.x - radius * 0.3, orb.y - radius * 0.3, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawWisp(wisp, time) {
    const wobble = Math.sin(time * 5 + wisp.wobble) * 0.08;
    const radius = wisp.radius * (1 + wobble);
    const glow = ctx.createRadialGradient(wisp.x, wisp.y, 4, wisp.x, wisp.y, radius * 2.4);
    glow.addColorStop(0, 'rgba(139,124,246,0.45)');
    glow.addColorStop(1, 'rgba(139,124,246,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(wisp.x - radius * 2.4, wisp.y - radius * 2.4, radius * 4.8, radius * 4.8);
    // A ragged shadow body, darker at the rim.
    ctx.fillStyle = wisp.flash > 0 ? '#e8e2ff' : '#241a4d';
    ctx.beginPath();
    for (let index = 0; index <= 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const edge = radius * (1 + Math.sin(angle * 3 + time * 4 + wisp.wobble) * 0.14);
      const px = wisp.x + Math.cos(angle) * edge;
      const py = wisp.y + Math.sin(angle) * edge;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = wisp.colour;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Two burning eyes that track the boat.
    const eyeGap = radius * 0.42;
    const eyeY = wisp.y - radius * 0.12;
    for (const side of [-1, 1]) {
      ctx.fillStyle = wisp.kind === 'warden' ? '#ff5d73' : '#ffdf8a';
      ctx.beginPath();
      ctx.arc(wisp.x + side * eyeGap, eyeY, wisp.kind === 'warden' ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (wisp.kind === 'warden') {
      // The Warden wears a crown of shadow spikes and a health ring.
      ctx.strokeStyle = '#e14b7a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let index = 0; index < 7; index += 1) {
        const angle = -Math.PI / 2 + (index - 3) * 0.34;
        const tip = radius + 16;
        ctx.moveTo(wisp.x + Math.cos(angle) * radius * 0.8, wisp.y + Math.sin(angle) * radius * 0.8);
        ctx.lineTo(wisp.x + Math.cos(angle) * tip, wisp.y + Math.sin(angle) * tip);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,93,115,0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, radius + 12, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * wisp.hp) / 42);
      ctx.stroke();
    }
  }

  function drawBoat(player, time, screen) {
    const bob = Math.sin(time * 2.2) * 3;
    const x = player.x;
    const y = player.y + bob;
    const flicker = 1 + Math.sin(time * 11) * 0.08 + Math.sin(time * 23) * 0.05;
    const lightLevel = player.light / player.maxLight;
    const glowRadius = 90 + lightLevel * 130;
    const blink = player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;

    drawLanternGlow(x, y - 18, glowRadius * flicker, 0.5 + lightLevel * 0.3);

    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    // Wake.
    ctx.strokeStyle = 'rgba(159,216,232,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 26, y + 12);
    ctx.quadraticCurveTo(x - 44, y + 18, x - 58, y + 14 + Math.sin(time * 3) * 3);
    ctx.moveTo(x + 26, y + 12);
    ctx.quadraticCurveTo(x + 44, y + 18, x + 58, y + 14 + Math.cos(time * 3) * 3);
    ctx.stroke();
    // Hull: a little wooden boat with a curved prow.
    ctx.fillStyle = PALETTE.hullDark;
    ctx.beginPath();
    ctx.moveTo(x - 30, y - 2);
    ctx.quadraticCurveTo(x - 34, y + 16, x - 12, y + 18);
    ctx.lineTo(x + 12, y + 18);
    ctx.quadraticCurveTo(x + 34, y + 16, x + 30, y - 2);
    ctx.quadraticCurveTo(x, y + 8, x - 30, y - 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.hull;
    ctx.beginPath();
    ctx.moveTo(x - 28, y - 2);
    ctx.quadraticCurveTo(x, y + 5, x + 28, y - 2);
    ctx.lineTo(x + 24, y + 8);
    ctx.lineTo(x - 24, y + 8);
    ctx.closePath();
    ctx.fill();
    // The lantern mast and its golden lamp.
    ctx.strokeStyle = '#8a6a3b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.lineTo(x, y - 44);
    ctx.stroke();
    ctx.fillStyle = '#3a2a12';
    ctx.beginPath();
    ctx.arc(x, y - 48, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lightLevel > 0.15 ? '#ffe9a8' : '#8a7a5a';
    ctx.beginPath();
    ctx.arc(x, y - 48, 7 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // A faint ring shows the pulse's reach while it recharges.
    if (player.pulseCooldown > 0) {
      const progress = 1 - player.pulseCooldown / BOAT.pulseCooldown;
      ctx.strokeStyle = `rgba(255,217,122,${0.25 + progress * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 170 * player.pulseRadiusMul * progress, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawBolts(state) {
    for (const bolt of state.bolts) {
      if (!bolt.active) continue;
      const tailX = bolt.x - bolt.vx * 0.03;
      const tailY = bolt.y - bolt.vy * 0.03;
      ctx.strokeStyle = bolt.hostile ? '#ff5d73' : '#ffe9a8';
      ctx.lineWidth = bolt.hostile ? 6 : 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
      ctx.fillStyle = bolt.hostile ? '#ff8fa0' : '#fff6d8';
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      if (!particle.active) continue;
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.colour;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const floater of state.floaters) {
      if (!floater.active) continue;
      ctx.globalAlpha = Math.max(0, floater.life / floater.maxLife);
      ctx.font = `bold ${floater.size}px ${FONT}`;
      ctx.fillStyle = floater.colour;
      ctx.fillText(floater.text, floater.x, floater.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawBar(x, y, width, height, fraction, colour, label) {
    ctx.fillStyle = 'rgba(3,16,28,0.75)';
    roundRect(x, y, width, height, height / 2);
    ctx.fill();
    ctx.fillStyle = colour;
    if (fraction > 0) {
      roundRect(x + 2, y + 2, Math.max(height - 4, (width - 4) * Math.min(1, fraction)), height - 4, (height - 4) / 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(242,234,216,0.5)';
    ctx.lineWidth = 1.5;
    roundRect(x, y, width, height, height / 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 10, y + height / 2 + 5);
  }

  function drawHud(state, best) {
    const player = state.player;
    ctx.fillStyle = 'rgba(3,16,28,0.55)';
    ctx.fillRect(0, 0, FIELD.width, 64);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(`SCORE ${state.score}`, 24, 42);
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 24, 62);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText(`WAVE ${Math.min(state.wave, 10)} / 10`, FIELD.width / 2, 40);
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    const remaining = state.spawnQueue.length + state.wisps.filter((wisp) => wisp.active).length;
    ctx.fillText(state.waveState === 'fight' ? `${remaining} shadows left` : 'Wave clear!', FIELD.width / 2, 60);
    drawBar(880, 14, 180, 20, player.hull / player.maxHull, PALETTE.barHull, `HULL ${Math.ceil(player.hull)}`);
    drawBar(880, 38, 180, 20, player.light / player.maxLight, PALETTE.barLight, `LIGHT ${Math.ceil(player.light)}`);
    if (state.combo > 1) {
      // Under the score, clear of the centred wave text and the bars.
      ctx.fillStyle = PALETTE.combo;
      ctx.font = `bold 26px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(`COMBO x${state.combo}`, 24, 100);
    }
  }

  function drawButton(rect, label, sublabel) {
    ctx.fillStyle = '#0a2a3d';
    roundRect(rect.x, rect.y, rect.width, rect.height, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    roundRect(rect.x, rect.y, rect.width, rect.height, 12);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + (sublabel ? 30 : 40));
    if (sublabel) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `17px ${FONT}`;
      ctx.fillText(sublabel, rect.x + rect.width / 2, rect.y + 52);
    }
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(3,16,28,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawLanternGlow(FIELD.width / 2, 190, 260, 0.35);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 96px ${FONT}`;
    ctx.fillText('TIDECALLER', FIELD.width / 2, 200);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillText('Keep the Lantern Lit', FIELD.width / 2, 252);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `21px ${FONT}`;
    ctx.fillText('Ten waves of shadow wisps hunt your light. Gather lumen orbs,', FIELD.width / 2, 300);
    ctx.fillText('blast the dark back, and do not let the Great Lantern go out.', FIELD.width / 2, 328);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('WASD / ARROWS — steer      MOUSE — aim & click to fire a light bolt', FIELD.width / 2, 392);
    ctx.fillText('SPACE — lantern pulse      P — pause      R — restart', FIELD.width / 2, 422);
    if (best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 24px ${FONT}`;
      ctx.fillText(`BEST SCORE ${best}`, FIELD.width / 2, 472);
    }
    drawButton(START_BUTTON, 'SET SAIL', 'click or press Space');
  }

  function drawChoice(state) {
    ctx.fillStyle = 'rgba(3,16,28,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 52px ${FONT}`;
    ctx.fillText(`WAVE ${state.wave} CLEAR!`, FIELD.width / 2, 150);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText('Choose a blessing of the tide:', FIELD.width / 2, 210);
    ctx.font = `19px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('Click a card, or press 1, 2 or 3.', FIELD.width / 2, 244);
    state.choices.forEach((choice, index) => {
      const rect = CHOICE_CARDS[index];
      ctx.fillStyle = '#0d3348';
      roundRect(rect.x, rect.y, rect.width, rect.height, 14);
      ctx.fill();
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2.5;
      roundRect(rect.x, rect.y, rect.width, rect.height, 14);
      ctx.stroke();
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText(`PRESS ${index + 1}`, rect.x + rect.width / 2, rect.y + 34);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 30px ${FONT}`;
      ctx.fillText(choice.name, rect.x + rect.width / 2, rect.y + 84);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `20px ${FONT}`;
      const words = choice.desc.split(' ');
      let line = '';
      let lineY = rect.y + 122;
      for (const word of words) {
        if ((line + word).length > 22) {
          ctx.fillText(line.trim(), rect.x + rect.width / 2, lineY);
          line = '';
          lineY += 26;
        }
        line += `${word} `;
      }
      ctx.fillText(line.trim(), rect.x + rect.width / 2, lineY);
    });
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(3,16,28,0.7)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillText('BECALMED', FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `24px ${FONT}`;
    ctx.fillText('Paused — press P or Space to keep sailing', FIELD.width / 2, 380);
  }

  function drawEnd(state, best, won) {
    ctx.fillStyle = 'rgba(3,16,28,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (won) drawLanternGlow(FIELD.width / 2, 220, 320, 0.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? PALETTE.gold : PALETTE.danger;
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillText(won ? 'THE DAWN BREAKS' : 'THE LIGHT HAS GONE OUT', FIELD.width / 2, 220);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `26px ${FONT}`;
    ctx.fillText(
      won
        ? 'Ten waves weathered — the Great Lantern burns on, and the sea is yours.'
        : 'The shadows close in and the lantern dies. The tide will call again.',
      FIELD.width / 2,
      272,
    );
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`SCORE ${state.score}`, FIELD.width / 2, 350);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `24px ${FONT}`;
    ctx.fillText(`Best ${Math.max(best, state.score)}    •    Waves cleared ${won ? 10 : state.wave - 1}    •    Wisps sunk ${state.kills}`, FIELD.width / 2, 398);
    ctx.fillText(`Orbs gathered ${state.orbsCollected}    •    Best combo x${state.bestCombo}`, FIELD.width / 2, 432);
    drawButton(RESTART_BUTTON, won ? 'SAIL AGAIN' : 'TRY AGAIN', 'click or press R');
  }

  function draw(state, screen, best) {
    const time = state.time;
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawSea(time);
    for (const orb of state.orbs) {
      if (orb.active) drawOrb(orb, time);
    }
    for (const wisp of state.wisps) {
      if (wisp.active) drawWisp(wisp, time);
    }
    drawBolts(state);
    drawBoat(state.player, time, screen);
    drawParticles(state);
    ctx.restore();

    if (screen === SCREEN_PLAY || screen === SCREEN_CHOICE || screen === SCREEN_PAUSED) {
      drawHud(state, best);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_CHOICE) drawChoice(state);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawEnd(state, best, false);
    else if (screen === SCREEN_WIN) drawEnd(state, best, true);
  }

  return { draw };
}
