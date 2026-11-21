export function validateIilabsRecovery(value){
  const scope=value?.scope,database=scope==='master'?'platform_master':scope==='app'?'app_iilabs':null;
  const base='/home/codebiz/.deployment/state/apps/iilabs/private/';
  const name=String(value?.file??'').slice(base.length);
  if(value?.service!=='iilabs'||value.kind!=='postgresql'||!database||value.database!==database||!String(value.file).startsWith(base)||!new RegExp('^'+scope+'-before-[0-9TZ.\\-]+[.]dump$').test(name)||!/^[a-f0-9]{64}$/.test(value.sha256??''))throw Error('IILabs recovery must match its selected master or app archive.');
  return base;
}
