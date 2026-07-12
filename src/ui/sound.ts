/**
 * Synthesised sound effects — no audio assets, just short WebAudio envelopes.
 * The AudioContext is created lazily on the first user gesture (browser
 * autoplay policy), and the mute preference persists in localStorage.
 */

const MUTE_KEY = "city-builder-muted";

export type SfxName = "build" | "bulldoze" | "error" | "fire" | "milestone" | "click";

export class Sound {
  private ctx: AudioContext | null = null;
  muted: boolean;

  constructor() {
    this.muted = localStorage.getItem(MUTE_KEY) === "1";
  }

  toggleMute(): void {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0");
    } catch {
      // storage unavailable — mute just won't persist
    }
  }

  /** Must be called from inside a user-gesture handler at least once. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return; // no WebAudio — stay silent
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  play(name: SfxName): void {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "build":
        this.blip(660, 0.06, t, "square", 0.05);
        this.blip(880, 0.05, t + 0.05, "square", 0.04);
        break;
      case "bulldoze":
        this.blip(140, 0.12, t, "sawtooth", 0.07);
        break;
      case "error":
        this.blip(120, 0.16, t, "square", 0.06);
        break;
      case "click":
        this.blip(500, 0.03, t, "sine", 0.035);
        break;
      case "fire":
        // Two-tone siren burst.
        this.blip(720, 0.14, t, "triangle", 0.07);
        this.blip(560, 0.14, t + 0.15, "triangle", 0.07);
        this.blip(720, 0.14, t + 0.3, "triangle", 0.07);
        break;
      case "milestone":
        // Rising major arpeggio.
        this.blip(523, 0.1, t, "triangle", 0.06);
        this.blip(659, 0.1, t + 0.09, "triangle", 0.06);
        this.blip(784, 0.16, t + 0.18, "triangle", 0.07);
        break;
    }
  }

  private blip(
    freq: number,
    dur: number,
    when: number,
    type: OscillatorType,
    gain: number
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(gain, when);
    amp.gain.exponentialRampToValueAtTime(0.0005, when + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
}
