import test from 'node:test';import assert from 'node:assert/strict';import {startupBudget,startupRemaining,startupHealth} from '../.container/apps/startup-budget.mjs';
test('near-deadline dependency recovery leaves time for child startup and health verification',()=>{
 assert.ok(startupBudget.dependencyMs>187000,'observed PostgreSQL recovery must fit');
 const remaining=startupRemaining(startupBudget.dependencyMs-1);assert.ok(remaining>startupBudget.childMs+startupBudget.healthMs);
 assert.ok(startupHealth.retries*(5000+4000)<=startupBudget.healthMs);
 assert.throws(()=>startupRemaining(179999,{dependencyMs:180000,childMs:60000,healthMs:60000,operationSeconds:180}),/deadline/);
 assert.throws(()=>startupRemaining(startupBudget.dependencyMs+1));
});
import {waitForReadiness} from '@workspace/framework';
test('shared deadline accepts recovery immediately before expiry without waiting minutes',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});
 const pending=waitForReadiness(()=>new Promise<boolean>(resolve=>setTimeout(()=>resolve(true),startupBudget.dependencyMs-1)),{timeoutMs:startupBudget.dependencyMs});
 await Promise.resolve();context.mock.timers.tick(startupBudget.dependencyMs-1);
 const result=await pending;assert.equal(result.attempts,1);
});
