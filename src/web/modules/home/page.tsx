import {lazy,Suspense,useEffect,useState} from 'react';
import {MainLayout} from '@workspace/ui/layouts/main-layout';
import {AsyncState,ContentBoundary} from '@workspace/ui/blocks/async-state';
import {OperationsPage} from '../operations/page';
import {appBrand,appVersion} from '../../app-shell';
const SettingsPage=lazy(()=>import('../settings/page'));
export function Application(){
 const [path,setPath]=useState(window.location.pathname);
 useEffect(()=>{const sync=()=>setPath(window.location.pathname);window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
 function navigate(next:string){if(next!==window.location.pathname)window.history.pushState(null,'',next);setPath(next);}
 const label=path.startsWith('/settings')?'Settings':path.startsWith('/deployments')?'Deployments':path==='/incidents'?'Incidents':path==='/'||path==='/overview'?'Overview':'Applications';
 useEffect(()=>{document.title=`${label} · Codeship`;},[label]);
 const valid=/^\/(?:overview|applications(?:\/[a-z0-9]{8})?|deployments(?:\/[a-z0-9]{8})?|incidents|settings(?:\/appearance)?)?$/.test(path);
 return <MainLayout className="h-screen w-full min-w-0" applicationName="Codeship" companyBrand={appBrand} appItems={[]} navigation={[{label:'Operations',items:[{label:'Applications',onSelect:()=>navigate('/applications')},{label:'Deployments',onSelect:()=>navigate('/deployments')},{label:'Incidents',onSelect:()=>navigate('/incidents')}]}]} selectedPage={label} onOverviewSelect={()=>navigate('/overview')} onSettingsSelect={()=>navigate('/settings')} user={{name:'Local operator',email:'',fallback:'CS'}} headerName={null} headerBreadcrumbs={[{label}]} statusLabel="Local Docker · Private operator workspace" versionLabel={`v ${appVersion}`}>
 <main className="mx-auto w-[94%] min-w-0 space-y-5 py-5 sm:w-[90%]"><ContentBoundary resetKey={path}>{!valid?<p>Page not found.</p>:path.startsWith('/settings')?<Suspense fallback={<AsyncState loading>{null}</AsyncState>}><SettingsPage/></Suspense>:<OperationsPage path={path} navigate={navigate}/>}</ContentBoundary></main>
 </MainLayout>;
}
