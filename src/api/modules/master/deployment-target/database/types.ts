import type {Generated} from 'kysely';
export interface DeploymentTargetRow {id:Generated<number>;public_id:string;profile_key:string;name:string;owner:string;project:string;port:number;active:Generated<boolean>;created_at:Generated<Date>;updated_at:Generated<Date>;created_by:string;updated_by:string;}
export interface TargetDatabase {deployment_targets:DeploymentTargetRow;}
