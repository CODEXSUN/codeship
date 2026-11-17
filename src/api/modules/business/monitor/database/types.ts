import type {Generated,ColumnType} from 'kysely';
export interface ObservationRow {id:Generated<number>;public_id:string;target_id:number;healthy:boolean;latency_ms:number;containers:number;cpu_percent:number|null;memory_bytes:ColumnType<string|null,number|null,number|null>;details:string;active:Generated<boolean>;created_at:Generated<Date>;updated_at:Generated<Date>;created_by:string;updated_by:string;}
export interface IncidentRow {id:Generated<number>;public_id:string;target_id:number;message:string;state:string;resolved_at:Date|null;active:Generated<boolean>;created_at:Generated<Date>;updated_at:Generated<Date>;created_by:string;updated_by:string;}
export interface MonitorDatabase {observations:ObservationRow;incidents:IncidentRow;}
