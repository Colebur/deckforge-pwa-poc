import type {MotionSystem} from './motion.js';
export type SafetyPlatform='ios'|'android'|'other';
export function mobilePlatform(userAgent:string,touchPoints=0):SafetyPlatform {
  if(/iPhone|iPad|iPod/i.test(userAgent)||(/Macintosh/i.test(userAgent)&&touchPoints>1))return 'ios';
  return /Android/i.test(userAgent)?'android':'other';
}
export function shouldOfferSafety(platform:SafetyPlatform,section:string,seen:boolean):boolean {
  return platform!=='other'&&section==='work'&&!seen;
}
export function safetyInstructions(platform:SafetyPlatform):string {
  if(platform==='ios')return `<h3>Use Guided Access</h3><ol><li>Open Settings → Accessibility → Guided Access and turn it on.</li><li>In Passcode Settings, set a passcode. You can also allow Face ID or Touch ID to exit.</li><li>Open DeckForge from its Home Screen icon. Triple-click the side, top or Home button; choose Guided Access if prompted, then tap Start.</li><li>To exit, use the Guided Access button shortcut, authenticate, then tap End. Button shortcuts can vary with your OS version.</li></ol><p class="muted">Keep Touch and Motion enabled for DeckForge controls and tilt games. End Guided Access to make emergency calls.</p>`;
  if(platform==='android')return `<h3>Use App Pinning</h3><ol><li>Search your device’s Settings for App Pinning or Screen Pinning. Menu names and locations vary by manufacturer.</li><li>Enable it and require your PIN, pattern or password to unpin, if that option is available.</li><li>Open the installed DeckForge app, then open Recent Apps / Overview. Tap its app icon or menu and choose Pin.</li><li>Use the unpin gesture shown by your device and authenticate to exit.</li></ol><p class="muted">Some installations pin the browser instead. Check that you cannot switch tabs or leave DeckForge before handing it over.</p>`;
  return `<h3>Safe Device Sharing</h3><p>On iPhone/iPad, use Guided Access. On Android, look for App Pinning or Screen Pinning. On shared computers, keep control of your device.</p>`;
}
export function mountSafetyTutorial(platform:SafetyPlatform,dismiss:()=>Promise<void>,report:(message:string)=>void,motion?:MotionSystem):void {
  if(document.querySelector('#device-safety-dialog'))return;
  const previous=document.activeElement as HTMLElement|null;
  const dialog=document.createElement('dialog');dialog.id='device-safety-dialog';dialog.className='safety-dialog';
  dialog.setAttribute('aria-labelledby','safety-title');dialog.setAttribute('aria-describedby','safety-intro');
  dialog.innerHTML=`<span class="safety-icon" aria-hidden="true">🔒</span><h2 id="safety-title">Passing your phone around?</h2><p class="safety-subtitle">Here’s how to do it safely.</p><p id="safety-intro">If participants will handle your phone, your device can be temporarily restricted to DeckForge so they can’t easily leave the app or access the rest of your device.</p>${safetyInstructions(platform)}<p class="muted">These features reduce accidental access; they do not provide absolute security. DeckForge cannot enable them for you.</p><p id="safety-error" role="status"></p><button class="primary full" id="safety-dismiss">Got it</button>`;
  const close=async():Promise<void>=>{
    const button=dialog.querySelector<HTMLButtonElement>('#safety-dismiss')!;button.disabled=true;
    try{await dismiss();const remove=()=>{dialog.close();dialog.remove();};if(motion)motion.closeDialog(dialog,remove);else remove();if(previous?.isConnected)previous.focus({preventScroll:true});}
    catch{button.disabled=false;dialog.querySelector('#safety-error')!.textContent='Could not save this preference. Try again.';report('Safety tutorial preference could not be saved.');}
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();void close();});
  dialog.querySelector('button')!.addEventListener('click',()=>void close());
  document.body.append(dialog);dialog.showModal();motion?.openDialog(dialog);dialog.querySelector<HTMLButtonElement>('button')!.focus();
}
