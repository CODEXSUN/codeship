export const startupBudget=Object.freeze({dependencyMs:300000,childMs:60000,healthMs:60000,operationSeconds:480});
export function startupRemaining(dependencyElapsedMs,budget=startupBudget){
 if(!Number.isFinite(dependencyElapsedMs)||dependencyElapsedMs<0||dependencyElapsedMs>budget.dependencyMs)throw Error('Invalid dependency startup elapsed time.');
 const remaining=budget.operationSeconds*1000-dependencyElapsedMs;
 if(budget.operationSeconds*1000<budget.dependencyMs+budget.childMs+budget.healthMs)throw Error('Operation deadline does not cover startup and health budgets.');
 return remaining;
}
startupRemaining(0);
export const startupHealth=Object.freeze({interval:'5s',timeout:'4s',start_period:'360s',retries:6});
