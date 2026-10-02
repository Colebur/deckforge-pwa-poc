// Tab-scoped room credentials; never sent as part of a join link.
export interface Credential {code:string;token:string}
export function credentials(value:unknown):Credential[]{
 const items=Array.isArray(value)?value:[value];
 return items.filter((v):v is Credential=>!!v&&typeof v==='object'&&typeof v.code==='string'&&/^[A-Z2-9]{8}$/.test(v.code)&&typeof v.token==='string'&&v.token.length>=16)
 .reduce<Credential[]>((out,v)=>[...out.filter(c=>c.code!==v.code),{code:v.code,token:v.token}],[]).slice(-12);
}
export function remember(saved:readonly Credential[],value:Credential):Credential[]{return credentials([...saved,value]);}
export function remove(saved:readonly Credential[],code:string):Credential[]{return saved.filter(c=>c.code!==code);}
