export function validateManifest(manifest,expected) {
  if(manifest.schema!==1||manifest.owner!==expected.owner||manifest.repository!==expected.repository||manifest.tag!==expected.tag||manifest.commit!==expected.commit||manifest.tag!=='v-'+manifest.version)throw new Error('Release source identity mismatch.');
  const repository='ghcr.io/'+expected.repository.toLowerCase();
  if(!manifest.image?.startsWith(repository+'@sha256:')||!/^sha256:[a-f0-9]{64}$/.test(manifest.image.slice(repository.length+1)))throw new Error('Release image must use the approved repository and exact digest.');
  if(!manifest.migrations||Object.entries(manifest.migrations).some(([file,hash])=>!/(?:^|\/)(?:sqlite-migrations|migrations|tenant-migrations)\/[^/]+\.ts$/.test(file)||file.includes('..')||!/^[a-f0-9]{64}$/.test(hash)))throw new Error('Invalid migration manifest.');
  if(manifest.migrationLineEndings&&Object.entries(manifest.migrationLineEndings).some(([file,variants])=>!manifest.migrations[file]||!Array.isArray(variants)||variants.length!==2||variants.some(hash=>!/^[a-f0-9]{64}$/.test(hash))||!variants.includes(manifest.migrations[file])))throw new Error('Invalid migration line-ending compatibility hashes.');
  return manifest;
}
export function legacyMigrationMap(manifest) {
 const entries=Object.entries(manifest.migrations).filter(([file])=>file.includes(manifest.owner==='devkit/codeship'?'/sqlite-migrations/':'/migrations/'));
 const result={};for(const [file,hash] of entries){const name=file.split('/').at(-1).slice(0,-3);if(result[name])throw new Error('Ambiguous migration name.');result[name]=hash;}return result;
}
/** Adopt byte hashes from the former Windows snapshot runner without accepting code edits. */
export function compatibleMigrationHistory(manifest,previous) {
 const result={...previous};
 for(const [file,current]of Object.entries(manifest.migrations)) {
  if(!file.includes(manifest.owner==='devkit/codeship'?'/sqlite-migrations/':'/migrations/'))continue;
  const name=file.split('/').at(-1).slice(0,-3),variants=manifest.migrationLineEndings?.[file];
  if(Array.isArray(variants)&&variants.length===2&&variants.includes(current)&&variants.includes(result[name]))result[name]=current;
 }
 return result;
}
