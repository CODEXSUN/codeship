/** Production settings must satisfy the immutable release's strict startup policy. */
export function securePlatformRuntime(environment, webPort, version='1.0.6') {
 if(!Number.isSafeInteger(webPort)||webPort<1||webPort>65535)throw Error('Invalid Platform web port.');
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Review the Platform release version.');
 const [major,minor,patch]=version.split('.').map(Number);
 const optionalPasswordPolicy=major>1||major===1&&(minor>0||minor===0&&patch>=7);
 const passwordPolicy=optionalPasswordPolicy?(environment.PLATFORM_REQUIRE_PASSWORD_CHANGE??'0'):'1';
 if(!['0','1'].includes(passwordPolicy))throw Error('Invalid Platform password policy.');
 return {...environment,NODE_ENV:'production',PLATFORM_BIND_MODE:'docker-direct',PLATFORM_GATEWAY_ENABLED:'1',
  PLATFORM_DEV_AUTO_LOGIN:'0',PLATFORM_DEV_MASTER_FRESH:'0',PLATFORM_DEV_TENANT_FRESH:'0',
  PLATFORM_DEV_MASTER_SEED:'0',PLATFORM_DEV_TENANT_SEED:'0',PLATFORM_REQUIRE_PASSWORD_CHANGE:passwordPolicy,
  PLATFORM_WEB_PORT:String(webPort),PLATFORM_WEB_ORIGIN:environment.PLATFORM_BROWSER_ORIGINS&&environment.PLATFORM_WEB_ORIGIN?.startsWith('https://')?environment.PLATFORM_WEB_ORIGIN:'http://127.0.0.1:'+webPort};
}
