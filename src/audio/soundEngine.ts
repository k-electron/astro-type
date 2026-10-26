import type { AudioSynthCore, BeatTheme } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null; // Master node -> destination
  private sfxGain: GainNode | null = null; // SFX node -> masterGain
  private musicGain: GainNode | null = null; // Music node -> masterGain
  private soundVolume: number = 0.7;
  private musicVolume: number = 0.4;
  private soundEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private currentCore: AudioSynthCore = 'CYBER_SYNTH';
  private beatTheme: BeatTheme = 'NEON_SYNTHWAVE';
  private globalMuted: boolean = false;

  // Rhythm Beat Engine State
  private beatIntervalId: number | null = null;
  private nextBeatTime: number = 0;
  private currentStep: number = 0;
  private measureCount: number = 0;
  private tempoBpm: number = 106;
  private isOverdrive: boolean = false;

  private laneFrequencies = [
    261.63, // Lane 0: C4 (L.Pinky)
    293.66, // Lane 1: D4 (L.Ring)
    329.63, // Lane 2: E4 (L.Mid)
    392.0, // Lane 3: G4 (L.Index)
    196.0, // Lane 4: G3 (Space/Thumb - punchy bass)
    440.0, // Lane 5: A4 (R.Index)
    523.25, // Lane 6: C5 (R.Mid)
    587.33, // Lane 7: D5 (R.Ring)
    659.25, // Lane 8: E5 (R.Pinky)
  ];

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master overall gain -> destination (0 when muted, 1 when unmuted)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.globalMuted ? 0 : 1,
        this.ctx.currentTime,
      );
      this.masterGain.connect(this.ctx.destination);

      // Dedicated SFX Gain -> masterGain
      this.sfxGain = this.ctx.createGain();
      const fxGain = this.soundEnabled ? this.soundVolume : 0;
      this.sfxGain.gain.setValueAtTime(fxGain, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Dedicated Music Gain -> masterGain
      this.musicGain = this.ctx.createGain();
      const musGain = this.musicEnabled ? this.musicVolume : 0;
      this.musicGain.gain.setValueAtTime(musGain, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch {
      // AudioContext unavailable
    }
  }

  public setCore(core: AudioSynthCore) {
    this.currentCore = core;
  }

  public setBeatTheme(theme: BeatTheme) {
    this.beatTheme = theme;
    if (theme === 'NEON_SYNTHWAVE') {
      this.tempoBpm = 106;
    } else if (theme === 'CYBER_PULSE') {
      this.tempoBpm = 122;
    } else {
      this.tempoBpm = 84;
    }
  }

  public cycleBeatTheme(): BeatTheme {
    const themes: BeatTheme[] = [
      'NEON_SYNTHWAVE',
      'CYBER_PULSE',
      'COSMIC_LOFI',
    ];
    const curIdx = themes.indexOf(this.beatTheme);
    const next = themes[(curIdx + 1) % themes.length];
    this.setBeatTheme(next);
    return next;
  }

  public getBeatTheme(): BeatTheme {
    return this.beatTheme;
  }

  public getBpm(): number {
    return this.tempoBpm;
  }

  public setGlobalMute(muted: boolean) {
    this.globalMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
    }
    if (muted && this.beatIntervalId) {
      this.stopBeat();
    }
  }

  public isGlobalMuted(): boolean {
    return this.globalMuted;
  }

  public setSoundVolume(vol: number) {
    this.soundVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      const fx = !this.soundEnabled ? 0 : this.soundVolume;
      this.sfxGain.gain.setValueAtTime(fx, this.ctx.currentTime);
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      const mus = !this.musicEnabled ? 0 : this.musicVolume;
      this.musicGain.gain.setValueAtTime(mus, this.ctx.currentTime);
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (this.sfxGain && this.ctx) {
      const fx = !enabled ? 0 : this.soundVolume;
      this.sfxGain.gain.setValueAtTime(fx, this.ctx.currentTime);
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public isBeatPlaying(): boolean {
    return this.beatIntervalId !== null;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      const mus = !enabled ? 0 : this.musicVolume;
      this.musicGain.gain.setValueAtTime(mus, this.ctx.currentTime);
    }
    if (!enabled && this.beatIntervalId) {
      this.stopBeat();
    }
  }

  public setOverdrive(active: boolean) {
    this.isOverdrive = active;
  }

  // ==========================================
  // RHYTHMIC COSMIC BEAT SCHEDULER
  // ==========================================

  public startBeat() {
    if (this.globalMuted || !this.musicEnabled || this.musicVolume <= 0) return;
    this.init();
    if (!this.ctx || !this.musicGain) return;
    if (this.beatIntervalId) return;

    this.currentStep = 0;
    this.measureCount = 0;
    this.nextBeatTime = this.ctx.currentTime + 0.05;

    // Scheduler tick every 25ms
    const lookahead = 0.12;

    this.beatIntervalId = window.setInterval(() => {
      if (!this.ctx) return;
      const secondsPerStep = 60 / this.tempoBpm / 4; // 16th notes
      while (this.nextBeatTime < this.ctx.currentTime + lookahead) {
        this.scheduleBeatStep(
          this.currentStep,
          this.measureCount,
          this.nextBeatTime,
        );
        this.nextBeatTime += secondsPerStep;
        this.currentStep = (this.currentStep + 1) % 16;
        if (this.currentStep === 0) {
          this.measureCount = (this.measureCount + 1) % 4;
        }
      }
    }, 25);
  }

  public stopBeat() {
    if (this.beatIntervalId) {
      clearInterval(this.beatIntervalId);
      this.beatIntervalId = null;
    }
  }

  private scheduleBeatStep(step: number, measure: number, time: number) {
    if (!this.ctx || !this.musicGain || !this.musicEnabled || this.globalMuted)
      return;

    if (this.beatTheme === 'NEON_SYNTHWAVE') {
      this.scheduleSynthwaveStep(step, measure, time);
    } else if (this.beatTheme === 'CYBER_PULSE') {
      this.scheduleCyberPulseStep(step, measure, time);
    } else {
      this.scheduleLofiStep(step, measure, time);
    }
  }

  // 1. NEON SYNTHWAVE PATTERN (106 BPM)
  private scheduleSynthwaveStep(step: number, measure: number, time: number) {
    // KICK on beat 0, beat 8, and syncopated beat 10
    const isKick =
      step === 0 ||
      step === 8 ||
      step === 10 ||
      (this.isOverdrive && (step === 4 || step === 14));
    // SNARE / CLAP on beat 4 and beat 12
    const isSnare = step === 4 || step === 12;
    // HI-HAT on 16th notes with open hat on upbeat (steps 2, 6, 10, 14)
    const isHihat = true;
    const isOpenHat = step === 2 || step === 6 || step === 10 || step === 14;

    if (isKick) this.playPunchyKick(time);
    if (isSnare) this.playCrispSnare(time);
    if (isHihat) this.playHihat(time, isOpenHat, step % 4 === 0);

    // Synthwave Rolling 16th Bassline (Am - F - G - Em progression)
    // Root frequencies: A2: 110, F2: 87.31, G2: 98, E2: 82.41
    const chordRoots = [110.0, 87.31, 98.0, 82.41];
    const root = chordRoots[measure] || 110;
    // Octave jumping on odd 16ths
    const octave = step % 2 === 1 ? 2 : 1;
    if (step % 2 === 0 || this.isOverdrive) {
      this.playSynthwaveBass(time, root * octave, 0.12);
    }

    // Melodic Arpeggio on selected 16th steps
    const arpNotes = [
      [220, 261.63, 329.63, 440, 523.25, 440, 329.63, 261.63], // Am
      [174.61, 220, 261.63, 349.23, 440, 349.23, 261.63, 220], // F
      [196, 246.94, 293.66, 392, 493.88, 392, 293.66, 246.94], // G
      [164.81, 196, 246.94, 329.63, 392, 329.63, 246.94, 196], // Em
    ];
    const notePattern = arpNotes[measure] || arpNotes[0];
    const arpFreq = notePattern[step % notePattern.length];
    if (step % 2 === 0 || this.isOverdrive) {
      this.playArpPluck(time, arpFreq);
    }
  }

  // 2. CYBER PULSE PATTERN (122 BPM)
  private scheduleCyberPulseStep(step: number, measure: number, time: number) {
    // Four-on-the-floor kick
    const isKick = step % 4 === 0;
    const isSnare = step === 4 || step === 12;
    const isHihat = step % 2 === 0 || this.isOverdrive;
    const isOpenHat = step === 2 || step === 6 || step === 10 || step === 14;

    if (isKick) this.playElectroKick(time);
    if (isSnare) this.playCrispSnare(time, true);
    if (isHihat) this.playHihat(time, isOpenHat, true);

    // Punchy syncopated electro bass stabs
    if (
      step === 0 ||
      step === 3 ||
      step === 6 ||
      step === 8 ||
      step === 11 ||
      step === 14
    ) {
      const roots = [146.83, 146.83, 174.61, 196]; // D3, D3, F3, G3
      const freq = roots[measure] || 146.83;
      this.playElectroBass(time, freq);
    }

    // High energetic synth hook
    if (step === 2 || step === 6 || step === 10 || step === 14) {
      const synthNotes = [587.33, 659.25, 783.99, 880]; // D5, E5, G5, A5
      const note =
        synthNotes[(measure + Math.floor(step / 4)) % synthNotes.length];
      this.playArpPluck(time, note, true);
    }
  }

  // 3. COSMIC LO-FI PATTERN (84 BPM)
  private scheduleLofiStep(step: number, measure: number, time: number) {
    // Boom-bap kick groove
    const isKick = step === 0 || step === 7 || step === 10;
    // Snare rimshot on 4 and 12
    const isSnare = step === 4 || step === 12;
    // Swung gentle hi-hat
    const isHihat = step % 2 === 0;

    if (isKick) this.playLofiKick(time);
    if (isSnare) this.playLofiSnare(time);
    if (isHihat) this.playHihat(time, false, false, 0.05);

    // Deep warm sub-bass
    if (step === 0 || step === 8) {
      const roots = [55.0, 65.41, 73.42, 65.41]; // A1, C2, D2, C2
      const freq = roots[measure] || 55.0;
      this.playSubBass(time, freq);
    }

    // Warm Rhodes/sine chord tones
    if (step === 0 || step === 8) {
      const chords = [
        [220, 261.63, 329.63], // Am7
        [174.61, 220, 261.63], // Fmaj7
        [196, 246.94, 293.66], // G
        [164.81, 196, 246.94], // Em
      ];
      const chord = chords[measure] || chords[0];
      chord.forEach((f) => {
        this.playWarmChime(time, f);
      });
    }
  }

  // Drum Synthesizers
  private playPunchyKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.23);
    } catch {}
  }

  private playElectroKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.06);

      gain.gain.setValueAtTime(0.38, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.17);
    } catch {}
  }

  private playLofiKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.14);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.29);
    } catch {}
  }

  private playCrispSnare(time: number, isLaser = false) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(isLaser ? 1400 : 1000, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.24, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + 0.15);

      // Snare Body
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = isLaser ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(isLaser ? 320 : 210, time);
      osc.frequency.exponentialRampToValueAtTime(90, time + 0.08);

      oscGain.gain.setValueAtTime(0.22, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(oscGain);
      oscGain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.11);
    } catch {}
  }

  private playLofiSnare(time: number) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.09);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + 0.1);
    } catch {}
  }

  private playHihat(
    time: number,
    isOpen: boolean,
    isAccent: boolean,
    volMultiplier = 1,
  ) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const dur = isOpen ? 0.18 : 0.04;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, time);

      const gain = this.ctx.createGain();
      const peak = (isOpen ? 0.18 : isAccent ? 0.12 : 0.07) * volMultiplier;
      gain.gain.setValueAtTime(peak, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.9);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + dur);
    } catch {}
  }

  // Melodic & Bass Synthesizers
  private playSynthwaveBass(time: number, freq: number, dur = 0.14) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, time);
      filter.frequency.exponentialRampToValueAtTime(160, time + dur);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + dur + 0.02);
    } catch {}
  }

  private playElectroBass(time: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, time);
      filter.frequency.exponentialRampToValueAtTime(140, time + 0.16);

      gain.gain.setValueAtTime(0.22, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.18);
    } catch {}
  }

  private playSubBass(time: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.26, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.46);
    } catch {}
  }

  private playArpPluck(time: number, freq: number, isBright = false) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = isBright ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isBright ? 2400 : 1600, time);
      filter.frequency.exponentialRampToValueAtTime(400, time + 0.14);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.16);
    } catch {}
  }

  private playWarmChime(time: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.52);
    } catch {}
  }

  // ==========================================
  // INTERACTIVE KEYSTROKE SFX
  // ==========================================

  public playLaneHit(
    laneIndex: number,
    rating: 'PERFECT' | 'GREAT' | 'GOOD',
    isSpace: boolean = laneIndex === 4,
  ) {
    if (this.globalMuted || !this.soundEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    try {
      const now = this.ctx.currentTime;
      // Exact pentatonic harmonic pitch (pure, perfectly in-tune with background beats)
      const baseFreq = this.laneFrequencies[laneIndex] || 440;

      // Melodic chime volume
      const targetGain =
        rating === 'PERFECT' ? 0.14 : rating === 'GREAT' ? 0.11 : 0.085;
      const decayDuration = rating === 'PERFECT' ? 0.22 : 0.16;

      if (this.currentCore === 'RETRO_8BIT') {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, now);

        // Soften harsh high square edges with gentle lowpass
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(targetGain * 0.85, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (this.currentCore === 'DEEP_SPACE') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(targetGain * 0.95, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (this.currentCore === 'NEO_ACOUSTIC') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Warm kalimba / acoustic marimba chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(targetGain, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        // CYBER_SYNTH default - Smooth, crystalline celestial chime
        const oscMain = this.ctx.createOscillator();
        const gainMain = this.ctx.createGain();

        // Warm pure sine fundamental
        oscMain.type = 'sine';
        oscMain.frequency.setValueAtTime(baseFreq, now);

        gainMain.gain.setValueAtTime(0, now);
        gainMain.gain.linearRampToValueAtTime(targetGain, now + 0.006); // 6ms click-free attack
        gainMain.gain.exponentialRampToValueAtTime(0.0001, now + decayDuration);

        oscMain.connect(gainMain);
        gainMain.connect(this.sfxGain);
        oscMain.start(now);
        oscMain.stop(now + decayDuration + 0.02);

        // Delicate, soft harmonic shimmer for PERFECT hits (clean octave, very subtle, soothing)
        if (rating === 'PERFECT') {
          const oscShimmer = this.ctx.createOscillator();
          const gainShimmer = this.ctx.createGain();

          oscShimmer.type = 'sine';
          oscShimmer.frequency.setValueAtTime(baseFreq * 2, now); // Pure harmonic octave

          gainShimmer.gain.setValueAtTime(0, now);
          gainShimmer.gain.linearRampToValueAtTime(0.045, now + 0.008);
          gainShimmer.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

          oscShimmer.connect(gainShimmer);
          gainShimmer.connect(this.sfxGain);
          oscShimmer.start(now);
          oscShimmer.stop(now + 0.16);
        }
      }

      // Orbital Interceptor: Visceral laser zap & target shatter crunch
      this.playPhotonBlast(now, rating, isSpace);
      this.playTargetDetonation(now, rating, isSpace);
      if (rating === 'PERFECT' || rating === 'GREAT') {
        this.playCrystalChime(now);
      }
    } catch {
      // Audio exception ignored
    }
  }

  // Snappy photon cannon bolt or heavy torpedo discharge
  private playPhotonBlast(
    now: number,
    rating: 'PERFECT' | 'GREAT' | 'GOOD',
    isSpace: boolean,
  ) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      if (isSpace) {
        // Heavy Torpedo salvo: resonant low dive
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(850, now);
        filter.frequency.exponentialRampToValueAtTime(140, now + 0.18);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      } else {
        // Snappy laser pulse: high to mid chirp
        osc.type = 'sawtooth';
        const startFreq = rating === 'PERFECT' ? 1280 : 1020;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2600, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(
          rating === 'PERFECT' ? 0.16 : 0.12,
          now + 0.003,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + (isSpace ? 0.24 : 0.09));
    } catch {}
  }

  // Target shatter / asteroid mine detonation crunch
  private playTargetDetonation(
    now: number,
    rating: 'PERFECT' | 'GREAT' | 'GOOD',
    isSpace: boolean,
  ) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const dur = isSpace ? 0.18 : 0.11;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(
        isSpace ? 380 : rating === 'PERFECT' ? 1600 : 1200,
        now,
      );
      filter.frequency.exponentialRampToValueAtTime(
        isSpace ? 90 : 260,
        now + dur,
      );

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(
        isSpace ? 0.22 : rating === 'PERFECT' ? 0.15 : 0.11,
        now + 0.004,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + dur + 0.01);
    } catch {}
  }

  // Sparkling crystal scrap collection chime
  private playCrystalChime(now: number) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2093, now + 0.025); // C7 sparkling chime
      osc.frequency.exponentialRampToValueAtTime(2637, now + 0.075); // E7

      gain.gain.setValueAtTime(0, now + 0.025);
      gain.gain.linearRampToValueAtTime(0.065, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + 0.025);
      osc.stop(now + 0.15);
    } catch {}
  }

  public playMiss() {
    if (this.globalMuted || !this.soundEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      // Soft low-frequency thud instead of harsh buzzer
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Audio exception ignored
    }
  }

  public playShieldAbsorb() {
    if (this.globalMuted || !this.soundEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio exception ignored
    }
  }

  public playHyperspaceIgnition() {
    if (this.globalMuted || !this.soundEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch {
      // Audio exception ignored
    }
  }

  public playStarChime(starNumber: 1 | 2 | 3) {
    if (this.globalMuted || !this.soundEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const notes =
        starNumber === 1
          ? [523.25, 659.25]
          : starNumber === 2
            ? [659.25, 783.99]
            : [783.99, 1046.5];

      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.22, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch {
      // Audio exception ignored
    }
  }

  public playStageVictory() {
    if (this.globalMuted || !this.soundEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, i) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.1);

        gain.gain.setValueAtTime(0.25, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
    } catch {
      // Audio exception ignored
    }
  }

  public playShieldUpgrade() {
    if (this.globalMuted || !this.soundEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.32);
      });
    } catch {}
  }

  public playEquipCosmetic() {
    if (this.globalMuted || !this.soundEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      [659.25, 783.99].forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.2, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.28);
      });
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
