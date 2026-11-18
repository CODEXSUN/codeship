import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {openDatabase,appRoot} from '../../src/api/database.ts';
import {decryptSecrets} from '../../src/api/modules/master/application/vault.ts';

// Only CodeShip provisions the worker's private Redis account and network attachment.
export async function prepareAutomationRedis(env:Record<string,string>, docker:(args:string[],input?:string)=>string, persist:()=>Promise<void>) {
  const tenant=env.AUTOMATION_PLATFORM_TENANT_ID;
  if(!/^[a-z0-9]{8}$/.test(tenant??''))throw Error('Automation worker requires its admitted tenant binding.');
  const namespace='automation-production-'+tenant, username='automation-'+tenant;
  let password:string;
  if(env.AUTOMATION_REDIS_URL){const saved=new URL(env.AUTOMATION_REDIS_URL);if(saved.hostname!=='redis'||saved.username!==username||!/^\w{64}$/.test(saved.password))throw Error('Review existing Automation Redis identity.');password=saved.password;}
  else password=randomBytes(32).toString('hex');
  env.AUTOMATION_QUEUE_NAMESPACE=namespace;
  env.AUTOMATION_REDIS_URL=`redis://${username}:${password}@redis:6379`;
  await persist(); // Recovery credential is durable before ACL effects.
  const {db}=openDatabase();let admin='';
  try{const rows=await db.selectFrom('infrastructure_services').selectAll().where('kind','=','redis').where('environment','=','local-docker').execute();if(rows.length!==1)throw Error('Resolve one Redis infrastructure record.');const row=rows[0];admin=decryptSecrets(row.public_id,row.encrypted_secrets!).password;}finally{await db.destroy();}
  if(!admin)throw Error('Redis maintenance credential is unavailable.');
  const mounts=JSON.parse(docker(['inspect','codebiz-infra-redis-1','--format','{{json .Mounts}}']));
  const source=mounts.find((m:any)=>m.Destination==='/run/secrets/users.acl')?.Source;
  if(!source)throw Error('Redis must use the registered persistent ACL file.');
  const aclFile=await realpath(source),allowed=await realpath(path.join(appRoot,'.codeship'));
  if(!aclFile.startsWith(allowed+path.sep))throw Error('Redis ACL source is outside CodeShip private storage.');
  const existing=await readFile(aclFile,'utf8');
  const restrictions=['+@all','-acl','-config','-flushall','-flushdb','-shutdown','-module','-debug','-replicaof','-slaveof','-save','-bgsave','-bgrewriteaof','-swapdb','-migrate','-restore','-keys','-scan','-randomkey','-dbsize','-function'];
  const line=`user ${username} on #${createHash('sha256').update(password).digest('hex')} ~codebiz:${namespace}:* &codebiz:${namespace}:* ${restrictions.join(' ')}`;
  await writeFile(aclFile,existing.split(/\r?\n/).filter(row=>row&&!row.startsWith('user '+username+' ')).concat(line,'').join('\n'),{mode:0o600});
  const resp=(args:string[])=>'*'+args.length+'\r\n'+args.map(v=>'$'+Buffer.byteLength(v)+'\r\n'+v+'\r\n').join('');
  const payload=resp(['AUTH',admin])+resp(['ACL','SETUSER',username,'on','>'+password,'resetkeys','~codebiz:'+namespace+':*','resetchannels','&codebiz:'+namespace+':*',...restrictions]);
  const result=docker(['exec','-i','codebiz-infra-redis-1','redis-cli','--pipe'],payload);
  if(!/errors: 0/.test(result))throw Error('Scoped Redis account preparation failed.');
  const network=JSON.parse(docker(['network','inspect','applications_backend']))[0];
  const redis=docker(['inspect','codebiz-infra-redis-1','--format','{{.Id}}']);
  if(!Object.hasOwn(network.Containers??{},redis))docker(['network','connect','--alias','redis','applications_backend',redis]);
}
