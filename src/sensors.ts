import {browserGravity} from './tilt.js';
type PermissionEventConstructor = { requestPermission?: () => Promise<'granted' | 'denied'> };
export class Sensors {
  onGravity?: (gravity: [number,number,number], now: number)=>void;
  motionAllowed=false;
  status = 'Not started. Tap Enable Sensors on your iPhone.';
  orientationCount = 0;
  motionCount = 0;
  validOrientation = 0;
  validMotion = 0;
  startedAt = 0;
  lastAt = 0;
  heading:number|undefined;
  angles = 'No orientation readings yet';
  gravity = 'No acceleration readings yet';
  active = false;
  private generation = 0;
  private timeout?: number;
  private orientation = (event: DeviceOrientationEvent): void => {
    this.orientationCount++;
    this.heading=typeof event.alpha==='number'&&Number.isFinite(event.alpha)?event.alpha:undefined;
    if ([event.alpha,event.beta,event.gamma].some(v=>typeof v === 'number' && Number.isFinite(v))) {
      this.validOrientation++; this.lastAt=performance.now();
    }
    this.angles = `α ${format(event.alpha)}° · β ${format(event.beta)}° · γ ${format(event.gamma)}°`;
  };
  private motion = (event: DeviceMotionEvent): void => {
    this.motionCount++;
    const g=event.accelerationIncludingGravity;
    if(g && [g.x,g.y,g.z].some(v=>typeof v === 'number' && Number.isFinite(v))) {
      this.validMotion++; this.lastAt=performance.now();
    }
    if(g) {const gravity=browserGravity(g,event.acceleration);if(gravity)this.onGravity?.(gravity,performance.now()/1000);}
    this.gravity = `x ${format(g?.x)} · y ${format(g?.y)} · z ${format(g?.z)} m/s²`;
  };
  async start(): Promise<void> {
    this.stop();
    const generation = this.generation;
    if(!window.isSecureContext) { this.status='Blocked: open the HTTPS test address.'; return; }
    const orientation = window.DeviceOrientationEvent as unknown as PermissionEventConstructor | undefined;
    const motion = window.DeviceMotionEvent as unknown as PermissionEventConstructor | undefined;
    if(!orientation && !motion) { this.status='Sensor APIs are unavailable in this browser.'; return; }
    this.orientationCount=this.motionCount=this.validOrientation=this.validMotion=0;
    this.lastAt=0;this.heading=undefined; this.angles='Waiting for orientation…'; this.gravity='Waiting for acceleration…';
    this.status='Requesting permission…';
    // Both requests are invoked before the first await, while the tap is still active.
    const requests = [orientation,motion].map(api => api?.requestPermission ? api.requestPermission() : Promise.resolve(api ? 'granted' : 'unavailable'));
    const results = await Promise.allSettled(requests);
    if(generation !== this.generation) return;
    const allowed = results.map(result => result.status === 'fulfilled' && result.value === 'granted');
    if(!allowed.some(Boolean)) { this.status='Permission denied or unavailable. Reopen and tap Enable Sensors to retry.'; return; }
    this.motionAllowed=allowed[1] ?? false;
    if(allowed[0]) window.addEventListener('deviceorientation',this.orientation);
    if(allowed[1]) window.addEventListener('devicemotion',this.motion);
    this.active=true; this.startedAt=performance.now();
    this.status=`Listening · orientation ${allowed[0]?'allowed':'denied/unavailable'} · motion ${allowed[1]?'allowed':'denied/unavailable'}`;
    this.timeout = window.setTimeout(()=> {
      if(this.active && !this.validOrientation && !this.validMotion) this.status='Permission allowed, but no usable readings after 5 seconds. Try on the physical iPhone.';
    },5000);
  }
  stop(): void {
    this.generation++;
    window.removeEventListener('deviceorientation',this.orientation);
    window.removeEventListener('devicemotion',this.motion);
    window.clearTimeout(this.timeout);
    if(this.active) this.status='Stopped. Tap Enable Sensors to restart.';
    this.active=false;this.motionAllowed=false;
  }
}
function format(value: number | null | undefined): string { return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—'; }
