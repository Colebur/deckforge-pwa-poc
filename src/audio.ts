// HTML audio deliberately tests the same path available to a Home Screen web app.
// Playback starts only from a tap. A reported 'playing' event cannot prove audibility.
export class AudioProbe {
  readonly loop = new Audio('./loop.wav');
  private tone = new Audio('./tone.wav');
  readonly events: string[] = [];
  keepInBackground = false;
  constructor() {
    this.loop.loop = true;
    this.loop.volume = 0.35;
    this.tone.volume = 0.5;
    for (const [name, audio] of [['loop',this.loop],['cue',this.tone]] as const) {
      audio.preload = 'auto';
      for (const event of ['playing','pause','ended','waiting','stalled','error'])
        audio.addEventListener(event, () => this.log(`${name}: ${event}`));
    }
  }
  log(message: string): void {
    this.events.unshift(`${new Date().toLocaleTimeString()} · ${message}`);
    this.events.splice(0,12);
  }
  async playTone(): Promise<void> {
    if(!this.tone.src.endsWith('/tone.wav')) this.tone.src = './tone.wav';
    this.tone.currentTime = 0;
    await this.tone.play();
  }
  async startLoop(): Promise<void> { await this.loop.play(); }
  stopLoop(): void { this.loop.pause(); this.loop.currentTime = 0; }
  async expiry(): Promise<void> { this.stopLoop(); this.tone.src = './buzzer.wav'; await this.tone.play(); }
  stop(): void { this.stopLoop(); this.tone.pause(); }
}
