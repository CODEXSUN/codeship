export function requireIilabsUbuntuTarget(target,{platform,hostname,appRoot,stateRoot}){
 if(platform!=='linux'||hostname!=='cxserver'||target?.id!=='ubuntu-lan'||target.host!=='192.168.1.34'||target.hostname!==hostname||target.operator!==appRoot.replace(/[\\/]$/,'')||target.root!=='/srv/codebiz'||target.state!==stateRoot||stateRoot!=='/srv/codebiz/state'||target.lock!==stateRoot+'/devkits/operation.lock'||target.dataPolicy!=='fresh'||target.binding!=='127.0.0.1'||target.publicExposure!==false)throw Error('IILabs requires the approved private fresh Ubuntu target.');
}
