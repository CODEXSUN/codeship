import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {appRoot} from '../../../database.ts';
export function keyFile(){return path.resolve(process.env.CODESHIP_VAULT_KEY_FILE??path.join(appRoot,'.codeship/keys/vault.key'));}
export function initializeVault(){const file=keyFile();mkdirSync(path.dirname(file),{recursive:true,mode:0o700});if(!existsSync(file))writeFileSync(file,randomBytes(32),{mode:0o600,flag:'wx'});chmodSync(file,0o600);key();}
function key(){const data=readFileSync(keyFile());if(data.length!==32)throw new Error('Vault key must contain 32 bytes.');return data;}
export function encryptSecrets(id:string,secrets:Record<string,string>){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(id));const ciphertext=Buffer.concat([cipher.update(JSON.stringify(secrets),'utf8'),cipher.final()]);return JSON.stringify({v:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:ciphertext.toString('base64')});}
export function decryptSecrets(id:string,value:string):Record<string,string>{const data=JSON.parse(value);if(data.v!==1)throw new Error('Unsupported vault version.');const cipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(data.iv,'base64'));cipher.setAAD(Buffer.from(id));cipher.setAuthTag(Buffer.from(data.tag,'base64'));return JSON.parse(Buffer.concat([cipher.update(Buffer.from(data.data,'base64')),cipher.final()]).toString('utf8'));}
