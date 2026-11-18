export const platformDatabaseRole='platform_service';
export function platformDatabaseScopes(values,registrations) {
 const source=(key,name)=>{
  const value=values[key];if(!value)throw new Error('Native Platform database setting missing.');
  const url=new URL(value);
  if(!['postgres:','postgresql:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.pathname!=='/'+name)throw new Error('Platform import requires the exact registered native database.');
  return value;
 };
 const scopes=[{key:'PLATFORM_MASTER_DATABASE_URL',name:'platform_master',sourceName:'cx_master_db',source:source('PLATFORM_MASTER_DATABASE_URL','cx_master_db')}];
 for(const row of registrations){
  if(!/^env:PLATFORM_TENANT(?:_[A-Z0-9]+)*_DATABASE_URL$/.test(row.connection_secret_ref)||!/^[_a-z][_a-z0-9]{0,62}$/.test(row.database_name))throw new Error('Unsupported native tenant database mapping.');
  const key=row.connection_secret_ref.slice(4);scopes.push({key,name:'platform_'+row.database_name.replace(/_db$/,''),sourceName:row.database_name,source:source(key,row.database_name)});
 }
 if(scopes.some(scope=>!/^[_a-z][_a-z0-9]{0,62}$/.test(scope.name))||new Set(scopes.map(scope=>scope.name)).size!==scopes.length)throw new Error('Ambiguous isolated Platform database names.');
 return scopes;
}
