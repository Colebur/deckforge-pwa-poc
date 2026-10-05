// WebKit can settle the standalone viewport after the first layout. Refresh the
// shell on launch/resume without rerendering a game or reacting to keyboard size.
export function refreshViewport():void {
  const update=():void=>{
    if(document.activeElement?.matches('input,textarea,select,[contenteditable=true]'))return;
    document.documentElement.style.setProperty('--shell-height',`${window.innerHeight}px`);
  };
  const settle=():void=>{update();requestAnimationFrame(()=>{update();requestAnimationFrame(update);});};
  settle();window.addEventListener('load',settle);window.addEventListener('pageshow',settle);
  window.addEventListener('resize',settle);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)settle();});
}
