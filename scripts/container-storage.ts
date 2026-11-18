type Mount={Type:string;Name?:string;Source:string;Destination:string};
type Measured={path:string;bytes:number;device:string};
export function parseDu(output:string){
 const match=output.trim().match(/^(\d+)\s/);const value=match?Number(match[1])*1024:NaN;
 if(!Number.isSafeInteger(value)||value<0)throw new Error('Disk usage unavailable.');return value;
}
/** du -x includes nested mounts only when their device matches the parent. */
export function mountedBytes(entries:Measured[]){
 return entries.reduce((sum,parent)=>{
  const children=entries.filter(child=>child.path!==parent.path&&child.path.startsWith(parent.path.replace(/\/$/,'')+'/'));
  const immediate=children.filter(child=>!children.some(other=>other.path!==child.path&&child.path.startsWith(other.path.replace(/\/$/,'')+'/')));
  const own=parent.bytes-immediate.filter(child=>child.device===parent.device).reduce((n,child)=>n+child.bytes,0);
  if(own<0)throw new Error('Disk contents changed during measurement.');return sum+own;
 },0);
}
export async function containerStorage(id:string,running:boolean,run:(args:string[])=>Promise<string>){
 let writableBytes:number|null=null,volumeBytes:number|null=null;
 try{const value=Number((await run(['inspect','--size','--format','{{.SizeRw}}',id])).trim());if(Number.isSafeInteger(value)&&value>=0)writableBytes=value;}catch{}
 try{
  const mounts:Mount[]=JSON.parse(await run(['inspect','--format','{{json .Mounts}}',id]));
  const persistent=mounts.filter(m=>['volume','bind'].includes(m.Type));
  if(persistent.length&&!running)throw new Error('Mounted data requires a running container.');
  const entries=await Promise.all(persistent.map(async mount=>{
   if(!mount.Destination.startsWith('/')||mount.Destination.includes('\0'))throw new Error('Invalid mount.');
   const inspectPath=async(command:string[])=>{try{return await run(['exec',id,...command]);}catch{return run(['exec','--user','0',id,...command]);}};
   const bytes=parseDu(await inspectPath(['du','-skx','--',mount.Destination]));
   const device=(await inspectPath(['stat','-c','%d','--',mount.Destination])).trim();
   if(!/^\d+$/.test(device))throw new Error('Mount device unavailable.');return {path:mount.Destination,bytes,device};
  }));
  volumeBytes=mountedBytes(entries);
 }catch{}
 return {writableBytes,volumeBytes,storageBytes:writableBytes!==null&&volumeBytes!==null?writableBytes+volumeBytes:null,storageMeasuredAt:new Date().toISOString()};
}
