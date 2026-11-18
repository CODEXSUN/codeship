export function preserveUnselected(definition,existing,selected){
 for(const [name,service]of Object.entries(existing.services??{}))if(!selected.includes(name))definition.services[name]=structuredClone(service);
 definition.volumes=structuredClone(existing.volumes??definition.volumes);
 definition.networks=structuredClone(existing.networks??definition.networks);
 return definition;
}
