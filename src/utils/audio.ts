let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    // Standard AudioContext initialization
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * Resumes audio context if it was suspended (browser security).
 */
export async function resumeAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('Failed to resume AudioContext:', e);
    }
  }
}

/**
 * Synthesizes a metallic chip clicking sound.
 */
export function playChipSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudio();

  const now = ctx.currentTime;
  
  // Chip click is a combination of two high-frequency decaying tones
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1500, now);
  osc1.frequency.exponentialRampToValueAtTime(800, now + 0.08);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(3200, now);
  osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

  gainNode.gain.setValueAtTime(0.15, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.09);
  osc2.stop(now + 0.09);
}

/**
 * Synthesizes a soft card-flick paper sound using white noise and a lowpass filter.
 */
export function playCardSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudio();

  const now = ctx.currentTime;
  const duration = 0.15;

  // Create a buffer of white noise
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + duration);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.1, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noiseNode.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noiseNode.start(now);
  noiseNode.stop(now + duration);
}

/**
 * Plays a rising major chord arpeggio for a round win.
 */
export function playWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudio();

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  
  notes.forEach((freq, index) => {
    const time = now + index * 0.12;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    
    gainNode.gain.setValueAtTime(0.1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.35);
  });
}

/**
 * Plays a sparkly high arpeggio for a Blackjack win.
 */
export function playBlackjackSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudio();

  const now = ctx.currentTime;
  const notes = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // E4, G4, C5, E5, G5, C6
  
  notes.forEach((freq, index) => {
    const time = now + index * 0.08;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    
    gainNode.gain.setValueAtTime(0.12, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.45);
  });
}

/**
 * Plays a sad descending slide for a loss/bust.
 */
export function playLoseSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudio();

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now); // A3
  osc.frequency.linearRampToValueAtTime(110, now + 0.6); // A2

  // Lowpass filter to make the sawtooth less harsh and more "bass-y"
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, now);

  gainNode.gain.setValueAtTime(0.12, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.6);
}

/**
 * Plays a double beep for a push/draw round.
 */
export function playPushSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudio();

  const now = ctx.currentTime;
  
  [0, 0.15].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now + delay); // E4
    
    gainNode.gain.setValueAtTime(0.1, now + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now + delay);
    osc.stop(now + delay + 0.12);
  });
}

/**
 * Plays a clean interface click sound.
 */
export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudio();

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, now);

  gainNode.gain.setValueAtTime(0.05, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}
