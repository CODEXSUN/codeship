import type {Generated} from 'kysely';
import type {Action} from '../../../../../../contracts/operations.ts';
export interface DeploymentRunRow {id:Generated<number>;public_id:string;target_id:number;request_key:string;action:Action;state:string;output:Generated<string>;exit_code:number|null;finished_at:Date|null;active:Generated<boolean>;created_at:Generated<Date>;updated_at:Generated<Date>;created_by:string;updated_by:string;}
export interface DeploymentDatabase {deployment_runs:DeploymentRunRow;}
