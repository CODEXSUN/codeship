// Synthetic operator registry: never reads any developer .env, database or key.
import fs from 'node:fs';import path from 'node:path';
import {openDatabase,appRoot} from '../../src/api/database.ts';
import {migrator} from '../../scripts/database.ts';
import {initializeVault} from '../../src/api/modules/master/application/vault.ts';
import {infrastructureRepository} from '../../src/api/modules/master/infrastructure-service/repository.ts';
import {applicationRepository} from '../../src/api/modules/master/application/repository.ts';
import {platformRegistration} from '../apps/platform-registration.ts';
import {serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
if(process.env.CODESHIP_DISPOSABLE_PLATFORM_TEST!=='1'||process.platform!=='linux'||appRoot!=='/home/codebiz/devkit/codeship/'||!fs.existsSync('/.dockerenv')||!/^platform-lifecycle-[a-f0-9]{8}$/.test(process.env.CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN??'')||fs.readFileSync('/.codeship-disposable-platform-test','utf8')!==process.env.CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN)throw Error('Disposable fixture target differs');
const state=path.join(appRoot,'.codeship'),privateRoot=path.join(state,'apps/platform/private');fs.mkdirSync(privateRoot,{recursive:true,mode:0o700});
initializeVault();const {db,schema}=openDatabase();
const mode=process.argv[2]??'prepare';if(!['prepare','--gateway-invalid','--gateway-valid'].includes(mode))throw Error('Unknown disposable registry fixture mode');
const env={NODE_ENV:'production',PLATFORM_MASTER_DATABASE_URL:'postgresql://platform_service:disposable-platform-only@postgres:5432/platform_master?sslmode=disable',PLATFORM_TENANT_DATABASE_URL:'postgresql://platform_service:disposable-platform-only@postgres:5432/platform_codexsun?sslmode=disable',PLATFORM_BIND_MODE:'docker-direct',PLATFORM_WEB_ORIGIN:'https://cx.example.test',PLATFORM_BROWSER_ORIGINS:'["https://cx.example.test"]',PLATFORM_INSTALL_DOMAINS:'["cx.example.test"]',PLATFORM_GATEWAY_ALLOWED_ORIGINS:'["http://127.0.0.1:4345"]',PLATFORM_TENANCY_MODE:'multi',PLATFORM_REQUIRE_PASSWORD_CHANGE:'0',PLATFORM_ENTRY_BINDINGS:'[]'};
try{
 const result=await migrator(db,schema).migrateToLatest();if(result.error)throw result.error;
 if(mode!=='prepare'){
  const row=await db.selectFrom('applications').selectAll().where('owner','=','apps/platform').executeTakeFirstOrThrow();if(mode==='--gateway-invalid')env.PLATFORM_GATEWAY_ALLOWED_ORIGINS='[]';await applicationRepository(db).save({...platformRegistration(env,row.version),secretRevision:row.secret_revision},row.public_id);fs.writeFileSync(path.join(privateRoot,'runtime.env'),serializeDeploymentEnvironment(env),{mode:0o600});
 }else{
 await infrastructureRepository(db).save({kind:'postgres',name:'Disposable PostgreSQL',version:'postgres:18.7-alpine',environment:'local-docker',project:'cxapp-postgres',host:'127.0.0.1',port:5433,docker_port:5432,binding_mode:'local',username:'postgres',database:'postgres',storage:'',notes:'Disposable fixture only',secrets:{password:'disposable-admin-only'}});
 await applicationRepository(db).save(platformRegistration(env,process.env.CODESHIP_FIXTURE_PLATFORM_VERSION));
 fs.writeFileSync(path.join(privateRoot,'runtime.env'),serializeDeploymentEnvironment(env),{mode:0o600});
 fs.writeFileSync(path.join(state,'target.json'),JSON.stringify({id:'hostinger-914719',host:'69.62.81.166',operator:'/home/codebiz/.deployment/operators/v-1.0.21/devkit/codeship',binding:'127.0.0.1',publicExposure:false,dataPolicy:'fresh',infraNetwork:'cxapp-network'}),{mode:0o600});
 fs.mkdirSync(path.join(state,'devkits'),{recursive:true});fs.writeFileSync(path.join(state,'devkits/state.json'),JSON.stringify({project:'devkits',services:{codeship:{image:process.env.CODESHIP_FIXTURE_OPERATOR_IMAGE}}}),{mode:0o600});
 }
}finally{await db.destroy();}
