export const actions = ['check', 'deploy', 'update', 'verify'] as const;
export type Action = typeof actions[number];
export type Target = { public_id: string; name: string; owner: string; project: string; port: number; active: boolean; created_at: string };
export type Run = { public_id: string; target_code: string; target_name: string; action: Action; state: 'running'|'succeeded'|'failed'|'interrupted'; output?: string; exit_code: number|null; created_at: string; finished_at: string|null };
export type Observation = { public_id: string; target_code: string; target_name: string; healthy: boolean; latency_ms: number; containers: number; cpu_percent: number|null; memory_bytes: number|null; details: string; created_at: string };
export type Incident = { public_id: string; target_code: string; target_name: string; message: string; state: 'open'|'resolved'; created_at: string; resolved_at: string|null };
export type Candidate = { key: string; name: string; owner: string; project: string; port: number };
