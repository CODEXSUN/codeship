import {spawn} from 'node:child_process';
import {createServer,connect} from 'node:net';
import {existsSync} from 'node:fs';
import {businessTargets,businessTarget} from './business-targets.mjs';

export function bridgePlan(name){
 if(name!=='platform')businessTarget(name);
 const outgoing=Object.values(businessTargets).filter(target=>target.name!==name).map(target=>({host:'127.0.0.1',port:target.apiPort,targetHost:target.name,targetPort:target.relayPort}));
 if(name!=='platform')outgoing.push({host:'127.0.0.1',port:4385,targetHost:'platform',targetPort:4385});
 const target=name==='platform'?null:businessTarget(name);
 if(target)outgoing.push({host:'0.0.0.0',port:target.relayPort,targetHost:'127.0.0.1',targetPort:target.apiPort});
 return outgoing;
}
export function startContainerService(name){
 if(process.env.CODESHIP_CONTAINER_MODE!=='1'||!existsSync('/.dockerenv')||process.cwd()!=='/opt/codebiz/apps/'+name)throw Error('Use the approved CodeShip container runtime.');
 const target=name==='platform'?null:businessTarget(name);
 const child=spawn(process.execPath,[name==='automation'?'scripts/runtime.ts':'src/api/server.ts'],{stdio:'inherit',env:{...process.env,...(target?{[target.prefix+'_HOST']:'127.0.0.1',[target.prefix+'_PORT']:String(target.apiPort)}:{})}});
 const sockets=new Set(),servers=[];let stopping=false;
 function stop(signal='SIGTERM'){if(stopping)return;stopping=true;for(const server of servers)server.close();for(const socket of sockets)socket.destroy();child.kill(signal);const deadline=setTimeout(()=>child.kill('SIGKILL'),35000);deadline.unref();}
 for(const route of bridgePlan(name)){
  const server=createConnectionBridge(route,sockets);servers.push(server);server.on('error',()=>{console.error('Application connection bridge could not start.');process.exitCode=1;stop();});server.listen(route.port,route.host);
 }
 child.on('error',()=>{console.error('Application process could not start.');process.exitCode=1;stop();});
 child.on('exit',code=>{const expected=stopping;stop();process.exitCode=process.exitCode||(code??(expected?0:1));});for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>stop(signal));
}
export function createConnectionBridge(route,sockets=new Set()){
 return createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
  const upstream=connect({host:route.targetHost,port:route.targetPort});sockets.add(upstream);upstream.on('close',()=>sockets.delete(upstream));
  socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.pipe(upstream).pipe(socket);
 });
}
