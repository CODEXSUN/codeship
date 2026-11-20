const registration=['tenants','tenant_databases'];
const legacy=['users','user_credentials','platform_operators','tenants','tenant_memberships','tenant_databases'];
const tenant=['users','user_credentials','roles','user_roles','user_app_grants','app_roles','app_role_grants','app_user_roles'];
const exact=(actual,expected)=>actual.length===expected.length&&actual.every(key=>expected.includes(key));
/** Adapt only the private installation payload. The original source and live data remain untouched. */
export function platformIdentityInstallPayload(source,masterIdentityRetired){
 if(!source||source.schema!==1||!exact(Object.keys(source),['schema','master','tenant'])||!source.master||!source.tenant||!exact(Object.keys(source.tenant),tenant)||![registration,legacy].some(keys=>exact(Object.keys(source.master),keys))||Object.values(source.master).some(rows=>!Array.isArray(rows)||rows.length>1000)||Object.values(source.tenant).some(rows=>!Array.isArray(rows)||rows.length>1000)||JSON.stringify(source).length>1048576)throw Error('Only the approved bounded identity installation tables are accepted');
 if(typeof masterIdentityRetired!=='boolean'||!masterIdentityRetired&&!exact(Object.keys(source.master),legacy))throw Error('Installation identity protocol differs from the approved release');
 const payload=structuredClone(source);
 if(masterIdentityRetired)payload.master=Object.fromEntries(registration.map(table=>[table,payload.master[table]]));
 return payload;
}
