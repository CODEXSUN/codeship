import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const [target,...selected]=process.argv.slice(2);
if(!['local','staging'].includes(target))throw Error('Browser acceptance runs only on local/staging, never production.');
const ports={platform:14385,codeship:14350,codeitz:14305,uiux:14315,iilabs:14435};
const names=selected.length?selected:Object.keys(ports);
if(names.some(name=>!Object.hasOwn(ports,name)))throw Error('Select an approved product.');
const module=process.env.CODESHIP_BROWSER_TEST_MODULE;
if(!module||!fs.existsSync(module))throw Error('Provide the already installed Playwright module path; this test does not install a browser.');
const {chromium}=await import(pathToFileURL(module).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.CODESHIP_BROWSER_EXECUTABLE??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const directory='.codeship/login-role-audit/'+target;fs.mkdirSync(directory,{recursive:true});
const results=[];
try{
 for(const name of names)for(const theme of ['light','dark'])for(const role of [
  {path:'/login',label:'User access',icon:'user'},
  {path:'/admin/login',label:'Admin access',icon:'shield',tone:'bg-blue-700'},
  {path:'/sa/login',label:'Super admin access',icon:'crown',tone:'bg-green-700'},
 ]){
  const context=await browser.newContext({viewport:{width:1440,height:1100},colorScheme:theme});
  try{
   const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
   const origin='http://127.0.0.1:'+(ports[name]+(target==='staging'?10000:0));
   const response=await page.goto(origin+role.path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
   const badge=page.getByRole('img',{name:role.label,exact:true});await badge.waitFor({state:'visible',timeout:30000});
   await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),theme==='dark');
   const submit=page.locator('button[type="submit"]');assert.equal(await submit.count(),1);
   assert.ok((await badge.locator('svg').getAttribute('class')).includes(role.icon));
   assert.ok((await submit.locator('svg').first().getAttribute('class')).includes(role.icon));
   const background=await submit.evaluate((node,tone)=>{
    const actual=getComputedStyle(node).backgroundColor;
    if(tone){const probe=document.createElement('span');probe.className=tone;document.body.append(probe);const expected=getComputedStyle(probe).backgroundColor;probe.remove();if(actual!==expected||actual==='rgba(0, 0, 0, 0)')throw Error('Role color was overridden by app theme.');}
    return actual;
   },role.tone);
   if(role.tone){assert.ok((await submit.getAttribute('class')).includes(role.tone));assert.ok((await badge.getAttribute('class')).includes(role.tone));assert.equal(await badge.evaluate(node=>getComputedStyle(node).backgroundColor),background);}
   if(name==='iilabs')assert.equal(await page.getByRole('link',{name:/^(Admin login|Client login)$/}).count(),0);
   assert.deepEqual(errors,[]);
   const key=role.path.includes('/sa/')?'sa':role.path.includes('/admin/')?'admin':'user';
   await page.screenshot({path:directory+'/'+name+'-'+key+'-'+theme+'.png',fullPage:true});
   results.push({name,theme,path:role.path,badge:role.label,icon:role.icon,background,roleLinksHidden:name==='iilabs'});
  }finally{await context.close();}
 }
 fs.writeFileSync(directory+'/appearance.json',JSON.stringify({at:new Date().toISOString(),target,anonymousVisualChecksOnly:true,results},null,2));
 console.log(target+': '+results.length+' original login route, badge, icon, color and visibility checks passed.');
}finally{await browser.close();}
