export function preserveUnselected(definition,existing,selected){
 for(const [name,service]of Object.entries(existing.services??{}))if(!selected.includes(name))definition.services[name]=structuredClone(service);
 definition.volumes=structuredClone({...definition.volumes,...existing.volumes});
 definition.networks=structuredClone({...definition.networks,...existing.networks});
 return definition;
}
export function requireSelectedRegistry(rows,selected){
 const owners=rows.map(row=>row.owner);
 if(rows.length!==selected.length||new Set(owners).size!==rows.length||owners.some(owner=>!selected.some(name=>owner==='devkit/'+name)))throw Error('Registry update includes an unselected service.');
 return rows;
}
