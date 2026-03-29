// ─── useSounds.js ─────────────────────────────────────────────────────────────
// Shared Web Audio API sound hook for all auth pages
// No dependencies, no audio files needed

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!window._audioCtx) {
    window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window._audioCtx;
};

// ── Core tone player ──────────────────────────────────────────────────────────
const playTone = ({
  frequency = 440,
  type = 'sine',       // sine | square | sawtooth | triangle
  gain = 0.3,
  duration = 0.3,
  attack = 0.01,
  decay = 0.1,
  sustain = 0.6,
  release = 0.2,
  delay = 0,
  pitchEnd = null,     // if set, frequency glides to this value
}) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  setTimeout(() => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const masterGain = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (pitchEnd) {
      osc.frequency.exponentialRampToValueAtTime(pitchEnd, ctx.currentTime + duration);
    }

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + attack);
    gainNode.gain.linearRampToValueAtTime(gain * sustain, ctx.currentTime + attack + decay);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration + release);

    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + release + 0.05);
  }, delay);
};

// ── Noise burst (for shatter/impact effects) ──────────────────────────────────
const playNoise = ({ gain = 0.15, duration = 0.2, delay = 0 }) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  setTimeout(() => {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + duration);
  }, delay);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 LOGIN — Bouncing Ball Sounds
