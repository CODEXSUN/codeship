const production=Object.freeze({id:'hostinger-914719',host:'69.62.81.166',stateRoot:'/home/codebiz/.deployment/state',network:'applications_backend',postgresProject:'cxapp-postgres',postgresContainer:'cxapp-postgres',platformContainer:'platform',appContainer:'iilabs',platformPort:14385,appPort:14435,browserOrigins:Object.freeze(['https://iilabs.in','http://127.0.0.1:14435']),publicOrigin:'https://iilabs.in'});
const staging=Object.freeze({id:'ubuntu-staging',host:'192.168.1.34',stateRoot:'/srv/codebiz-staging/state',network:'codebiz-staging_backend',subnet:'172.30.40.0/24',postgresAddress:'172.30.40.2',platformAddress:'172.30.40.10',appAddress:'172.30.40.20',platformPort:14385,appPort:14435,sshPlatformPort:24385,sshAppPort:24435,browserOrigins:Object.freeze(['http://127.0.0.1:14435','http://127.0.0.1:24435']),publicOrigin:undefined});

/** Staging is a separate explicit authority. It never relaxes the production guard. */
export function iilabsTargetProfile({target,platform,hostname,root,stateRoot,uid,user,entry}) {
  if(platform!=='linux'||entry!=='1'||target?.binding!=='127.0.0.1'||target.publicExposure!==false)throw Error('Selected private IILabs target required.');
  if(target.id===production.id){
    if(target.dataPolicy!=='fresh'||hostname!=='srv914719'||uid!==0||root!=='/home/codebiz/devkit/codeship'||stateRoot!==production.stateRoot||target.host!==production.host||target.infraNetwork!=='cxapp-network')throw Error('Production IILabs target identity differs.');
    return production;
  }
  if(target.id===staging.id){
    const ownedRoot=/^\/srv\/codebiz-staging\/operators\/[a-zA-Z0-9._/-]+\/codeship$/.test(root??'')&&!root.split('/').includes('..');
    if(target.dataPolicy!=='synthetic-fresh'||hostname!=='cxserver'||uid!==1000||user!=='cx'||!ownedRoot||stateRoot!==staging.stateRoot||target.host!==staging.host||target.infraNetwork!==staging.network)throw Error('Staging IILabs target identity differs.');
    return staging;
  }
  throw Error('Unsupported IILabs target; no implicit local or remote fallback.');
}

/** Recipe consumed by the owning staged lifecycle; performs no host effects. */
export function iilabsBackendRecipe(profile) {
  if(profile!==production&&profile!==staging)throw Error('Use a validated IILabs target profile.');
  return Object.freeze({target:profile.id,stateRoot:profile.stateRoot,network:profile.network,appContainerPort:4435,hostPort:profile.appPort,loopbackBinding:'127.0.0.1',browserOrigins:profile.browserOrigins,platformOrigin:'http://127.0.0.1:4385',gatewayOrigin:'http://127.0.0.1:4435',appRelayPort:14435,appDatabase:'app_iilabs',runtimeRole:'app_iilabs_runtime',migrationRole:'app_iilabs_migrator',tenantDatabase:'platform_iilabs',tenantRole:'platform_iilabs',tenantCorporateId:'iilabs',realOwnerCredentialsAllowed:profile===production,workerEnabled:false,demoEnabled:false});
}
