export const accountRoles=['sa','admin','user'] as const;
export type AccountRole=typeof accountRoles[number];
export interface InstallationUser {role:AccountRole;username:string;email:string;name:string;hasPassword?:boolean;}
export interface EnvironmentVariable {key:string;value:string|null;secret:boolean;hasValue:boolean;}
export interface ApplicationEnvironment {revision:number;variables:EnvironmentVariable[];}
export interface ManagedApplication {public_id:string;name:string;owner:string;version:string;environment:string;project:string;host:string;port:number|null;username:string;notes:string;hasSecrets:boolean;hasToken?:boolean;hasSshKey?:boolean;hasEnvironment?:boolean;hasPassword?:boolean;environmentKeys:string[];users:InstallationUser[];secret_revision:number;updated_at:string;}
export interface ApplicationInput {name:string;owner:string;version:string;environment:'development'|'local-docker'|'vps';project:string;host:string;port:number|null;username:string;notes:string;users?:InstallationUser[];environmentChanges?:Record<string,string>;secrets?:{env?:string;password?:string;sshKey?:string;token?:string;saPassword?:string;adminPassword?:string;userPassword?:string};clearSecrets?:boolean;secretRevision?:number;}
