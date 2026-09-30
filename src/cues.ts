export function beepInterval(remaining: number, length: number): number {
  const fraction = Math.min(1, Math.max(0, remaining / Math.max(1, length)));
  return 220 + 1780 * Math.pow(fraction, 0.75);
}
export class CountdownCues {
  private running = false;
  private next = 0;
  reset(): void { this.running = false; this.next = 0; }
  update(phase: 'running' | 'paused' | 'ended', remaining: number, length: number, now: number): 'beep' | 'buzzer' | null {
    const wasRunning = this.running;
    this.running = phase === 'running';
    if (!this.running) { this.next = 0; return phase === 'ended' && wasRunning ? 'buzzer' : null; }
    if (wasRunning && now < this.next) return null;
    // Schedule from now: delayed callbacks never produce a catch-up burst.
    this.next = now + beepInterval(remaining, length);
    return 'beep';
  }
}
