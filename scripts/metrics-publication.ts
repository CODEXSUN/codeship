import {mkdir,writeFile,rename,chmod,chown} from 'node:fs/promises';
import path from 'node:path';
/** Only redacted snapshots are shared with the non-root inventory container. */
export async function publishMetricSnapshot(file:string,body:string){
 const configured=process.env.CODESHIP_METRICS_READER_UID;
 if(configured!==undefined&&configured!=='1000')throw new Error('Unapproved metrics reader.');
 const shared=configured==='1000'&&process.platform==='linux'&&process.getuid?.()===0;
 const directory=path.dirname(file);await mkdir(directory,{recursive:true,mode:0o700});
 if(shared){await chown(directory,0,1000);await chmod(directory,0o750);}
 const temporary=file+'.next';await writeFile(temporary,body,{mode:0o600});
 if(shared){await chown(temporary,0,1000);await chmod(temporary,0o640);}
 await rename(temporary,file);
}
