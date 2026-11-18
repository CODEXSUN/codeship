import {useState} from 'react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@workspace/ui/components/tabs';
import {InlineFormDetails,type InlineFormField} from '@workspace/ui/blocks/inline-form-details';
import {FormSelect} from '@workspace/ui/blocks/form-controls/select';
import {Checkbox} from '@workspace/ui/components/checkbox';
import {UpsertForm} from '@workspace/ui/blocks/upsert-form';
import {infrastructureKinds,type InfrastructureService,type InfrastructureInput} from '../../../../contracts/infrastructure';
import {saveInfrastructure} from './services';
export const infrastructureFormId='infrastructure-service-form';
export function InfrastructureForm({record,saving,onSavingChange,onSaved}:{record?:InfrastructureService;saving:boolean;onSavingChange:(busy:boolean)=>void;onSaved:()=>void}){
 const [tab,setTab]=useState('details'),[error,setError]=useState('');
 const [kind,setKind]=useState<InfrastructureInput['kind']>(record?.kind??'postgres');
 const labels={postgres:'PostgreSQL',redis:'Redis','file-manager':'File Manager',mariadb:'MariaDB (legacy)'};
 const [binding,setBinding]=useState<'local'|'public'|'whitelist'>(record?.binding_mode??'local');
 const sql=kind==='postgres'||kind==='mariadb';
 const field=(name:keyof InfrastructureService,label:string,extra:Partial<InlineFormField>={}):InlineFormField=>({name,label,value:String(record?.[name]??''),maxLength:255,...extra});
 return <UpsertForm id={infrastructureFormId} saving={saving} error={error} onSubmit={async event=>{event.preventDefault();if(saving)return;const form=event.currentTarget,data=new FormData(form),text=(name:string)=>String(data.get(name)??(record as any)?.[name]??'');const secrets=Object.fromEntries(['password','rootPassword'].map(name=>[name,String(data.get(name)??'')]).filter(([,value])=>value!==''));const input:InfrastructureInput={kind,name:labels[kind],version:text('version'),environment:text('environment') as InfrastructureInput['environment'],project:text('project'),host:text('host'),port:text('port')?Number(text('port')):null,docker_port:text('docker_port')?Number(text('docker_port')):null,binding_mode:sql?binding:'local',allowed_ips:sql?text('allowed_ips'):'',username:text('username'),database:text('database'),storage:text('storage'),notes:text('notes'),secrets,clearSecrets:data.get('clearSecrets')==='on',...(record?{revision:record.revision}:{})};onSavingChange(true);setError('');try{await saveInfrastructure(input,record?.public_id);form.reset();onSaved();}catch(cause){setError((cause as Error).message);}finally{onSavingChange(false);}}}>
 <Tabs value={tab} onValueChange={setTab} className="col-span-full min-w-0">
 <TabsList><TabsTrigger value="details">Connection</TabsTrigger><TabsTrigger value="deployment">Deployment &amp; maintenance</TabsTrigger></TabsList>
 <TabsContent value="details" forceMount className={tab==='details'?'space-y-4':'hidden'}>
 {!record&&<FormSelect ariaLabel="Service type" value={kind} onValueChange={value=>setKind(value as typeof kind)} options={infrastructureKinds.map(value=>({value,label:labels[value]}))}/>}
 <InlineFormDetails key={kind} fields={[
 {name:'kind',label:'Service type',value:labels[kind],readOnly:true},
 field('host','Host'),field('port','Host port',{type:'number'}),field('docker_port','Docker port',{type:'number',value:String(record?.docker_port??({postgres:5432,mariadb:3306,redis:6379,'file-manager':8080})[kind]),helper:'Port inside the container. Host port is the published connection port.'}),
 field('username',kind==='redis'?'ACL username (optional)':kind==='file-manager'?'Administrator username':'Username'),
 {name:'password',label:'Password',secret:true,stored:record?.hasPassword,maxLength:8192,helper:'Blank keeps the saved password. Show reveals only your replacement.'},
 ...(sql?[field('database','Database (optional)')]:[]),
 ...(kind==='file-manager'?[field('storage','Application file volumes',{multiline:true,maxLength:1000,helper:'One owner=volume per line. Exclude database and key volumes.'})]:[])
 ]}/>
 {sql&&<section className="space-y-3 rounded-md border p-3" aria-label="Database network binding">
 <label className="flex items-center gap-2 text-sm"><Checkbox checked={binding!=='local'} onCheckedChange={value=>setBinding(value===true?'public':'local')}/>Allow connections from other computers</label>
 {binding!=='local'&&<label className="flex items-center gap-2 text-sm"><Checkbox checked={binding==='whitelist'} onCheckedChange={value=>setBinding(value===true?'whitelist':'public')}/>Restrict to IP whitelist</label>}
 <p className="text-sm text-muted-foreground">{binding==='local'?'Local only (127.0.0.1).':binding==='public'?'Public binding (0.0.0.0): any computer that can reach this host may connect.':'Only listed IP addresses or CIDR ranges. Deployment must apply firewall restrictions before external binding.'} Saving records the policy; it does not expose or restart a service.</p>
 {binding==='whitelist'&&<InlineFormDetails fields={[field('allowed_ips','Allowed IPs / CIDR ranges',{multiline:true,maxLength:4000,helper:'One address or range per line. Example: 192.168.1.20 or 192.168.1.0/24.'})]}/>}
 </section>}
 </TabsContent>
 <TabsContent value="deployment" forceMount className={tab==='deployment'?'space-y-4':'hidden'}><InlineFormDetails fields={[
 ...(kind==='mariadb'?[{name:'rootPassword',label:'Root password (new installation only)',secret:true,stored:record?.hasRootPassword,maxLength:8192,helper:'Only needed to install MariaDB. For a root connection, the connection password is used.'} as InlineFormField]:[]),
 field('version','Version / image'),field('project','Deployment name',{required:true}),
 field('environment','Environment',{value:record?.environment??'local-docker',options:[{value:'local-docker',label:'Local Docker'},{value:'vps',label:'Live VPS'}]}),
 field('notes','Maintenance notes',{multiline:true,maxLength:3000})
 ]}/></TabsContent></Tabs></UpsertForm>;
}
