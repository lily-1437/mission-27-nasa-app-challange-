/**
 * @file audio.js
 * Procedural Web Audio API sound engine for MISSION27.
 * Generates all SFX and ambient tones dynamically without external audio assets.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.ambientNode = null;
    this.isMuted = false;
    this.hasUserGesture = false;
    this.onCue = null; // Accessibility caption hook: (text, type) => void

    this.setupGestureUnlock();
  }

  setupGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.hasUserGesture = true;
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('click', unlock, true);
    };

    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('click', unlock, true);
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();

    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.ambientGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    this.sfxGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.hasUserGesture) return false;
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  setMute(mute) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  fireCue(text, type = 'info') {
    if (typeof this.onCue === 'function') {
      this.onCue(text, type);
    }
  }

  playClick() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    g.gain.setValueAtTime(0.3, t);
    g.gain.linearRampToValueAtTime(0, t + 0.04);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  playAlarm() {
    this.fireCue('[ALARM] Master Caution Klaxon Pulsing', 'alert');
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      const startT = t + i * 0.25;
      osc.frequency.setValueAtTime(880, startT);
      osc.frequency.setValueAtTime(659, startT + 0.12);
      g.gain.setValueAtTime(0.3, startT);
      g.gain.linearRampToValueAtTime(0, startT + 0.22);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(startT);
      osc.stop(startT + 0.22);
    }
  }

  playHiss(duration = 1.0) {
    this.fireCue('[HISS] Pressurized Gas Venting', 'alert');
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(2.5, t);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    noise.start(t);
  }

  playScan() {
    this.fireCue('[SCAN] Spectrometer Sampling Frequency', 'info');
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.3);
    g.gain.setValueAtTime(0.2, t);
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playSuccess() {
    this.fireCue('[CHIME] System Diagnostic Pass', 'info');
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      g.gain.setValueAtTime(0.2, t + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.25);
    });
  }

  playFootstep() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);
    g.gain.setValueAtTime(0.18, t);
    g.gain.linearRampToValueAtTime(0, t + 0.08);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  startAmbientHum() {
    if (!this.ensureContext() || this.ambientNode) return;
    
    // Soft, deep cinematic ambient space drone
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(48, this.ctx.currentTime); // Deep sub-bass drone
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(72, this.ctx.currentTime); // Warm harmonic
    
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(108, this.ctx.currentTime); // Gentle space shimmer

    // Low-pass filter for cozy muffled space void feel
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, this.ctx.currentTime);
    
    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(g);
    g.connect(this.ambientGain);

    osc1.start();
    osc2.start();
    osc3.start();
    this.ambientNode = { osc1, osc2, osc3, filter, g };
  }

  stopAmbientHum() {
    if (this.ambientNode) {
      try {
        this.ambientNode.osc1.stop();
        this.ambientNode.osc2.stop();
        this.ambientNode.osc3.stop();
      } catch (e) {}
      this.ambientNode = null;
    }
  }

  playBlip() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.035);
    g.gain.setValueAtTime(0.08, t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.035);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  playWhoosh() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(950, t + 0.22);
    filter.frequency.exponentialRampToValueAtTime(240, t + 0.45);
    filter.Q.setValueAtTime(2.0, t);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    noise.start(t);
  }
}

export const audio = new AudioManager();
