/** Admit only a recent host-collected record for this exact application container. */
export function hasFreshApplicationMetrics(report,name,id,now) {
  if(!report || report.available!==true || !Array.isArray(report.containers) || typeof id!=='string' || !/^[a-f0-9]{64}$/.test(id))return false;
  const collected=Date.parse(report.collectedAt);
  if(!Number.isFinite(collected) || collected>now || now-collected>=45000)return false;
  return report.containers.some(row=>row && row.project==='applications' && row.service===name && row.owner==='apps/'+name && typeof row.id==='string' && /^[a-f0-9]{12,64}$/.test(row.id) && id.startsWith(row.id));
}
