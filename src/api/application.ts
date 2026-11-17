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
import {specification} from './openapi.ts';
export function createApplication(db:Database){
 const app=createHttpServer({name:'codeship',readinessChecks:[async()=>{await Promise.all([db.selectFrom('deployment_targets').select('id').limit(1).execute(),db.selectFrom('deployment_runs').select('id').limit(1).execute(),db.selectFrom('observations').select('id').limit(1).execute(),db.selectFrom('incidents').select('id').limit(1).execute()]);return true;}]}),deployments=deploymentService(db),monitor=monitorService(db,undefined,deployments.repo.maintenanceTargets);
 app.addHook('onRequest',requireLocalRequest);
 app.setErrorHandler((error,request,reply)=>{const e=error as {statusCode?:number};if(error instanceof ZodError)return reply.code(400).send({message:'Provide valid operation fields.'});if(e.statusCode&&e.statusCode>=400&&e.statusCode<500)return reply.code(e.statusCode).send({message:(error as Error).message});return reply.code(500).send({message:'Codeship could not complete this request. Check the deployment configuration and database.'});});
 registerTargetRoutes(app,db);registerDeploymentRoutes(app,deployments);registerMonitorRoutes(app,monitor);registerApiDocumentation(app,specification);registerFrontend(app,path.join(appRoot,'dist/web'));
 return {app,deployments,monitor};
}
