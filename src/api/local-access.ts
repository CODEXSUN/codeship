import {requireLocalRequest} from '@workspace/framework';
import {isIP} from 'node:net';
export function codeshipAccessPolicy(dockerPeers:string[]=[]){
 if(dockerPeers.some(peer=>!isIP(peer)||['0.0.0.0','::'].includes(peer)))throw new Error('Docker transport peers must be explicit IP addresses.');
 const peers=new Set(['127.0.0.1','::1',...dockerPeers]);
 return async(request:Parameters<typeof requireLocalRequest>[0],reply:Parameters<typeof requireLocalRequest>[1])=>{
  const peer=request.raw.socket.remoteAddress??'',normalized=peer.replace(/^::ffff:/,'');
  if(!dockerPeers.length||['127.0.0.1','::1'].includes(normalized))return requireLocalRequest(request,reply);
  const host=request.headers.host??'';
  try{new URL('http://'+host);}catch{return reply.code(403).send({message:'Invalid local authority.'});}
  if(!peers.has(normalized)||!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)||request.headers.origin!==undefined&&request.headers.origin!==`http://${host}`){
   return reply.code(403).send({message:'Codeship accepts only the approved local Docker transport and same-origin requests.'});
  }
 };
}
