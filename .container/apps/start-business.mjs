import {spawn} from 'node:child_process';
import {createServer,connect} from 'node:net';
import {existsSync} from 'node:fs';
import {businessTarget} from './business-targets.mjs';
const target=businessTarget(process.env.CODESHIP_APP_NAME);
if(process.env.CODESHIP_CONTAINER_MODE!=='1'||!existsSync('/.dockerenv')||process.cwd()!=='/opt/codebiz/apps/'+target.name)throw Error('Use the approved CodeShip container runtime.');
// Keep SDK and gateway trust restricted to loopback within Platform's namespace.
// The relay transports bytes only; Host, Origin, session and grants remain app-owned.
const child=spawn(process.execPath,['src/api/server.ts'],{stdio:'inherit',env:{...process.env,[target.prefix+'_HOST']:'127.0.0.1',[target.prefix+'_PORT']:String(target.apiPort)}});
const sockets=new Set();
const relay=createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
 const upstream=connect({host:'127.0.0.1',port:target.apiPort});sockets.add(upstream);upstream.on('close',()=>sockets.delete(upstream));
 socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.pipe(upstream).pipe(socket);
});
let stopping=false;
function stop(signal='SIGTERM'){if(stopping)return;stopping=true;relay.close();for(const socket of sockets)socket.destroy();child.kill(signal);const deadline=setTimeout(()=>child.kill('SIGKILL'),35000);deadline.unref();}
relay.on('error',()=>{console.error('Application relay could not start.');stop();});
child.on('error',()=>{console.error('Application process could not start.');stop();process.exitCode=1;});
child.on('exit',code=>{stop();process.exitCode=code??1;});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>stop(signal));
relay.listen(target.relayPort,'0.0.0.0');
