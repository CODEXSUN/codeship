import {readFileSync} from 'node:fs';
import path from 'node:path';

export const platformTarget=Object.freeze({port:14385,apiPort:4385});
export function platformPasswordChangeRequired(version){
 const parts=/^(\d+)\.(\d+)\.(\d+)$/.exec(version)?.slice(1).map(Number);
 if(!parts||parts.some(part=>!Number.isSafeInteger(part)))throw Error('Invalid Platform release version.');
 return parts[0]>1||parts[0]===1&&(parts[1]>0||parts[2]>=7)?'0':'1';
}
export function installedCodeshipOrigin(root){
 const definition=JSON.parse(readFileSync(path.join(root,'.codeship/devkits/compose.json'),'utf8'));
 const ports=definition.services?.codeship?.ports;
 if(!Array.isArray(ports)||ports.length!==1)throw Error('Resolve the installed CodeShip loopback binding.');
 const match=/^127\.0\.0\.1:([0-9]{1,5}):4350$/.exec(ports[0]);
 if(!match||Number(match[1])<1||Number(match[1])>65535)throw Error('Invalid installed CodeShip binding.');
 return 'http://127.0.0.1:'+match[1];
}
