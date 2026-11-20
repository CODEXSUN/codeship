export function hostingerTargetPolicy({target,platform,hostname,appRoot,mode,prior,selected}) {
 if(!target||target.id!=='hostinger-914719')return false;
 const current=appRoot.replace(/[\\/]$/,'');
 const legacy=target.operator===current&&target.operator.startsWith('/home/codebiz/.deployment/operators/');
 const released=process.env.CODESHIP_RELEASED_UPDATE_ENTRY==='1'&&current==='/home/codebiz/devkit/codeship'&&target.operator==='/home/codebiz/.deployment/operators/v-1.0.21/devkit/codeship';
 if(platform!=='linux'||hostname!=='srv914719'||target.host!=='69.62.81.166'||!legacy&&!released||target.binding!=='127.0.0.1'||target.publicExposure!==false||target.dataPolicy!=='fresh'||target.infraNetwork!=='cxapp-network')throw Error('Hostinger private target identity mismatch');
 if(selected.length!==1)throw Error('Hostinger operations select exactly one service');
 return mode==='setup'&&!prior&&selected[0]==='codeship';
}
