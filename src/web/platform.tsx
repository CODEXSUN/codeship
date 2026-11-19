import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {WorkspaceAccessGate} from '@workspace/ui/blocks/auth/workspace-access-gate';
import {AsyncState} from '@workspace/ui/blocks/async-state';
import type {PlatformSession} from '@workspace/sdk/platform-browser-client';
import {platform,enablePlatform} from './platform-client';
const Auth=createContext<{session:PlatformSession;logout:()=>Promise<void>}|undefined>(undefined);
export const usePlatformAuth=()=>useContext(Auth);
export function PlatformGate({children}:{children:ReactNode}){const[enabled,setEnabled]=useState<boolean>();const[error,setError]=useState('');useEffect(()=>{const controller=new AbortController();fetch('/api/platform-configuration',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('Workspace configuration unavailable');const v=await r.json();enablePlatform(v.enabled===true);setEnabled(v.enabled===true);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[]);
if(error)return <AsyncState error={error}>{null}</AsyncState>;if(enabled===undefined)return <AsyncState loading loadingMessage="Connecting to your workspace…">{null}</AsyncState>;if(!enabled)return <>{children}</>;return <WorkspaceAccessGate client={platform} brandName="CodeShip" logoSrc="/logo/logo.svg" logoDarkSrc="/logo/logo-dark.svg" verify={async session=>{const r=await platform.fetch('/api/v1/workspace');if(!r.ok)throw Object.assign(Error('Workspace access is unavailable'),{statusCode:r.status});const c=await r.json();if(c.tenantId!==session.tenant?.publicId||c.userId!==session.user.publicId)throw Error('Workspace identity differs');}}>{(session,logout)=><Auth.Provider value={{session,logout}}>{children}</Auth.Provider>}</WorkspaceAccessGate>;}
