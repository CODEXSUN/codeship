import {useEffect,useState} from 'react';
import {AsyncState} from '@workspace/ui/blocks/async-state';
import {MasterListV1,type MasterListColumn} from '@workspace/ui/blocks/data-table';
import type {ManagedApplication} from '../../../../contracts/application';
import {listApplications} from './services';
import {ApplicationForm} from './form';
const columns:MasterListColumn<ManagedApplication>[]=[{id:'name',label:'Application',value:r=>r.name},{id:'owner',label:'Owner',value:r=>r.owner},{id:'environment',label:'Environment',value:r=>r.environment},{id:'project',label:'Deployment',value:r=>r.project},{id:'version',label:'Version',value:r=>r.version},{id:'credentials',label:'Credentials',value:r=>r.hasSecrets?'Encrypted':'Not stored'}];
export function RegistryPage({path,navigate,saving,onSavingChange}:{path:string;navigate:(path:string)=>void;saving:boolean;onSavingChange:(value:boolean)=>void}){
 const [rows,setRows]=useState<ManagedApplication[]>(),[error,setError]=useState('');
 const id=path.match(/^\/registry\/([a-z0-9]{8})\/edit$/)?.[1],form=path==='/registry/new'||!!id;
 async function load(){try{setRows(await listApplications());setError('');}catch(cause){setError((cause as Error).message);}}
 useEffect(()=>{void load();},[path]);
 return <div className="space-y-5">
 <AsyncState loading={!rows&&!error} error={error} onRetry={load}>{rows&&(form?(id&&!rows.some(r=>r.public_id===id)?<p>Application not found.</p>:<ApplicationForm key={id??'new'} record={rows.find(r=>r.public_id===id)} saving={saving} onSavingChange={onSavingChange} onSaved={()=>navigate('/registry')}/>):<MasterListV1 label="Application registry" data={rows} columns={columns} getRowId={r=>r.public_id} onOpen={r=>navigate('/registry/'+r.public_id+'/edit')} openOnRowClick/>)}</AsyncState></div>;
}
