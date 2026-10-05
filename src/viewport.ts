// WebKit can settle the standalone viewport after the first layout. Refresh the
// shell on launch/resume without rerendering a game or reacting to keyboard size.
export function refreshViewport():void {
  let timer:number|undefined,last=0;
  const update=():void=>{
    if(document.activeElement?.matches('input,textarea,select,[contenteditable=true]'))return;
    const height=Math.round(window.innerHeight);
    if(height===last)return;
    last=height;document.documentElement.style.setProperty('--shell-height',`${height}px`);
  };
  // A trailing update avoids writing intermediate rotation sizes back into layout.
  const settle=():void=>{window.clearTimeout(timer);timer=window.setTimeout(update,200);};
  update();window.addEventListener('load',settle);window.addEventListener('pageshow',settle);
  window.addEventListener('resize',settle);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)settle();});
}
export function mainTabsVisible(route:string,linkDetail=false):boolean {
  return route==='home'||route==='library'||(route==='link'&&!linkDetail);
}
