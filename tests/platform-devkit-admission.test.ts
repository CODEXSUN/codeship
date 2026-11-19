import test from 'node:test';import assert from 'node:assert/strict';
import {devkitAdmissionProfile} from '../.container/devkits/platform-admission.mjs';
test('devkit admission binds the existing tenant, fixed service port, exact image and explicit permissions',()=>{
 const release={version:'1.0.23',releaseImage:'ghcr.io/codexsun/codeship@sha256:'+'a'.repeat(64)},settings={CODESHIP_PLATFORM_SERVICE_TOKEN:'b'.repeat(64)};
 const profile=devkitAdmissionProfile('codeship',release,settings);assert.equal(profile.manifest.internalOrigin,'http://codeship:4350');assert.equal(profile.manifest.tenantCorporateId,'codexsun');assert.deepEqual(profile.manifest.permissionKeys,['codeship/workspace:read','codeship/workspace:manage']);
 assert.throws(()=>devkitAdmissionProfile('unknown',release,settings));assert.throws(()=>devkitAdmissionProfile('codeship',{...release,releaseImage:'ghcr.io/codexsun/codeship:latest'},settings));assert.throws(()=>devkitAdmissionProfile('codeship',release,{}));
});
