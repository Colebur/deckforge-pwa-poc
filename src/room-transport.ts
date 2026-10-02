// Browser adapter: room rules stay on the server, independent of this transport.
export function roomEndpoint():string {
 return location.hostname==='localhost'||location.hostname==='127.0.0.1'
  ?'http://localhost:4180':'https://deckforge-vote-test.coletonsolari.workers.dev';
}
export async function roomRequest<T>(action:string,data:unknown,code:string|undefined,secret:string|undefined,signal:AbortSignal):Promise<{response:Response;body:T}> {
 const response=await fetch(`${roomEndpoint()}/api/${code}/${action}`,{method:'POST',headers:{'Content-Type':'application/json',...(secret?{Authorization:'Bearer '+secret}:{})},body:JSON.stringify(data),cache:'no-store',credentials:'omit',signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])});
 return {response,body:await response.json()};
}
