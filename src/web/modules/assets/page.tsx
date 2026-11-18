import {useEffect,useState,type ReactNode} from 'react';
import {Button} from '@workspace/ui';
import {AsyncState} from '@workspace/ui/blocks/async-state';
import {RecordDetailV1} from '@workspace/ui/blocks/record-detail-v1';
import type {ManagedApplication} from '../../../../contracts/application';
import {listApplications} from '../registry/services';
import {ApplicationForm} from '../registry/form';
import {DockerMetricsPage} from '../reports/page';

export function ManagedAssetsPage({category,path,navigate,saving,onSavingChange,onHeaderActionsChange}:{category:'apps'|'devkits';path:string;navigate:(path:string)=>void;saving:boolean;onSavingChange:(value:boolean)=>void;onHeaderActionsChange:(path:string,node:ReactNode)=>void}){
 const root=category==='apps'?'/applications':'/devkits',prefix=category==='apps'?'apps/':'devkit/';
 const [records,setRecords]=useState<ManagedApplication[]>(),[error,setError]=useState('');
 const id=path.match(/\/records\/([a-z0-9]{8})(?:\/edit)?$/)?.[1];
 const form=path===root+'/new'||path.endsWith('/edit'),record=records?.find(row=>row.public_id===id);
 async function load(){try{setRecords((await listApplications()).filter(row=>row.owner.startsWith(prefix)));setError('');}catch(cause){setError((cause as Error).message);}}
 useEffect(()=>{setRecords(undefined);void load();},[path,category]);
 useEffect(()=>{if(!id||form)return;onHeaderActionsChange(path,<><Button variant="outline" onClick={()=>navigate(root)}>Back</Button>{record&&<Button onClick={()=>navigate(root+'/records/'+id+'/edit')}>Edit</Button>}</>);return()=>onHeaderActionsChange(path,null);},[id,form,path,root,record,onHeaderActionsChange]);
 return <AsyncState loading={!records&&!error} error={error} onRetry={load}>{records&&(form?(id&&!record?<p>Record not found in this category.</p>:<ApplicationForm key={path} record={record} ownerPrefix={prefix} saving={saving} onSavingChange={onSavingChange} onSaved={()=>navigate(root)}/>):id?<RecordDetailV1 title={record?.name??'Record'} empty={!record} description="Registered configuration · live Docker metrics appear after deployment." sections={record?[{id:'configuration',title:'Configuration',fields:[{id:'owner',label:'Owner',value:record.owner},{id:'project',label:'Deployment',value:record.project},{id:'environment',label:'Environment',value:record.environment},{id:'version',label:'Version',value:record.version},{id:'host',label:'Host / port',value:record.host+(record.port?':'+record.port:'')},{id:'secrets',label:'Credentials',value:record.hasSecrets?'Encrypted credentials saved':'Not stored'},{id:'notes',label:'Notes',value:record.notes}]}]:[]}/>:<DockerMetricsPage key={category} category={category} path={path} rootPath={root} applications={records} navigate={navigate} onHeaderActionsChange={onHeaderActionsChange}/>)}</AsyncState>;
}
