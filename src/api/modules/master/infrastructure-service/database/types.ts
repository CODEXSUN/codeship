import type {Generated} from 'kysely';
import type {InfrastructureKind} from '../../../../../../contracts/infrastructure.ts';
export interface InfrastructureRow {id:Generated<number>;public_id:string;kind:InfrastructureKind;name:string;version:string;environment:string;project:string;host:string;port:number|null;docker_port?:number|null;binding_mode:Generated<'local'|'public'|'whitelist'>;allowed_ips:Generated<string>;username:string;database:string;storage:string;notes:string;encrypted_secrets:string|null;revision:Generated<number>;created_at:Generated<string>;updated_at:Generated<string>;created_by:string;updated_by:string;}
export interface InfrastructureDatabase {infrastructure_services:InfrastructureRow;}
