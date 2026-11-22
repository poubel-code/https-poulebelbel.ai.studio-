// Gentle Web Audio API lo-fi Rhodes chord loop generator so the vinyl player produces real sound without external MP3 dependencies

const CHORD_PROGRESSIONS: Record<'warm' | 'midnight' | 'sunday', number[][]> = {
  warm: [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [196.0, 246.94, 293.66, 349.23], // G7
  ],
  midnight: [
    [293.66, 349.23, 440.0, 523.25], // Dm7
    [196.0, 246.94, 293.66, 349.23], // G7
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 415.3],  // Am(maj7)
  ],
  sunday: [
    [349.23, 440.0, 523.25, 659.25], // Fmaj7
    [329.63, 392.0, 493.88, 587.33], // Em7
    [293.66, 349.23, 440.0, 523.25], // Dm7
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
  ],
};

class LofiAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private intervalId: number | null = null;
  private step = 0;
  private muted = false;
  private baseVolume = 0.7;

  private async ensureContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.baseVolume * 0.55;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Ignore resume rejection if not triggered by user gesture
      }
    }
  }

  private playChord(freqs: number[]) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1450, now);
    filter.connect(this.masterGain);

    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      // Slight vintage tape detune
      osc.detune.setValueAtTime((idx - 1.5) * 4, now);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(0.36 / freqs.length, now + 0.1 + idx * 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);

      osc.connect(env);
      env.connect(filter);

      osc.start(now + idx * 0.02);
      osc.stop(now + 2.4);
    });
  }

  public async start(chordKey: 'warm' | 'midnight' | 'sunday', bpm: number) {
    this.stop();
    const runToken = (this.step += 1);
    await this.ensureContext();
    if (this.step !== runToken) return;

    const progression = CHORD_PROGRESSIONS[chordKey] || CHORD_PROGRESSIONS.warm;
    const beatMs = Math.max(1600, Math.round((60 / bpm) * 1000 * 2.5));

    let chordIndex = 0;
    this.playChord(progression[chordIndex]);
    chordIndex += 1;

    this.intervalId = window.setInterval(() => {
      const chord = progression[chordIndex % progression.length];
      this.playChord(chord);
      chordIndex += 1;
    }, beatMs);
  }

  public stop() {
    this.step += 1;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setVolume(vol: number) {
    this.baseVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.baseVolume * 0.55, this.ctx.currentTime, 0.04);
    }
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : this.baseVolume * 0.24, this.ctx.currentTime, 0.05);
    }
  }
}

export const lofiAudio = new LofiAudioEngine();
