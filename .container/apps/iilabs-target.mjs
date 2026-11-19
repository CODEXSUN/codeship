export function requireIilabsLocalDockerTarget({platform,appRoot,stateRoot,dockerContext,dockerEndpoint}){
 const clean=value=>String(value).replaceAll('\\','/').replace(/\/$/,'').toLowerCase();
 const expected='d:/workspace/codebiz/devkit/codeship/.codeship';
 const owner=clean(appRoot),state=clean(stateRoot);
 if(platform!=='win32'||state!==expected||!(owner===expected.replace(/\/\.codeship$/,'')||owner.startsWith(expected+'/operators/'))||dockerContext!=='desktop-linux'||dockerEndpoint!=='npipe:////./pipe/dockerDesktopLinuxEngine')throw Error('IILabs deployment is restricted to the canonical Windows Docker Desktop target; Ubuntu is stopped.');
}
