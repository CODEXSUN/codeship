import test from 'node:test';import assert from 'node:assert/strict';
import {requireReleaseImageStore} from '../.container/release-image.mjs';
const id='sha256:'+'a'.repeat(64);
test('manifest identity releases require matching containerd store before image effects',()=>{const manifest={image:'ghcr.io/codexsun/platform@'+id,imageId:id};assert.doesNotThrow(()=>requireReleaseImageStore(manifest,[['driver-type','io.containerd.snapshotter.v1']]));assert.throws(()=>requireReleaseImageStore(manifest,[['Backing Filesystem','extfs']]),/containerd image store/);assert.throws(()=>requireReleaseImageStore(manifest,[]),/target differs/);});
test('legacy config identity manifests are not relabelled as manifest identities',()=>{assert.doesNotThrow(()=>requireReleaseImageStore({image:'ghcr.io/codexsun/platform@'+id,imageId:'sha256:'+'b'.repeat(64)},[]));});
