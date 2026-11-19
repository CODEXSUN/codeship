import {platformTarget} from './platform-target.mjs';
import {businessTargets} from './business-targets.mjs';
export const applicationNetwork='applications_backend';
export function applicationAddresses(subnet){
 const match=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(subnet??'');
 if(!match)throw Error('Use an allocated IPv4 application subnet.');
 const octets=match.slice(1,5).map(Number),prefix=Number(match[5]);
 if(octets.some(value=>value>255)||prefix<8||prefix>27)throw Error('Application subnet has insufficient reserved addresses.');
 const base=octets.reduce((value,part)=>value*256n+BigInt(part),0n),mask=(0xffffffffn<<BigInt(32-prefix))&0xffffffffn;
 if((base&mask)!==base)throw Error('Application subnet must use its network base.');
 const address=offset=>[24n,16n,8n,0n].map(shift=>Number(((base+BigInt(offset))>>shift)&255n)).join('.');
 return {platform:address(10),...Object.fromEntries(Object.keys(businessTargets).map((name,index)=>[name,address(11+index)]))};
}
export function ensureApplicationNetwork(docker,postgresProject='codebiz-infra'){
 let network;try{network=JSON.parse(docker(['network','inspect',applicationNetwork]))[0];}catch{}
 if(!network){docker(['network','create','--label','io.codebiz.owner=codeship',applicationNetwork]);network=JSON.parse(docker(['network','inspect',applicationNetwork]))[0];}
 if(network.Labels?.['io.codebiz.owner']!=='codeship')throw Error('Application network name belongs to another owner.');
 const ipv4=network.IPAM?.Config?.find(config=>/^\d+\./.test(config.Subnet??''));
 const addresses=applicationAddresses(ipv4?.Subnet);
 for(const endpoint of Object.values(network.Containers??{})){
  const reserved=Object.entries(addresses).find(([,address])=>address===endpoint.IPv4Address?.split('/')[0]);
  if(reserved&&endpoint.Name!==reserved[0])throw Error('Reserved application address is occupied.');
 }
 const postgres=docker(['ps','--no-trunc','-q','--filter','label=com.docker.compose.project='+postgresProject,'--filter','label=com.docker.compose.service=postgres']).split('\n').filter(Boolean);
 if(postgres.length!==1||!/^[a-f0-9]{64}$/.test(postgres[0]))throw Error('Resolve exactly one registered PostgreSQL container.');
 if(!Object.hasOwn(network.Containers??{},postgres[0]))docker(['network','connect','--alias','postgres',applicationNetwork,postgres[0]]);
 return {name:applicationNetwork,subnet:ipv4.Subnet,gateway:ipv4.Gateway,addresses,peers:[ipv4.Gateway,...Object.values(addresses)].filter(Boolean).join(',')};
}
export function applyIndependentNetwork(service,name,topology){
 if(!Object.hasOwn(topology.addresses,name))throw Error('Unregistered application network target.');
 delete service.network_mode;delete service.depends_on;
 service.networks={backend:{ipv4_address:topology.addresses[name]}};
 const target=businessTargets[name];service.ports=[name==='platform'?'127.0.0.1:'+platformTarget.port+':'+platformTarget.apiPort:'127.0.0.1:'+target.port+':'+target.publishedContainerPort];
 if(target)service.environment={...service.environment,CODESHIP_CONTAINER_ADDRESS:topology.addresses[name]};
 return service;
}
export function verifyIndependentContainer(name,facts){
 const target=businessTargets[name];if(name!=='platform'&&!target)throw Error('Unknown container identity.');
 const containerPort=name==='platform'?platformTarget.apiPort:target.publishedContainerPort,hostPort=name==='platform'?platformTarget.port:target.port;
 if(/^(host|container:|service:)/.test(facts.networkMode??'')||Object.keys(facts.networks??{}).length!==1||!facts.networks[applicationNetwork]?.IPAddress)throw Error('Application must own an independent private network endpoint.');
 const ports=Object.entries(facts.ports??{});
 if(ports.length!==1||ports[0][0]!==containerPort+'/tcp'||ports[0][1]?.length!==1||ports[0][1][0].HostIp!=='127.0.0.1'||ports[0][1][0].HostPort!==String(hostPort))throw Error('Application must publish only its own loopback port.');
}
