import {startupBudget} from './startup-budget.mjs';
import {createRequire,findPackageJSON} from 'node:module';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createServer,connect,isIP} from 'node:net';
import {existsSync} from 'node:fs';
import {businessTargets,businessTarget} from './business-targets.mjs';

export function bridgePlan(name,containerAddress){
 if(name!=='platform')businessTarget(name);
 const outgoing=Object.values(businessTargets).filter(target=>target.name!==name).map(target=>({host:'127.0.0.1',port:target.apiPort,targetHost:target.name,targetPort:target.relayPort}));
 if(name!=='platform')outgoing.push({host:'127.0.0.1',port:4385,targetHost:'platform',targetPort:4385});
 const target=name==='platform'?null:businessTarget(name);
 if(target)outgoing.push({host:'0.0.0.0',port:target.relayPort,targetHost:'127.0.0.1',targetPort:target.apiPort});
 // Keep the established private relay for existing Platform/app containers.
 // Billing's requested public container port binds only its reserved bridge IP,
 // alongside the authenticated API on loopback at the same numeric port.
 if(target&&target.publishedContainerPort!==target.relayPort){
  if(isIP(containerAddress??'')!==4||containerAddress==='0.0.0.0'||containerAddress.startsWith('127.'))throw Error('Billing ingress requires its reserved private container address.');
  outgoing.push({host:containerAddress,port:target.publishedContainerPort,targetHost:'127.0.0.1',targetPort:target.apiPort});
 }
 return outgoing;
}
export async function startContainerService(name){
 if(process.env.CODESHIP_CONTAINER_MODE!=='1'||!existsSync('/.dockerenv')||process.cwd()!=='/opt/codebiz/apps/'+name)throw Error('Use the approved CodeShip container runtime.');
 const target=name==='platform'?null:businessTarget(name);
 const startup=new AbortController();
 const cancel=()=>startup.abort();
 process.once('SIGTERM',cancel);process.once('SIGINT',cancel);
 try{await waitForDatabaseDependencies(process.env,{signal:startup.signal});}
 catch{console.error('Container database dependencies did not become ready within the startup budget.');process.exitCode=1;return;}
 finally{process.removeListener('SIGTERM',cancel);process.removeListener('SIGINT',cancel);}
 const child=spawn(process.execPath,[name==='automation'?'scripts/runtime.ts':'src/api/server.ts'],{stdio:'inherit',env:{...process.env,...(target?{[target.prefix+'_HOST']:'127.0.0.1',[target.prefix+'_PORT']:String(target.apiPort)}:{})}});
 const sockets=new Set(),servers=[];let stopping=false;
  function stop(signal='SIGTERM'){if(stopping)return;stopping=true;for(const server of servers)server.close();for(const socket of sockets)socket.destroy();child.kill(signal);const deadline=setTimeout(()=>child.kill('SIGKILL'),name==='automation'?110000:35000);deadline.unref();}
 for(const route of bridgePlan(name,process.env.CODESHIP_CONTAINER_ADDRESS)){
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

// Read-only startup gate; explicit migration commands remain operator-owned.
export function transientDatabaseStartup(error){
 return ['57P03','ECONNREFUSED','ECONNRESET','ETIMEDOUT','08006'].includes(error?.code);
}
export async function waitForDatabaseDependencies(environment,options={}){
 const urls=[...new Set(Object.entries(environment).filter(([key,value])=>/DATABASE_URL$/.test(key)&&/^postgres(?:ql)?:/.test(value??'')).map(([,value])=>value))];
 if(!urls.length)return;
 const require=createRequire(process.cwd()+'/package.json');const {Client}=require('pg');const packageFile=findPackageJSON('@workspace/framework',pathToFileURL(process.cwd()+'/package.json'));
 const contract=JSON.parse(readFileSync(packageFile,'utf8'));
 const {waitForReadiness}=await import(new URL(contract.exports['.'].import,pathToFileURL(packageFile)));
 if(typeof waitForReadiness!=='function')throw Error('Pin the released framework readiness helper.');
 await waitForReadiness(async signal=>{
  const timeout=3000;
  // Parallel probes keep a complete sweep within the per-attempt budget.
  const results=await Promise.allSettled(urls.map(async connectionString=>{
   const client=new Client({connectionString,connectionTimeoutMillis:timeout,query_timeout:timeout,statement_timeout:timeout});
   try{await client.connect();await client.query('SELECT 1');}finally{await client.end().catch(()=>{});}
  }));
  const failed=results.filter(result=>result.status==='rejected');
  const fatal=failed.find(result=>!transientDatabaseStartup(result.reason));
  if(fatal)throw fatal.reason;if(failed.length)throw failed[0].reason;
  signal.throwIfAborted();return true;
 },{timeoutMs:startupBudget.dependencyMs,maxAttempts:70,initialDelayMs:500,maxDelayMs:5000,retryOnError:transientDatabaseStartup,...options});
}
