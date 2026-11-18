import {useEffect,useState,type ReactNode} from 'react';
import {Button} from '@workspace/ui';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@workspace/ui/components/dropdown-menu';
import {AsyncState} from '@workspace/ui/blocks/async-state';
import {DockerMetricsPage} from '../reports/page';
import type {InfrastructureService} from '../../../../contracts/infrastructure';
import {infrastructureList,infrastructureRequest} from './services';
import {InfrastructureForm} from './form';
export function InfrastructurePage({path,navigate,saving,onSavingChange,onHeaderActionsChange}:{path:string;navigate:(path:string)=>void;saving:boolean;onSavingChange:(busy:boolean)=>void;onHeaderActionsChange:(path:string,actions:ReactNode)=>void}){
 const [rows,setRows]=useState<InfrastructureService[]>(),[error,setError]=useState(''),[status,setStatus]=useState('');const id=path.match(/^\/infrastructure\/([a-z0-9]{8})\/edit$/)?.[1],form=path==='/infrastructure/new'||!!id,record=rows?.find(r=>r.public_id===id);
 async function load(){try{setRows(await infrastructureList());setError('');}catch(cause){setError((cause as Error).message);}}useEffect(()=>{setStatus('');void load();},[path]);
 async function prepare(purpose:'install'|'maintenance'){if(!record)return;onSavingChange(true);setError('');try{const result=await infrastructureRequest<{message:string;artifact:string}>('/'+record.public_id+'/prepare',{purpose,revision:record.revision});setStatus(result.message+' '+result.artifact);}catch(cause){setError((cause as Error).message);}finally{onSavingChange(false);}}
 useEffect(()=>{if(!form)return;onHeaderActionsChange(path,record?<DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" disabled={saving}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={saving} onSelect={()=>prepare('install')}>Prepare install .env</DropdownMenuItem><DropdownMenuItem disabled={saving} onSelect={()=>prepare('maintenance')}>Prepare maintenance .env</DropdownMenuItem></DropdownMenuContent></DropdownMenu>:null);return()=>onHeaderActionsChange(path,null);},[path,record,saving,onHeaderActionsChange]);
 return <div className="space-y-5">
 {status&&<p role="status" className="rounded-md border p-3 text-sm">{status}</p>}<AsyncState loading={!rows&&!error} error={error} onRetry={load}>{rows&&(form?(id&&!record?<p>Service not found.</p>:<InfrastructureForm key={id??'new'} record={record} saving={saving} onSavingChange={onSavingChange} onSaved={()=>navigate('/infrastructure')}/>):<DockerMetricsPage category="infra" infrastructure={rows} path={path} navigate={navigate} onHeaderActionsChange={onHeaderActionsChange}/>)}</AsyncState></div>;
}
