
export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private musicFilter: BiquadFilterNode;
  private musicGain: GainNode;
  
  private isPlaying: boolean = false;
  private tempo: number = 135;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // s
  private nextNoteTime: number = 0.0;
  private timerID: number | null = null;
  private currentNote: number = 0; // 0-15 (16th notes)

  // E Minor / Phrygian dominant feel for dark mood
  private bassLine = [
      41.20, 41.20, 0, 41.20,  // E1
      43.65, 43.65, 0, 41.20,  // F1, E1
      49.00, 49.00, 0, 43.65,  // G1, F1
      55.00, 49.00, 43.65, 41.20 // A1, G1, F1, E1
  ];

  constructor() {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    // Filter for the dynamic intensity effect (Low Pass)
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = "lowpass";
    this.musicFilter.frequency.value = 400; // Start muffled
    this.musicFilter.Q.value = 1;
    this.musicFilter.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.8;
    this.musicGain.connect(this.musicFilter);
  }

  public async resume() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public start() {
    this.resume();
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.currentNote = 0;
      this.nextNoteTime = this.ctx.currentTime;
      this.scheduler();
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID) window.clearTimeout(this.timerID);
    
    // Quick fade out
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  }

  public setIntensity(intensity: number) {
    // intensity: 0 (safe) -> 1 (danger)
    const now = this.ctx.currentTime;
    
    // Map intensity to Filter Frequency: 200Hz -> 10000Hz
    // Use exponential mapping for better hearing response
    const minFreq = 200;
    const maxFreq = 10000;
    const targetFreq = minFreq + (maxFreq - minFreq) * Math.pow(intensity, 2);
    
    this.musicFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);

    // Also modulate Q slightly to make it "scream" a bit at high intensity
    this.musicFilter.Q.setTargetAtTime(1 + (intensity * 5), now, 0.1);
  }

  public playJumpSound() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playExplosion() {
    const t = this.ctx.currentTime;
    
    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start(t);
  }

  // --- Scheduler Logic ---

  private scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentNote, this.nextNoteTime);
      this.nextNote();
    }
    if (this.isPlaying) {
      this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
    this.currentNote++;
    if (this.currentNote === 16) {
      this.currentNote = 0;
    }
  }

  private scheduleNote(beatNumber: number, time: number) {
    // 1. Kick Drum (Beats 0, 4, 8, 12)
    if (beatNumber % 4 === 0) {
      this.playKick(time);
    }

    // 2. Snare / Clap (Beats 4, 12)
    if (beatNumber === 4 || beatNumber === 12) {
      this.playSnare(time);
    }

    // 3. Hi-Hats (Every odd 16th note usually, or all)
    if (beatNumber % 2 === 0) {
       this.playHiHat(time, beatNumber % 4 === 2 ? 0.15 : 0.05); // Accents
    }

    // 4. Bass Line
    // We map the array index to the beat number (looped)
    const noteFreq = this.bassLine[beatNumber];
    if (noteFreq > 0) {
        this.playBass(time, noteFreq);
    }
    
    // 5. Arp (Only audible when filter opens via intensity)
    if (beatNumber % 3 === 0) {
        this.playArp(time, 400 + (Math.random() * 200));
    }
  }

  // --- Synth Voices ---

  private playKick(time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    osc.connect(gain);
    gain.connect(this.musicGain); // Send to filter bus
    
    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playSnare(time: number) {
    // Noise
    const bufferSize = this.ctx.sampleRate * 0.1; // short
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.musicGain);
    
    noise.start(time);
  }

  private playHiHat(time: number, vol: number) {
      // High freq noise or square
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 8000;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.05);
  }

  private playBass(time: number, freq: number) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.setTargetAtTime(0, time, 0.1);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.3);
  }

  private playArp(time: number, freq: number) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.1, time); // Quiet base volume
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      
      osc.connect(gain);
      gain.connect(this.musicGain); // Heavily affected by the main filter
      
      osc.start(time);
      osc.stop(time + 0.1);
  }
}
