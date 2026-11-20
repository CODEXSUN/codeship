import test from 'node:test';
import assert from 'node:assert/strict';
import {platformRuntimeProbeSettings,probePlatformRuntime,platformRuntimeProbeCode} from '../.container/apps/platform-runtime-probe.mjs';

const environment={PLATFORM_GATEWAY_ENABLED:'0',PLATFORM_GATEWAY_ALLOWED_ORIGINS:'[]',PLATFORM_TENANCY_MODE:'single',PLATFORM_SINGLE_TENANT_CORPORATE_ID:'codexsun',PLATFORM_ENTRY_BINDINGS:'[]',PLATFORM_MASTER_DATABASE_URL:'postgres://secret',PLATFORM_PASSWORD:'never-send',PLATFORM_SIGNING_KEY:'never-send'};
const origins=['http://127.0.0.1:4345','http://codeship:4350'];

test('Hostinger probe preserves saved origins and sends only nonsecret routing/tenancy fields',()=>{
 const values=platformRuntimeProbeSettings(environment,{hostinger:true,localServiceOrigins:origins});
 assert.equal(values.PLATFORM_GATEWAY_ENABLED,'1');assert.equal(values.PLATFORM_GATEWAY_ALLOWED_ORIGINS,'[]');assert.equal(values.PLATFORM_GATEWAY_IMAGE_UPLOADS,'[]');
 assert.equal(values.PLATFORM_TENANCY_MODE,'single');assert.equal(values.PLATFORM_SINGLE_TENANT_CORPORATE_ID,'codexsun');
 assert.ok(!JSON.stringify(values).includes('secret'));assert.ok(!JSON.stringify(values).includes('never-send'));
});

test('local probe uses the same generated service origins and upload route as final Compose',()=>{
 const values=platformRuntimeProbeSettings(environment,{hostinger:false,localServiceOrigins:origins});
 assert.deepEqual(JSON.parse(values.PLATFORM_GATEWAY_ALLOWED_ORIGINS),origins);
 assert.deepEqual(JSON.parse(values.PLATFORM_GATEWAY_IMAGE_UPLOADS),[{appKey:'ecommerce',path:'/api/v1/desk/product-images'}]);
});

test('candidate probe uses release-owned validators on stdin without settings mounts or networking',()=>{
 let called=false;
 probePlatformRuntime('sha256:fixture',environment,{hostinger:true,localServiceOrigins:origins},(args,input)=>{
  called=true;assert.deepEqual(args.slice(0,7),['run','--rm','-i','--network','none','--entrypoint','node']);
  assert.ok(!args.includes('--mount'));assert.ok(!args.includes('--env-file'));
  assert.deepEqual(args.slice(7,-1),['sha256:fixture','--input-type=module','-e']);
  assert.equal(args.at(-1),platformRuntimeProbeCode);assert.ok(!args.join(' ').includes('never-send'));
  const settings=JSON.parse(input!);assert.equal(settings.PLATFORM_GATEWAY_ALLOWED_ORIGINS,'[]');
  assert.match(platformRuntimeProbeCode,/readGatewayConfiguration\(values,'production'\)/);
  assert.match(platformRuntimeProbeCode,/readTenancyConfiguration\(values\)/);assert.match(platformRuntimeProbeCode,/readEntryBindings\(values.PLATFORM_ENTRY_BINDINGS\)/);
  return '';
 });assert.equal(called,true);
});

test('candidate validation failure reports saved-setting correction without child output or credentials',()=>{
 assert.throws(()=>probePlatformRuntime('sha256:fixture',environment,{hostinger:true,localServiceOrigins:origins},()=>{throw Error('never-send');}),error=>/correct saved settings locally/.test(String(error))&&!String(error).includes('never-send'));
});
