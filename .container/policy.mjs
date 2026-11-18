export function migrationDecision(migrations,previous,current){
 for(const name of migrations.applied){if(!current[name])throw new Error('Applied migration missing from candidate: '+name);if(previous?.[name]&&previous[name]!==current[name])throw new Error('Applied migration changed: '+name);}
 if(migrations.pending.some(name=>!current[name]))throw new Error('Pending migration missing from image manifest.');
 const latest=[...migrations.applied].sort().at(-1);if(latest&&migrations.pending.some(name=>name<=latest))throw new Error('New migrations must sort after applied history.');
 return {pending:migrations.pending,backupRequired:migrations.applied.length>0&&migrations.pending.length>0,migrateRequired:migrations.pending.length>0};
}
