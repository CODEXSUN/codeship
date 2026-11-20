import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const [mode,...args]=process.argv.slice(2);if(!['setup','update','verify'].includes(mode))throw new Error('Use setup, update or verify.');
const root=fileURLToPath(new URL('../',import.meta.url));
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'sh';
const result=spawnSync(bash,[path.join(root,'.container',mode+'.sh'),...args],{cwd:root,stdio:'inherit',windowsHide:true});
if(result.error)throw new Error('Install a POSIX shell to run the deployment scripts.');process.exitCode=result.status??1;
