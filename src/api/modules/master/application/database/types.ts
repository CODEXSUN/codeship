import type {Generated} from 'kysely';
export interface ApplicationRow {id:Generated<number>;public_id:string;name:string;owner:string;version:string;environment:string;project:string;host:string;port:number|null;username:string;notes:string;encrypted_secrets:string|null;secret_revision:Generated<number>;created_at:Generated<string>;updated_at:Generated<string>;created_by:string;updated_by:string;}
export interface RegistryDatabase {applications:ApplicationRow;operator_lease:{id:number;token:string;expires_at:number};}
