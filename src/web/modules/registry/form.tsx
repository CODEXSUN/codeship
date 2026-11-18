import {useState} from 'react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@workspace/ui/components/tabs';
import {InlineFormDetails,type InlineFormField} from '@workspace/ui/blocks/inline-form-details';
import {UpsertForm} from '@workspace/ui/blocks/upsert-form';
import {accountRoles,type ManagedApplication,type ApplicationInput} from '../../../../contracts/application';
import {registryRequest} from './services';
import {EnvironmentEditor} from './environment';
export const registryFormId='application-registry-form';
export function ApplicationForm({record,saving,onSavingChange,onSaved,ownerPrefix}:{ownerPrefix?:string;record?:ManagedApplication;saving:boolean;onSavingChange:(value:boolean)=>void;onSaved:()=>void}){
 const [tab,setTab]=useState('application'),[error,setError]=useState('');
 const [environmentChanges,setEnvironmentChanges]=useState<Record<string,string>>({}),[environmentIssue,setEnvironmentIssue]=useState('');
 const field=(name:keyof ManagedApplication,label:string,extra:Partial<InlineFormField>={}):InlineFormField=>({name,label,value:String(record?.[name]??''),maxLength:255,...extra});
 const applicationFields:InlineFormField[]=[field('name','Name',{required:true,maxLength:100}),field('owner','Workspace owner',{required:true,value:record?.owner??ownerPrefix??'',helper:ownerPrefix?'Use '+ownerPrefix+' followed by the workspace name.':undefined}),field('version','Version'),field('project','Deployment name',{required:true}),field('environment','Environment',{value:record?.environment??(ownerPrefix?'local-docker':'development'),options:[{value:'development',label:'Development / tests'},{value:'local-docker',label:'Local Docker'},{value:'vps',label:'Live VPS'}]}),field('host','Host'),field('port','Port',{type:'number'}),field('username','Username'),field('notes','Notes',{multiline:true,maxLength:2000})];
 const userFields:InlineFormField[]=accountRoles.flatMap(role=>{const user=record?.users?.find(user=>user.role===role),label=role==='sa'?'SA':role==='admin'?'Admin':'User';return [
  {name:role+'Username',label:label+' username',value:user?.username??'',maxLength:100},
  {name:role+'Email',label:label+' email',value:user?.email??'',type:'email',maxLength:320},
  {name:role+'Name',label:label+' display name',value:user?.name??'',maxLength:100},
  {name:role+'Password',label:label+' password',secret:true,stored:user?.hasPassword,maxLength:128,helper:'Leave blank to keep the saved password. Show reveals only your replacement.'}
 ];});
 return <UpsertForm id={registryFormId} saving={saving} error={error} onSubmit={async event=>{
  event.preventDefault();if(saving)return;if(environmentIssue){setTab('environment');setError(environmentIssue);return;}const data=new FormData(event.currentTarget),form=event.currentTarget;
  const text=(name:string)=>String(data.get(name)??'');if(ownerPrefix&&!text('owner').startsWith(ownerPrefix)){setError('Workspace owner must start with '+ownerPrefix);return;}const secrets=Object.fromEntries(['env','password','sshKey','token','saPassword','adminPassword','userPassword'].map(key=>[key,text(key)]).filter(([,value])=>value!==''));
  const values:ApplicationInput={name:text('name'),owner:text('owner'),version:text('version'),environment:text('environment') as ApplicationInput['environment'],project:text('project'),host:text('host'),port:text('port')?Number(text('port')):null,username:text('username'),notes:text('notes'),users:accountRoles.map(role=>({role,username:text(role+'Username'),email:text(role+'Email'),name:text(role+'Name')})),environmentChanges,secrets,clearSecrets:data.get('clearSecrets')==='on',...(record?{secretRevision:record.secret_revision}:{})};
  onSavingChange(true);setError('');try{await registryRequest(record?'/'+record.public_id:'',values,record?.public_id);form.reset();onSaved();}catch(cause){setError((cause as Error).message);}finally{onSavingChange(false);}
 }}>
 <Tabs value={tab} onValueChange={setTab} className="col-span-full min-w-0">
 <TabsList><TabsTrigger value="application">Application</TabsTrigger><TabsTrigger value="credentials">Users &amp; secrets</TabsTrigger><TabsTrigger value="environment">Environment</TabsTrigger></TabsList>
 <TabsContent value="application" forceMount className={tab==='application'?'space-y-4':'hidden'}><InlineFormDetails fields={applicationFields}/></TabsContent>
 <TabsContent value="credentials" forceMount className={tab==='credentials'?'space-y-4':'hidden'}>
 <InlineFormDetails fields={userFields}/>
 <p className="text-sm text-muted-foreground">Blank credential fields keep saved values. Edit .env variables in Environment. Save in the header writes all changes.</p>
 <InlineFormDetails fields={[
  {name:'password',label:'Password',secret:true,stored:record?.hasPassword,maxLength:8192},
  {name:'token',label:'API token',secret:true,stored:record?.hasToken,maxLength:8192},
  {name:'sshKey',label:'SSH private key',secret:true,stored:record?.hasSshKey,multiline:true,maxLength:32768}
 ]}/>
 <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clearSecrets"/>Clear all stored credentials on save</label>
 </TabsContent>
 <TabsContent value="environment" forceMount className={tab==='environment'?'grid gap-5':'hidden'}><EnvironmentEditor id={record?.public_id} revision={record?.secret_revision??0} onChange={setEnvironmentChanges} onValidityChange={setEnvironmentIssue}/></TabsContent>
 </Tabs></UpsertForm>;
}
