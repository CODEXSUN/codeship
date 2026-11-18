/** Compose raw env files preserve $, quote characters and # literally. Node helpers use dotenv separately. */
export function rawEnvironment(values) {
 return Object.entries(values).map(([key,value])=>{
  if(!/^[A-Z][A-Z0-9_]*$/.test(key)||typeof value!=='string'||/[\r\n\0]/.test(value))throw new Error('Runtime environment requires safe keys and single-line values.');
  return key+'='+value;
 }).join('\n')+'\n';
}
export function requireRawCompose(version) {
 const match=/^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
 if(!match||Number(match[1])<2||(Number(match[1])===2&&Number(match[2])<30))throw new Error('CodeShip requires Docker Compose 2.30 or later for literal environment values.');
}
