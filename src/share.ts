export interface ShareService {saveFile(contents:string,name:string):Promise<'shared'|'download-requested'|'canceled'>;copyText(text:string):Promise<void>}
export const webShare:ShareService={
  async saveFile(contents,name){
    const file=new File([contents],name,{type:'application/json'});
    if(navigator.canShare?.({files:[file]})&&navigator.share){
      try{await navigator.share({files:[file],title:'DeckForge Backup'});return 'shared';}
      catch(error){if(error instanceof DOMException&&error.name==='AbortError')return 'canceled';}
    }
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);return 'download-requested';
  },
  async copyText(text){await navigator.clipboard.writeText(text);}
};
