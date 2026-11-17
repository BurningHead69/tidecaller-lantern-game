// All sound is synthesised with WebAudio: short oscillator envelopes for the effects and a
// slow two-voice pad for the night-sea ambience. No audio files, no network, and every call
// is guarded so a browser without audio (or a headless screenshot run) simply stays silent.

const NOTES = [110, 130.81, 164.81, 196, 220, 261.63];

export function createAudio() {
  let context = null;
  let master = null;
  let padTimer = 0;
  let padStep = 0;
  let muted = false;

  function ensureContext() {
    if (context !== null) return context;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  /** Call from a real user gesture: browsers only let sound start after one. */
  function unlock() {
    const ctx = ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, duration, type, volume, slideTo) {
    const ctx = ensureContext();
    if (ctx === null || master === null || muted) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, now);
      if (slideTo !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch {
      // A failed blip must never break the game.
    }
  }

  function noiseBurst(duration, volume, lowpass) {
    const ctx = ensureContext();
    if (ctx === null || master === null || muted) return;
    try {
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // Silence is fine; the game is not.
    }
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    /** A bright rising chime; the pitch climbs with the combo chain. */
    pickup(combo) {
      const step = Math.min(combo, 8);
      tone(520 * 2 ** (step / 12), 0.22, 'sine', 0.22);
      tone(780 * 2 ** (step / 12), 0.3, 'sine', 0.12);
    },
    shoot() {
      tone(880, 0.12, 'square', 0.08, 320);
    },
    pulse() {
      tone(180, 0.4, 'sine', 0.25, 60);
      noiseBurst(0.25, 0.12, 900);
    },
    wispDie() {
      tone(320, 0.25, 'triangle', 0.16, 70);
    },
    wardenDie() {
      tone(220, 0.7, 'sawtooth', 0.18, 40);
      noiseBurst(0.5, 0.2, 600);
    },
    hit() {
      tone(140, 0.3, 'sawtooth', 0.25, 55);
      noiseBurst(0.2, 0.22, 500);
    },
    shieldBlock() {
      tone(660, 0.18, 'sine', 0.2, 990);
    },
    waveClear() {
      tone(523.25, 0.25, 'sine', 0.2);
      tone(659.25, 0.25, 'sine', 0.2);
      tone(783.99, 0.4, 'sine', 0.2);
    },
    waveHorn() {
      tone(196, 0.5, 'triangle', 0.2, 196);
      tone(294, 0.5, 'triangle', 0.12, 294);
    },
    upgradePick() {
      tone(440, 0.15, 'sine', 0.2);
      tone(660, 0.15, 'sine', 0.2);
      tone(880, 0.3, 'sine', 0.2);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
        setTimeout(() => tone(freq, 0.5, 'sine', 0.22), index * 160);
      });
    },
    lose() {
      tone(330, 0.8, 'triangle', 0.2, 82);
      tone(220, 1.1, 'triangle', 0.16, 55);
    },
    click() {
      tone(700, 0.06, 'sine', 0.12);
    },
    /** Advance the ambient pad: a slow two-note swell every few seconds. */
    update(dt) {
      const ctx = ensureContext();
      if (ctx === null || muted) return;
      // A hidden tab gets no pad notes: the game is paused there anyway.
      if (typeof document !== 'undefined' && document.hidden) return;
      padTimer -= dt;
      if (padTimer > 0) return;
      padTimer = 3.2;
      const root = NOTES[padStep % NOTES.length];
      padStep += 1;
      tone(root, 3.0, 'sine', 0.045);
      tone(root * 1.5, 3.0, 'sine', 0.03);
    },
  };
}
