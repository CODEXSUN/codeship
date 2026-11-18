/** POSIX df -Pk output: root filesystem usage, shared by containers on the same engine. */
export function parseDiskUsage(output:string):{diskUsedBytes:number|null;diskTotalBytes:number|null}{
 const fields=output.trim().split(/\r?\n/).at(-1)?.trim().split(/\s+/)??[];
 const total=Number(fields.at(-5)),used=Number(fields.at(-4));
 if(fields.length<6||!Number.isFinite(total)||!Number.isFinite(used)||total<=0||used<0||used>total)return {diskUsedBytes:null,diskTotalBytes:null};
 return {diskUsedBytes:used*1024,diskTotalBytes:total*1024};
}
