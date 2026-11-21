import {isIP} from 'node:net';

const publicHosts=['cx.codexsun.com','codeship.codexsun.com','codeitz.codexsun.com','uiux.codexsun.com'];
/** Pure selected transform. No existing host, bridge or secret is removed. */
export function iilabsPlatformEnvironment(environment,{tenantConnection,address}){
  if(!environment||!['single','multi'].includes(environment.PLATFORM_TENANCY_MODE)||environment.PLATFORM_TENANCY_MODE==='single'&&environment.PLATFORM_SINGLE_TENANT_CORPORATE_ID!=='codexsun')throw Error('Review the existing Platform tenancy configuration before IILabs installation.');
  const url=new URL(tenantConnection);
  if(url.hostname!=='postgres'||url.port!=='5432'||url.pathname!=='/platform_iilabs'||url.username!=='platform_iilabs'||!url.password||url.hash||url.search||!['postgres:','postgresql:'].includes(url.protocol))throw Error('Selected IILabs tenant connection differs.');
  if(isIP(address)!==4||!(/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(address)))throw Error('Selected IILabs peer must be its reserved private network address.');
  const list=key=>{const rows=JSON.parse(environment[key]??'[]');if(!Array.isArray(rows)||rows.some(v=>typeof v!=='string'))throw Error('Invalid existing Platform origin configuration.');return rows;};
  const origins=list('PLATFORM_BROWSER_ORIGINS'),gateway=list('PLATFORM_GATEWAY_ALLOWED_ORIGINS');
  if(publicHosts.some(host=>!origins.includes('https://'+host)))throw Error('Expected existing public Platform hosts are missing; do not replace configuration.');
  if(environment.PLATFORM_TENANT_IILABS_DATABASE_URL&&environment.PLATFORM_TENANT_IILABS_DATABASE_URL!==tenantConnection)throw Error('Existing IILabs connection differs; refusing rotation.');
  return {...environment,PLATFORM_TENANCY_MODE:'multi',PLATFORM_TENANT_IILABS_DATABASE_URL:tenantConnection,
    PLATFORM_BROWSER_ORIGINS:JSON.stringify([...new Set([...origins,'https://iilabs.in'])]),
    PLATFORM_GATEWAY_ALLOWED_ORIGINS:JSON.stringify([...new Set([...gateway,'http://127.0.0.1:4435'])]),
    PLATFORM_DOCKER_PEERS:[...new Set([...(environment.PLATFORM_DOCKER_PEERS??'').split(',').filter(Boolean),address])].join(',')};
}

/** Existing public bindings are a prerequisite, never fabricated by installation. */
export function verifyExistingPlatformHosts(rows){
  if(!Array.isArray(rows)||publicHosts.some(host=>{
    const matches=rows.filter(row=>row.hostname===host);
    return matches.length!==1||matches[0].verification_status!=='verified'||matches[0].active!==true||matches[0].tenant_code!=='codexsun';
  }))throw Error('Existing public tenant bindings must remain verified and owned by Codexsun.');
  return true;
}
