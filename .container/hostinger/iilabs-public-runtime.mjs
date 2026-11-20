import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHttpServer,registerFrontend} from '/opt/codebiz/foundation/framework/dist/src/index.js';

if(!existsSync('/.dockerenv')||process.cwd()!=='/opt/codebiz/apps/iilabs'||process.env.IILABS_PUBLIC_ONLY!=='1')throw Error('Use the approved public-site container.');
const root='/opt/codebiz/apps/iilabs/public-site/dist';
const app=createHttpServer({name:'IILabs public website',logLevel:'info'});
const pages=new Map([['/','index.html'],['/services','services/index.html'],['/services/','services/index.html'],['/approach','approach/index.html'],['/approach/','approach/index.html'],['/studio','studio/index.html'],['/studio/','studio/index.html']]);
const files=new Set(['/sculpture.js','/favicon.svg','/campaign-brief.txt','/404.html']);
app.addHook('onRequest',async(request,reply)=>{
  reply.header('X-Content-Type-Options','nosniff').header('Referrer-Policy','same-origin');
  const path=request.url.split('?')[0];
  if(path==='/health'||pages.has(path))return;
  if(/^\/(?:api|platform-api|login|admin|workspace|dashboard)(?:\/|$)/.test(path))return reply.code(503).send({message:'Backend is not configured.',mode:'public-site-only'});
  if(!files.has(path)&&!['/styles/','/assets/','/shared-ui/'].some(prefix=>path.startsWith(prefix)))return reply.code(404).send({message:'Page not found.'});
});
app.get('/health',async()=>({status:'ready',mode:'public-site-only',backendConfigured:false}));
for(const [route,file]of pages)app.get(route,async(_request,reply)=>reply.header('Cache-Control','no-store').type('text/html').send(await readFile(root+'/'+file)));
registerFrontend(app,root);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close());
await app.listen({host:'0.0.0.0',port:4435});
