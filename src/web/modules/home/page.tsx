import {usePlatformAuth} from '../../platform';
import {Server,NotebookTabs,AppWindow,Rocket,TriangleAlert,Blocks} from 'lucide-react';
import {lazy,Suspense,useEffect,useState,useCallback,type ReactNode} from 'react';
import {Button} from '@workspace/ui';
import {MainLayout} from '@workspace/ui/layouts/main-layout';
import {AsyncState,ContentBoundary} from '@workspace/ui/blocks/async-state';
import {OperationsPage} from '../operations/page';
import {appBrand,appVersion} from '../../app-shell';
import {UpsertFormSave} from '@workspace/ui/blocks/upsert-form';
import {registryFormId} from '../registry/form';
import {infrastructureFormId} from '../infrastructure/form';
const ManagedAssetsPage=lazy(()=>import('../assets/page').then(m=>({default:m.ManagedAssetsPage})));
const DockerMetricsPage=lazy(()=>import('../reports/page').then(m=>({default:m.DockerMetricsPage})));
const InfrastructurePage=lazy(()=>import('../infrastructure/page').then(m=>({default:m.InfrastructurePage})));
const RegistryPage=lazy(()=>import('../registry/page').then(m=>({default:m.RegistryPage})));
const SettingsPage=lazy(()=>import('../settings/page'));
export function Application(){
 const auth=usePlatformAuth();
 const [saving,setSaving]=useState(false);
 const [pageActions,setPageActions]=useState<{path:string;node:ReactNode}>();
 const onHeaderActionsChange=useCallback((path:string,node:ReactNode)=>setPageActions({path,node}),[]);
 const [path,setPath]=useState(window.location.pathname);
 useEffect(()=>{const sync=()=>setPath(window.location.pathname);window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
 function navigate(next:string){if(next!==window.location.pathname)window.history.pushState(null,'',next);setPath(next);}
 const infrastructureForm=/^\/infrastructure\/(?:new|[a-z0-9]{8}\/edit)$/.test(path);
 const registryForm=/^\/registry\/(?:new|[a-z0-9]{8}\/edit)$/.test(path);
 const assetRoot=path.startsWith('/devkits')?'/devkits':'/applications';
 const assetPage=/^\/(?:applications|devkits)(?:$|\/(?:new|records|containers)(?:\/|$))/.test(path);
 const assetForm=/^\/(?:applications|devkits)\/(?:new|records\/[a-z0-9]{8}\/edit)$/.test(path);
 const reportCategory=path.startsWith('/reports/infra-metric')?'infra':path.startsWith('/reports/app-metric')?'apps':'devkits';
 const label=path.startsWith('/reports/')?(reportCategory==='infra'?'Infra Metric':reportCategory==='apps'?'App Metric':'Devkit Metric'):path.startsWith('/devkits')?'Devkits':path.startsWith('/infrastructure')?'Infrastructure':path.startsWith('/registry')?'Registry':path.startsWith('/settings')?'Settings':path.startsWith('/deployments')?'Deployments':path==='/incidents'?'Incidents':path==='/'||path==='/overview'?'Overview':'Applications';
 useEffect(()=>{document.title=`${label} · Codeship`;},[label]);
 const moduleRoot=assetPage?assetRoot:path.startsWith('/infrastructure')?'/infrastructure':'/registry';
 const editing=infrastructureForm||registryForm||assetForm;
 const overview=path==='/'||path==='/overview';
 const breadcrumbs=path.startsWith('/reports/')?[{label:'Reports'},{label}]:editing?[{label,href:moduleRoot},...(path.endsWith('/edit')?[{label:path.split('/').at(-2)!},{label:'Edit'}]:[{label:'New'}])]:[{label}];
 const headerActions=editing?<>{pageActions?.path===path?pageActions.node:null}<Button variant="outline" disabled={saving} onClick={()=>navigate(moduleRoot)}>Cancel</Button><UpsertFormSave formId={infrastructureForm?infrastructureFormId:registryFormId} saving={saving}/></>:['/infrastructure','/registry','/applications','/devkits'].includes(path)?<>{pageActions?.path===path?pageActions.node:null}<Button aria-label={path==='/infrastructure'?'New infrastructure service':path==='/devkits'?'New devkit':'New application'} onClick={()=>navigate(path+'/new')}>New</Button></>:pageActions?.path===path?pageActions.node:undefined;
 const valid=/^\/(?:reports\/(?:infra-metric|app-metric|devkit-metric)(?:\/[a-f0-9]{12,64})?|overview|infrastructure(?:\/new|\/[a-z0-9]{8}\/edit)?|registry(?:\/new|\/[a-z0-9]{8}\/edit)?|(?:applications|devkits)(?:\/new|\/records\/[a-z0-9]{8}(?:\/edit)?|\/containers\/[a-f0-9]{12,64}|\/[a-z0-9]{8})?|deployments(?:\/[a-z0-9]{8})?|incidents|settings(?:\/appearance)?)?$/.test(path);
 return <MainLayout className="h-screen w-full min-w-0" applicationName="Codeship" companyBrand={appBrand} launcherCatalogUrl={auth ? "/platform-api/v1/landing" : undefined} appItems={[]} navigation={[{label:'Operations',items:[{label:'Infrastructure',icon:Server,onSelect:()=>navigate('/infrastructure')},{label:'Registry',icon:NotebookTabs,onSelect:()=>navigate('/registry')},{label:'Applications',icon:AppWindow,onSelect:()=>navigate('/applications')},{label:'Devkits',icon:Blocks,onSelect:()=>navigate('/devkits')},{label:'Deployments',icon:Rocket,onSelect:()=>navigate('/deployments')},{label:'Incidents',icon:TriangleAlert,onSelect:()=>navigate('/incidents')}]}]} selectedPage={label} onOverviewSelect={()=>navigate('/overview')} onSettingsSelect={()=>navigate('/settings')} onLogout={auth?.logout} user={{name:auth?.session.user.displayName??'Local operator',email:auth?.session.user.email??'',fallback:'CS'}} headerActions={headerActions} headerName={null} headerBreadcrumbs={breadcrumbs} statusLabel="Local Docker · Private operator workspace" versionLabel={`v ${appVersion}`}>
 <main className={editing ? "mx-auto w-[90%] min-w-0 space-y-5 py-5" : overview ? "w-full min-w-0 space-y-5 p-4 md:p-5" : "workspace-list-content space-y-5"}><ContentBoundary resetKey={path}>{!valid?<p>Page not found.</p>:path.startsWith('/reports/')?<Suspense fallback={<AsyncState loading>{null}</AsyncState>}><DockerMetricsPage key={reportCategory} navigate={navigate} path={path} category={reportCategory} onHeaderActionsChange={onHeaderActionsChange}/></Suspense>:assetPage?<Suspense fallback={<AsyncState loading>{null}</AsyncState>}><ManagedAssetsPage key={assetRoot} category={assetRoot==='/applications'?'apps':'devkits'} path={path} navigate={navigate} saving={saving} onSavingChange={setSaving} onHeaderActionsChange={onHeaderActionsChange}/></Suspense>:path.startsWith('/infrastructure')?<Suspense fallback={<AsyncState loading>{null}</AsyncState>}><InfrastructurePage onHeaderActionsChange={onHeaderActionsChange} path={path} navigate={navigate} saving={saving} onSavingChange={setSaving}/></Suspense>:path.startsWith('/registry')?<Suspense fallback={<AsyncState loading>{null}</AsyncState>}><RegistryPage path={path} navigate={navigate} saving={saving} onSavingChange={setSaving}/></Suspense>:path.startsWith('/settings')?<Suspense fallback={<AsyncState loading>{null}</AsyncState>}><SettingsPage/></Suspense>:<OperationsPage path={path} navigate={navigate} onHeaderActionsChange={onHeaderActionsChange}/>}</ContentBoundary></main>
 </MainLayout>;
}
