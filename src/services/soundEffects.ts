// PCB-01 Industrial Sound Synthesizer & Audio Engine
// Web Audio DSP Engine with Monolith Punch Synthesis Architecture
// Zero external audio assets, 100% deterministic local synthesis

export type SoundProfile = 'monolith';

export interface SoundProfileMeta {
  id: SoundProfile;
  name: string;
  tagline: string;
  description: string;
  color: string;
}

export const MONOLITH_PROFILE: SoundProfileMeta = {
  id: 'monolith',
  name: 'Sci-Fi Monolith',
  tagline: 'Clean Punch & Transient Snap',
  description: 'Precision industrial audio design with tight sub-frequency punch and crystalline high-frequency transient snap.',
  color: '#FF3B00',
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.65; // 0.0 to 1.0
  private lastSoundTime: number = 0;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedEnabled = localStorage.getItem('pcb01_sfx_enabled');
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }

      const savedVol = localStorage.getItem('pcb01_sound_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }

      this.setupGlobalClickInterceptor();
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public initAudioContext() {
    if (this.isInitialized) return;
    this.getContext();
    this.isInitialized = true;
  }

  private setupGlobalClickInterceptor() {
    if (typeof window === 'undefined') return;

    const handleInteraction = (e: MouseEvent) => {
      this.initAudioContext();
      if (!this.enabled) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest('button, a, input, select, [role="button"], label.cursor-pointer');
      if (interactive) {
        const now = Date.now();
        if (now - this.lastSoundTime > 40) {
          this.playKeyClick();
          this.lastSoundTime = now;
        }
      }
    };

    window.addEventListener('click', handleInteraction, { capture: true, passive: true });
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pcb01_sfx_enabled', String(this.enabled));
    }
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pcb01_sfx_enabled', String(this.enabled));
    }
    if (this.enabled) {
      this.playCommitSuccess();
    }
    return this.enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('pcb01_sound_volume', String(this.volume));
    }
    this.playButtonClick();
  }

  public getVolume(): number {
    return this.volume;
  }

  // =========================================================================
  // MONOLITH SOUND SYNTHESIS METHODS
  // =========================================================================

  /**
   * Primary Key Click: Tight sub-frequency punch + crystalline high-frequency transient snap
   */
  public playKeyClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.45, now);
    masterGain.connect(ctx.destination);

    // 1. High transient crack
    const oscSnap = ctx.createOscillator();
    const gainSnap = ctx.createGain();
    oscSnap.type = 'sine';
    oscSnap.frequency.setValueAtTime(3200, now);
    oscSnap.frequency.exponentialRampToValueAtTime(350, now + 0.012);
    gainSnap.gain.setValueAtTime(0.7, now);
    gainSnap.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    oscSnap.connect(gainSnap);
    gainSnap.connect(masterGain);
    oscSnap.start(now);
    oscSnap.stop(now + 0.012);

    // 2. Sub-bass punch (80Hz to 38Hz)
    const oscSub = ctx.createOscillator();
    const gainSub = ctx.createGain();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(95, now);
    oscSub.frequency.exponentialRampToValueAtTime(42, now + 0.035);
    gainSub.gain.setValueAtTime(0.8, now);
    gainSub.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    oscSub.connect(gainSub);
    gainSub.connect(masterGain);
    oscSub.start(now);
    oscSub.stop(now + 0.035);
  }

  /**
   * Rotary Knob Click
   */
  public playKnobClick(_step?: number) {
    this.playKeyClick();
  }

  /**
   * Button Press: Deeper, heavier feedback
   */
  public playButtonClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.04);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Rotary Switch / Tab Switch
   */
  public playTabSwitch() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.45, now);
    masterGain.connect(ctx.destination);

    [0, 0.018].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(i === 0 ? 540 : 880, now + delay);
      osc.frequency.exponentialRampToValueAtTime(220, now + delay + 0.02);
      gain.gain.setValueAtTime(0.6, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.02);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.02);
    });
  }

  /**
   * Generator Ratchet (rapid tick during rolling)
   */
  public playGeneratorRatchet(_speed?: number, _tone?: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.35, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.008);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.008);
  }

  /**
   * Pillar Toggle
   */
  public playPillarToggle(_state?: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.4, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.02);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  /**
   * Short Bleep
   */
  public playBleep(_freq?: number, _dur?: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.4, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Confidence Rating Step (1..5 harmonic sequence)
   */
  public playRatingStep(rating: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, now);
    masterGain.connect(ctx.destination);

    const baseFreqs = [261.63, 293.66, 329.63, 392.00, 523.25];
    const freq = baseFreqs[Math.min(4, Math.max(0, rating - 1))] || 440;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.08);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Study Log Saved / Stage Completed Success Chime
   */
  public playCommitSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.45, now);
    masterGain.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  }

  /**
   * Roll Generator Lock Sound
   */
  public playGeneratorLock() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.06);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Modal Open / Slide
   */
  public playModalOpen() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.4, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.05);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Modal Close
   */
  public playModalClose() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.35, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Deletion / Reset Vaporize
   */
  public playTrashVaporize() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.45, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Tactile Circuit Trace Energize / Pulse Sound Effect:
   * Mechanical relay coil latch, ascending resonant frequency charge, and crystalline voltage lock.
   */
  public playCircuitEnergizeSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.75, now);
    masterGain.connect(ctx.destination);

    // 1. Mechanical Relay Coil Click (Sub transient snap)
    const relayOsc = ctx.createOscillator();
    const relayGain = ctx.createGain();
    relayOsc.type = 'triangle';
    relayOsc.frequency.setValueAtTime(180, now);
    relayOsc.frequency.exponentialRampToValueAtTime(45, now + 0.05);
    relayGain.gain.setValueAtTime(0.7, now);
    relayGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    relayOsc.connect(relayGain);
    relayGain.connect(masterGain);
    relayOsc.start(now);
    relayOsc.stop(now + 0.06);

    // 2. High-Q LC Resonance Frequency Sweep (Voltage Capacitor Charge)
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(220, now + 0.04);
    sweepOsc.frequency.exponentialRampToValueAtTime(880, now + 0.28);
    sweepGain.gain.setValueAtTime(0.001, now + 0.04);
    sweepGain.gain.linearRampToValueAtTime(0.35, now + 0.16);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    sweepOsc.connect(sweepGain);
    sweepGain.connect(masterGain);
    sweepOsc.start(now + 0.04);
    sweepOsc.stop(now + 0.4);

    // 3. Superconductor Logic Lock (Crystal Bell Ping)
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1760, now + 0.22);
    bellGain.gain.setValueAtTime(0.001, now + 0.22);
    bellGain.gain.linearRampToValueAtTime(0.5, now + 0.24);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    bellOsc.connect(bellGain);
    bellGain.connect(masterGain);
    bellOsc.start(now + 0.22);
    bellOsc.stop(now + 0.62);
  }

  /**
   * Alias for backward compatibility
   */
  public playAriseExtractionSound() {
    this.playCircuitEnergizeSound();
  }
}

export const sound = new SoundEngine();