// ═══════════════════════════════════════════════════════════════════════════════
export const useLoginSounds = () => {

  // Called once when ball starts dropping
  const playDrop = () => {
    playTone({
      frequency: 280, pitchEnd: 180,
      type: 'sine', gain: 0.25,
      duration: 0.35, attack: 0.005,
      decay: 0.1, sustain: 0.4, release: 0.2,
    });
  };

  // Called on each bounce — pass bounce index (0-3) for decreasing pitch
  const playBounce = (index = 0) => {
    const pitches = [320, 290, 260, 240];
    const gains   = [0.3, 0.25, 0.2, 0.15];
    playTone({
      frequency: pitches[index] || 220,
      pitchEnd: (pitches[index] || 220) * 1.3,
      type: 'triangle', gain: gains[index] || 0.1,
      duration: 0.15, attack: 0.005,
      decay: 0.08, sustain: 0.3, release: 0.1,
    });
  };

  // Called when ball expands into background
  const playExpand = () => {
    // Deep whoosh down
    playTone({
      frequency: 220, pitchEnd: 60,
      type: 'sine', gain: 0.35,
      duration: 0.7, attack: 0.02,
      decay: 0.2, sustain: 0.5, release: 0.3,
    });
    // Airy high shimmer on top
    playTone({
      frequency: 900, pitchEnd: 600,
      type: 'sine', gain: 0.1,
      duration: 0.5, attack: 0.05,
      decay: 0.2, sustain: 0.3, release: 0.2,
      delay: 100,
    });
  };

  return { playDrop, playBounce, playExpand };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔵 REGISTER — Liquid Blob Sounds
// ═══════════════════════════════════════════════════════════════════════════════
export const useRegisterSounds = () => {

  // Blob floods the screen — liquid pour feel
  const playBlobFlood = () => {
    // Low rumble rise
    playTone({
      frequency: 80, pitchEnd: 140,
      type: 'sine', gain: 0.3,
      duration: 1.4, attack: 0.1,
      decay: 0.3, sustain: 0.7, release: 0.4,
    });
    // Mid liquid swoosh
    playTone({
      frequency: 300, pitchEnd: 180,
      type: 'sine', gain: 0.15,
      duration: 1.0, attack: 0.05,
      decay: 0.3, sustain: 0.5, release: 0.3,
      delay: 200,
    });
    // Bubble pop at the end
    playTone({
      frequency: 520, pitchEnd: 800,
      type: 'sine', gain: 0.2,
      duration: 0.12, attack: 0.005,
      decay: 0.05, sustain: 0.2, release: 0.08,
      delay: 1300,
    });
  };

  // Card appears
  const playCardIn = () => {
    playTone({
      frequency: 440, pitchEnd: 550,
      type: 'sine', gain: 0.18,
      duration: 0.25, attack: 0.01,
      decay: 0.1, sustain: 0.4, release: 0.15,
    });
  };

  return { playBlobFlood, playCardIn };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🟣 FORGOT PASSWORD — Ink Drop Sounds
// ═══════════════════════════════════════════════════════════════════════════════
export const useForgotSounds = () => {

  // Teardrop falling — high to low whistle
  const playDrop = () => {
    playTone({
      frequency: 800, pitchEnd: 200,
      type: 'sine', gain: 0.2,
      duration: 0.55, attack: 0.01,
      decay: 0.1, sustain: 0.5, release: 0.15,
    });
  };

  // Ink splat on impact
  const playSplat = () => {
    // Impact thud
    playTone({
      frequency: 120, pitchEnd: 60,
      type: 'triangle', gain: 0.4,
      duration: 0.2, attack: 0.005,
      decay: 0.08, sustain: 0.2, release: 0.12,
    });
    // Spray hiss
    playNoise({ gain: 0.12, duration: 0.25, delay: 20 });
  };

  // Ripple rings expanding
  const playRipple = (ringIndex = 0) => {
    const pitches = [280, 240, 200, 170, 145];
    playTone({
      frequency: pitches[ringIndex] || 140,
      type: 'sine', gain: 0.08 - ringIndex * 0.01,
      duration: 0.4, attack: 0.02,
      decay: 0.15, sustain: 0.3, release: 0.2,
      delay: ringIndex * 280,
    });
  };

  return { playDrop, playSplat, playRipple };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🟠 RESET PASSWORD — Lock Shatter Sounds
// ═══════════════════════════════════════════════════════════════════════════════
export const useResetSounds = () => {

  // Lock rattling/shaking
  const playRattle = () => {
    [0, 80, 160, 240, 320, 400].forEach((d) => {
      playNoise({ gain: 0.08, duration: 0.06, delay: d });
    });
  };

  // Shackle clicks open
  const playUnlock = () => {
    // Click
    playTone({
      frequency: 800, pitchEnd: 600,
      type: 'square', gain: 0.2,
      duration: 0.08, attack: 0.005,
      decay: 0.03, sustain: 0.3, release: 0.05,
    });
    // Satisfying clunk
    playTone({
      frequency: 180, pitchEnd: 100,
      type: 'triangle', gain: 0.3,
      duration: 0.25, attack: 0.005,
      decay: 0.1, sustain: 0.3, release: 0.15,
      delay: 60,
    });
    // Success shimmer
    playTone({
      frequency: 660, pitchEnd: 880,
      type: 'sine', gain: 0.15,
      duration: 0.3, attack: 0.02,
      decay: 0.1, sustain: 0.4, release: 0.2,
      delay: 180,
    });
  };

  // Lock shatters into particles
  const playShatter = () => {
    playNoise({ gain: 0.25, duration: 0.35, delay: 0 });
    playTone({
      frequency: 400, pitchEnd: 80,
      type: 'sawtooth', gain: 0.2,
      duration: 0.3, attack: 0.005,
      decay: 0.1, sustain: 0.2, release: 0.15,
      delay: 30,
    });
    // Debris tinkle
    [0, 60, 120, 200].forEach((d) => {
      playTone({
        frequency: 1200 - d * 2, pitchEnd: 600,
        type: 'sine', gain: 0.08,
        duration: 0.15, attack: 0.005,
        decay: 0.05, sustain: 0.2, release: 0.08,
        delay: d + 50,
      });
    });
  };

  // Background expands
  const playExpand = () => {
    playTone({
      frequency: 160, pitchEnd: 80,
      type: 'sine', gain: 0.3,
      duration: 0.7, attack: 0.02,
      decay: 0.2, sustain: 0.5, release: 0.3,
    });
  };

  return { playRattle, playUnlock, playShatter, playExpand };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🟢 VERIFY EMAIL — Envelope Sounds
// ═══════════════════════════════════════════════════════════════════════════════
export const useVerifySounds = () => {

  // Envelope swooshing through air
  const playSwoosh = () => {
    playTone({
      frequency: 600, pitchEnd: 250,
      type: 'sine', gain: 0.2,
      duration: 0.55, attack: 0.02,
      decay: 0.15, sustain: 0.4, release: 0.2,
    });
    playNoise({ gain: 0.06, duration: 0.4, delay: 50 });
  };

  // Envelope lands with a soft thud
  const playLand = () => {
    playTone({
      frequency: 140, pitchEnd: 80,
      type: 'triangle', gain: 0.3,
      duration: 0.2, attack: 0.005,
      decay: 0.08, sustain: 0.3, release: 0.12,
    });
    // Paper rustle
    playNoise({ gain: 0.07, duration: 0.15, delay: 40 });
  };

  // Flap opens — paper unfolding
  const playFlapOpen = () => {
    // Paper rustle
    playNoise({ gain: 0.09, duration: 0.5, delay: 0 });
    // Soft crinkle tones
    [0, 100, 220].forEach((d) => {
      playTone({
        frequency: 500 + d, pitchEnd: 400 + d,
        type: 'triangle', gain: 0.06,
        duration: 0.2, attack: 0.01,
        decay: 0.08, sustain: 0.3, release: 0.1,
        delay: d,
      });
    });
  };

  // Checkmark ding — success!
  const playSuccess = () => {
    // Two-note success ding
    playTone({
      frequency: 523, // C5
      type: 'sine', gain: 0.28,
      duration: 0.25, attack: 0.01,
      decay: 0.08, sustain: 0.5, release: 0.2,
    });
    playTone({
      frequency: 783, // G5
      type: 'sine', gain: 0.28,
      duration: 0.35, attack: 0.01,
      decay: 0.1, sustain: 0.5, release: 0.25,
      delay: 200,
    });
    // Sparkle shimmer
    playTone({
      frequency: 1046, // C6
      type: 'sine', gain: 0.15,
      duration: 0.4, attack: 0.02,
      decay: 0.1, sustain: 0.4, release: 0.3,
      delay: 380,
    });
  };

  // Sparks burst
  const playSparks = () => {
    [0, 40, 80, 120].forEach((d) => {
      playTone({
        frequency: 800 + d * 10, pitchEnd: 400,
        type: 'sine', gain: 0.07,
        duration: 0.15, attack: 0.005,
        decay: 0.05, sustain: 0.2, release: 0.08,
        delay: d,
      });
    });
  };

  return { playSwoosh, playLand, playFlapOpen, playSuccess, playSparks };
};