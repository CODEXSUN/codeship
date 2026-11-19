export const startupBudget:Readonly<{dependencyMs:number;childMs:number;healthMs:number;operationSeconds:number}>;
export function startupRemaining(elapsedMs:number,budget?:typeof startupBudget):number;
export const startupHealth:Readonly<{interval:string;timeout:string;start_period:string;retries:number}>;
