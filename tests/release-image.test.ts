import test from 'node:test';import assert from 'node:assert/strict';
import {resolveReleaseImage} from '../.container/release-image.mjs';
const imageId='sha256:'+'a'.repeat(64),manifest={schema:1,owner:'apps/crm',repository:'CODEXSUN/crm',tag:'v-0.1.1',version:'0.1.1',commit:'b'.repeat(40),image:'ghcr.io/codexsun/crm@sha256:'+'c'.repeat(64),imageId,migrations:{}};
test('approved exact image content is reused without pulling or trusting a mutable tag',async()=>{
 const calls:string[][]=[];const image=await resolveReleaseImage(manifest,args=>{calls.push(args);if(args[0]==='info')return '[]';assert.deepEqual(args.slice(0,3),['image','inspect',imageId]);return imageId;},'unused');
 assert.equal(image,imageId);assert.equal(calls.length,2);
});
test('a different cached image cannot satisfy approved content identity',async()=>{
 let pulls=0;await assert.rejects(()=>resolveReleaseImage(manifest,args=>{if(args[0]==='info')return '[]';if(args[0]==='pull'){pulls++;return '';}return 'sha256:'+'d'.repeat(64);},'unused'),/content differs/);assert.equal(pulls,1);
});
test('missing content follows the registry path and verifies its image ID',async()=>{
 const calls:string[][]=[];assert.equal(await resolveReleaseImage(manifest,args=>{calls.push(args);if(args[0]==='info')return '[]';if(args[0]==='image'&&args[2]===imageId)throw Error('Not found');return args[0]==='pull'?'':imageId;},'unused'),manifest.image);assert.equal(calls.length,4);
});

test('incompatible store fails before any image pull or load',async()=>{const calls:string[][]=[];await assert.rejects(resolveReleaseImage({...manifest,image:'ghcr.io/codexsun/crm@'+imageId},args=>{calls.push(args);assert.equal(args[0],'info');return '[]';},'unused'),/containerd image store/);assert.equal(calls.length,1);});
