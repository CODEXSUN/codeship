export function freshUbuntuSetup({target,platform,hostname,appRoot,mode,prior,selected}){
 if(!target)return false;
 if(platform!=='linux'||target.id!=='ubuntu-lan'||target.hostname!==hostname||target.operator!==appRoot.replace(/[\\/]$/,'')||target.binding!=='127.0.0.1'||target.publicExposure!==false)throw Error('Ubuntu deployment target identity or private policy mismatch');
 return target.dataPolicy==='fresh'&&mode==='setup'&&!prior&&selected.length===1&&selected[0]==='codeship';
}
