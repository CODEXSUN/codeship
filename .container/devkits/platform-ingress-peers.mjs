import {isIP} from 'node:net';
/** A multi-network connector may reach Codeitz through either shared bridge. */
export function platformIngressPeers(defaultNetwork,infraNetwork,name){
 if(defaultNetwork.Name!=='devkits_default'||infraNetwork.Name!=='cxapp-network'||!['codeship','codeitz','uiux'].includes(name))throw Error('Unexpected Hostinger ingress topology.');
 function addresses(network,names){return names.map(name=>{
  const rows=Object.values(network.Containers??{}).filter(row=>row.Name===name);
  if(rows.length!==1)throw Error('Resolve exactly one existing '+name+' peer on '+network.Name+'.');
  const ip=rows[0].IPv4Address?.split('/')[0];if(isIP(ip)!==4)throw Error('An existing ingress peer has no IPv4 address.');return ip;
 });}
 return [...new Set([...addresses(defaultNetwork,['cloudflared','platform']),...(name==='codeitz'?addresses(infraNetwork,['cloudflared']):[])])];
}
