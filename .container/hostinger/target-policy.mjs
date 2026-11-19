export function hostingerTargetPolicy({target,platform,hostname,appRoot,mode,prior,selected}) {
 if(!target||target.id!=='hostinger-914719')return false;
 if(platform!=='linux'||hostname!=='srv914719'||target.host!=='69.62.81.166'||target.operator!==appRoot.replace(/[\\/]$/,'')||!target.operator.startsWith('/home/codebiz/.deployment/operators/')||target.binding!=='127.0.0.1'||target.publicExposure!==false||target.dataPolicy!=='fresh'||target.infraNetwork!=='cxapp-network')throw Error('Hostinger private target identity mismatch');
 if(selected.length!==1)throw Error('Hostinger operations select exactly one service');
 if(process.env.CODESHIP_HOSTINGER_FLOCK!=='1')throw Error('Use Hostinger setup/update wrapper with exclusive cxapp flock');
 return mode==='setup'&&!prior&&selected[0]==='codeship';
}
