import {validateManifest} from '../release-policy.mjs';
import {validReleaseAssetUrl} from '../latest-release.mjs';
export function validateUpdateTicket(ticket,name){
 if(!['codeship','codeitz','uiux'].includes(name)||ticket.schema!==1||ticket.selected!==name||ticket.source!=='github'||!/^\d+\.\d+\.\d+$/.test(ticket.tooling?.version)||ticket.tooling.tag!=='v-'+ticket.tooling.version||!/^[a-f0-9]{40}$/.test(ticket.tooling.commit??''))throw Error('Invalid approved update ticket');
 const age=Date.now()-Date.parse(ticket.approvedAt);if(!Number.isFinite(age)||age< -30000||age>30*60*1000)throw Error('Update approval expired; resolve GitHub again locally');
 const m=ticket.manifest;if(!/^[a-f0-9]{40}$/.test(m?.commit??''))throw Error('Invalid application source commit');validateManifest(m,{owner:'devkit/'+name,repository:'CODEXSUN/'+name,tag:m.tag,commit:m.commit});
 if(!/^sha256:[a-f0-9]{64}$/.test(m.imageId??'')||m.archive?.name!=='image.tar.gz'||!/^[a-f0-9]{64}$/.test(m.archive?.sha256??'')||!validReleaseAssetUrl(ticket.archiveUrl))throw Error('Invalid approved image archive');
 return ticket;
}
export function remoteUpdateCommand(tooling,name){
 if(!['codeship','codeitz','uiux'].includes(name)||!/^v-\d+\.\d+\.\d+$/.test(tooling.tag)||!/^[a-f0-9]{40}$/.test(tooling.commit))throw Error('Invalid deployment source');
 const script=['set -eu','export GIT_TERMINAL_PROMPT=0','cd /home/codebiz/devkit/codeship',
  '[ "$(git remote get-url origin)" = https://github.com/CODEXSUN/codeship.git ]',
  '[ -z "$(git status --porcelain)" ]',
  'git fetch --quiet origin refs/tags/'+tooling.tag+':refs/tags/'+tooling.tag,
  '[ "$(git rev-parse '+tooling.tag+'^{commit})" = '+tooling.commit+' ]',
  '[ -z "$(git ls-tree --name-only '+tooling.tag+' -- .codeship node_modules .env)" ]',
  'git checkout --quiet --detach '+tooling.tag,
  'exec sh .container/hostinger/update.sh '+name+' --receive'].join('\n');
 return "flock -n /tmp/cxapp-update.lock env CODESHIP_HOSTINGER_FLOCK=1 sh -c '"+script.replaceAll("'","'\"'\"'")+"'";
}
