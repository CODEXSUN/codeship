import {isIP} from 'node:net';
/** Stable, independently owned endpoints on the existing application bridge. */
export function platformDevkitNetwork(network){
 if(network.Name!=='applications_backend'||network.Labels?.['io.codebiz.owner']!=='codeship')throw Error('Use the verified application bridge.');
 const config=network.IPAM?.Config?.find(row=>isIP(row.Gateway??'')===4),match=/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/.exec(config?.Subnet??'');
 if(!match||+match[5]>26||+match[5]<8)throw Error('Application bridge has insufficient reserved devkit addresses.');
 const base=match.slice(1,5).reduce((value,part)=>value*256n+BigInt(part),0n);
 const address=offset=>[24n,16n,8n,0n].map(shift=>Number(((base+BigInt(offset))>>shift)&255n)).join('.');
 const addresses={codeship:address(50),codeitz:address(51),uiux:address(52)},platform=address(10);
 for(const endpoint of Object.values(network.Containers??{})){
  const reserved=Object.entries(addresses).find(([,value])=>value===endpoint.IPv4Address?.split('/')[0]);
  if(reserved&&endpoint.Name!==reserved[0])throw Error('Reserved devkit address belongs to another container.');
 }
 return {name:network.Name,platform,gateway:config.Gateway,addresses,peers:[platform,...Object.values(addresses)].join(',')};
}
