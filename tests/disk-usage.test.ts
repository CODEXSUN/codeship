import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDiskUsage} from '../scripts/disk-usage.ts';
test('filesystem usage parses POSIX df bytes and rejects unsupported or invalid results',()=>{
 assert.deepEqual(parseDiskUsage('Filesystem 1024-blocks Used Available Capacity Mounted on\noverlay 1000 250 750 25% /\n'),{diskUsedBytes:256000,diskTotalBytes:1024000});
 for(const text of ['', 'df: unavailable','overlay 0 0 0 0% /','overlay 100 200 0 100% /'])assert.deepEqual(parseDiskUsage(text),{diskUsedBytes:null,diskTotalBytes:null});
});
