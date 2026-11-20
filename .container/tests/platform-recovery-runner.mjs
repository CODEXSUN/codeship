// Test transport around the real released lifecycle/recovery IPC implementation.
import fs from 'node:fs';import readline from 'node:readline';
import {runLifecycleWithRecovery} from '../hostinger/recovery-channel.mjs';
import {appRoot} from '../../src/api/database.ts';
if(process.env.CODESHIP_DISPOSABLE_PLATFORM_TEST!=='1'||appRoot!=='/home/codebiz/devkit/codeship/'||!fs.existsSync('/.dockerenv')||!/^platform-lifecycle-[a-f0-9]{8}$/.test(process.env.CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN??'')||fs.readFileSync('/.codeship-disposable-platform-test','utf8')!==process.env.CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN)throw Error('Only the isolated disposable test fixture may use this transport');
const [mode,file]=process.argv.slice(2);if(!['setup','update'].includes(mode)||!file?.startsWith('.codeship/'))throw Error('Use selected fixture setup/update and private approved set');
const set=JSON.parse(fs.readFileSync(file)),manifest=set.services?.platform;if(!manifest)throw Error('Approved Platform fixture release missing');
const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity}),iterator=lines[Symbol.asyncIterator]();
try{
 await runLifecycleWithRecovery({name:'platform',root:appRoot,releaseSetFile:file,ticket:{action:mode,manifest,tooling:{version:'0.0.0',tag:'disposable-source-fixture',commit:'0'.repeat(40)}},env:{...process.env,CODESHIP_APP_SCRIPT_ENTRY:'1',CODESHIP_RELEASED_UPDATE_ENTRY:'1',CODESHIP_EXECUTION_MODE:'inventory'},approve:async request=>{
  console.log('CODESHIP_TEST_RECOVERY:'+JSON.stringify(request));
  let timer;try{const next=await Promise.race([iterator.next(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Disposable local restore approval timed out')),10*60*1000);})]);if(next.done||next.value.length>8192)throw Error('Independent local restore approval missing');const proof=JSON.parse(next.value);if(proof.id!==request.id)throw Error('Recovery proof scope differs');return proof;}finally{clearTimeout(timer);}
 }});
}finally{lines.close();process.stdin.pause();}
