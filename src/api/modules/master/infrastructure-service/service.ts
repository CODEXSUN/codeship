import {z} from 'zod';
import {isIP} from 'node:net';
import {parseEnv} from 'node:util';
import {infrastructureKinds} from '../../../../../contracts/infrastructure.ts';
export const infrastructureInput=z.object({kind:z.enum(infrastructureKinds),name:z.string().trim().min(1).max(100),version:z.string().max(100),environment:z.enum(['local-docker','vps']),project:z.string().regex(/^[a-z][a-z0-9-]{2,63}$/),host:z.string().max(255),port:z.number().int().min(1).max(65535).nullable(),docker_port:z.number().int().min(1).max(65535).nullable().optional(),binding_mode:z.enum(['local','public','whitelist']).optional(),allowed_ips:z.string().max(4000).optional(),username:z.string().max(100),database:z.string().max(100),storage:z.string().max(1000),notes:z.string().max(3000),revision:z.number().int().min(0).optional(),secrets:z.object({password:z.string().max(8192).optional(),rootPassword:z.string().max(8192).optional(),token:z.string().max(8192).optional(),sshKey:z.string().max(32768).optional(),env:z.string().max(65536).optional()}).strict().optional(),clearSecrets:z.boolean().optional()}).strict().superRefine((v,ctx)=>{if(v.binding_mode&&v.binding_mode!=='local'&&!['postgres','mariadb'].includes(v.kind))ctx.addIssue({code:'custom',message:'External binding is available only for PostgreSQL and MariaDB.'});if(v.binding_mode==='whitelist'){const ips=(v.allowed_ips??'').split(/[\s,]+/).filter(Boolean);if(!ips.length||ips.length>100||ips.some(ip=>!validSource(ip)))ctx.addIssue({code:'custom',message:'Enter up to 100 valid IP addresses or CIDR ranges; unrestricted /0 is not a whitelist.'});}if(v.clearSecrets&&Object.values(v.secrets??{}).some(Boolean))ctx.addIssue({code:'custom',message:'Choose clear or replace credentials.'});});
export function infrastructureEnvironment(row:{kind:string;username:string;database:string;storage:string},secrets:Record<string,string>,purpose:'install'|'maintenance'){
 const values:Record<string,string|undefined>={...parseEnv(secrets.env??'')};
 if(row.kind==='postgres'){if(row.username)values.POSTGRES_USER=row.username;if(row.database)values.POSTGRES_DB=row.database;if(secrets.password)values.POSTGRES_PASSWORD=secrets.password;}
 if(row.kind==='redis'){if(row.username)values.REDIS_USERNAME=row.username;if(secrets.password)values.REDIS_PASSWORD=secrets.password;}
 if(row.kind==='mariadb'){if(row.username)values.MARIADB_USER=row.username;if(row.database)values.MARIADB_DATABASE=row.database;if(secrets.password)values.MARIADB_PASSWORD=secrets.password;if(secrets.rootPassword)values.MARIADB_ROOT_PASSWORD=secrets.rootPassword;else if(row.username==='root'&&secrets.password)values.MARIADB_ROOT_PASSWORD=secrets.password;}
 if(row.kind==='file-manager'){if(row.username)values.MEDIA_ADMIN_USER=row.username;if(secrets.password)values.MEDIA_ADMIN_PASSWORD=secrets.password;if(row.storage)values.MEDIA_APP_VOLUMES=row.storage.replace(/\r?\n/g,',');}
 if(!secrets.password&&!values.POSTGRES_PASSWORD&&!values.REDIS_PASSWORD&&!values.MARIADB_PASSWORD&&!values.MEDIA_ADMIN_PASSWORD&&!values.MARIADB_ROOT_PASSWORD)throw Object.assign(new Error('Save installation credentials before preparing this service.'),{statusCode:409});
 if(purpose==='install'&&row.kind==='mariadb'&&!values.MARIADB_ROOT_PASSWORD)throw Object.assign(new Error('Save the MariaDB root password before preparing installation.'),{statusCode:409});
 return values;
}

export function validSource(source:string){const parts=source.split('/'),family=isIP(parts[0]);if(!family||parts.length>2)return false;if(parts.length===1)return true;return /^\d+$/.test(parts[1])&&Number(parts[1])>=1&&Number(parts[1])<=(family===4?32:128);}
export function infrastructureNetwork(row:{kind:string;port:number|null;docker_port?:number|null;binding_mode?:string;allowed_ips?:string}){
 const mode=row.binding_mode??'local';
 if(mode!=='local'&&!['postgres','mariadb'].includes(row.kind))throw Object.assign(new Error('Unsupported external binding for this service.'),{statusCode:400});
 const allowed=(row.allowed_ips??'').split(/[\s,]+/).filter(Boolean);
 if(mode==='whitelist'&&(!allowed.length||allowed.some(ip=>!validSource(ip))))throw Object.assign(new Error('Whitelist requires valid source addresses.'),{statusCode:400});
 return {mode,hostPort:row.port,containerPort:row.docker_port??({postgres:5432,mariadb:3306,redis:6379,'file-manager':8080} as Record<string,number>)[row.kind],bindAddress:mode==='public'?'0.0.0.0':'127.0.0.1',allowedSources:mode==='whitelist'?allowed:[],requiresFirewall:mode==='whitelist',externalBindingActive:false};
}
