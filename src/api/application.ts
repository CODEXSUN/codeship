import {readFileSync} from 'node:fs';
import {devkitTransport,registerPlatformDevkit} from '@workspace/sdk/platform-devkit';
import {createHttpServer,requireLocalRequest,registerApiDocumentation,registerFrontend} from '@workspace/framework';
import path from 'node:path';
import {ZodError} from 'zod';
import {appRoot} from './database.ts';
import type {Database} from './identity.ts';
import {deploymentService} from './modules/business/deployment/service.ts';
import {monitorService} from './modules/business/monitor/service.ts';
import {registerTargetRoutes} from './modules/master/deployment-target/routes.ts';
import {registerDeploymentRoutes} from './modules/business/deployment/routes.ts';
import {registerMonitorRoutes} from './modules/business/monitor/routes.ts';
import {registerApplicationRoutes} from './modules/master/application/routes.ts';
import {registerInfrastructureRoutes} from './modules/master/infrastructure-service/routes.ts';
import {specification} from './openapi.ts';
import {codeshipAccessPolicy} from './local-access.ts';
export function createApplication(db:Database){
 const appVersion=JSON.parse(readFileSync(path.join(appRoot,'package.json'),'utf8')).version;
 const app=createHttpServer({name:'codeship',readinessChecks:[async()=>{await Promise.all([db.selectFrom('infrastructure_services').select('id').limit(1).execute(),db.selectFrom('deployment_targets').select('id').limit(1).execute(),db.selectFrom('deployment_runs').select('id').limit(1).execute(),db.selectFrom('observations').select('id').limit(1).execute(),db.selectFrom('incidents').select('id').limit(1).execute()]);return true;}]}),deployments=deploymentService(db),monitor=monitorService(db,undefined,deployments.repo.maintenanceTargets);
 const nativeAccess=codeshipAccessPolicy(process.env.CODESHIP_BIND_MODE==='docker-direct'?(process.env.CODESHIP_DOCKER_PEERS??'').split(',').filter(Boolean):[]);
 const platformEnabled=process.env.CODESHIP_PLATFORM_AUTH==='1';
 const localAccess=platformEnabled?devkitTransport(nativeAccess,process.env,'CODESHIP','codeship',4350):nativeAccess;
 app.addHook('onRequest',localAccess);
 app.get('/api/platform-configuration',async()=>({enabled:platformEnabled}));
 if(platformEnabled)registerPlatformDevkit(app,process.env,'CODESHIP','codeship',{version:appVersion});
 // Keep shared documentation rendering, using this app's transport policy for its local-only routes.
 app.addHook('onRoute',route=>{if(['/api/docs','/api/openapi.json'].includes(route.url))route.preHandler=localAccess;});
 app.get('/api/v1/capabilities',async()=>({execution:process.env.CODESHIP_EXECUTION_MODE!=='inventory',mode:process.env.CODESHIP_EXECUTION_MODE==='inventory'?'inventory':'local-operator'}));
 app.setErrorHandler((error,request,reply)=>{const e=error as {statusCode?:number};if(error instanceof ZodError)return reply.code(400).send({message:'Provide valid operation fields.'});if(e.statusCode&&e.statusCode>=400&&e.statusCode<500)return reply.code(e.statusCode).send({message:(error as Error).message});return reply.code(500).send({message:'Codeship could not complete this request. Check the deployment configuration and database.'});});
 registerInfrastructureRoutes(app,db);registerApplicationRoutes(app,db);registerTargetRoutes(app,db);registerDeploymentRoutes(app,deployments);registerMonitorRoutes(app,monitor);registerApiDocumentation(app,specification);registerFrontend(app,path.join(appRoot,'dist/web'));
 return {app,deployments,monitor};
}
