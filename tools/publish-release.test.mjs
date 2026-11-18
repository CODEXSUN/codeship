import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {publishRelease} from './publish-release.mjs';
test('release helper preserves unreviewed files, publishes an annotated tag atomically and refuses tag reuse',()=>{
 const base=mkdtempSync(path.join(tmpdir(),'codeship-publish-')),root=path.join(base,'app'),remote=path.join(base,'remote.git');mkdirSync(root);
 const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git(['init','--bare',remote],base);git(['init','--initial-branch=main']);git(['config','user.name','Release test']);git(['config','user.email','release@example.invalid']);git(['remote','add','origin',remote]);
  mkdirSync(path.join(root,'docs'));writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'release-test',version:'1.0.1'}));writeFileSync(path.join(root,'package-lock.json'),JSON.stringify({version:'1.0.1',packages:{'':{version:'1.0.1'}}}));writeFileSync(path.join(root,'docs/CHANGELOG.md'),'Current version: 1.0.1\nRelease tag: v-1.0.1\nChangelog label: v 1.0.1\n\n## v-1.0.1\n\n### [v 1.0.1] 2026-11-18 - Reviewed release\n\n- Verified contract.\n');git(['add','.']);
  writeFileSync(path.join(root,'unreviewed.txt'),'other work');assert.throws(()=>publishRelease(root,{confirm:true,initial:true}),/Untracked/);git(['add','.']);
  writeFileSync(path.join(root,'bad.txt'),'trailing whitespace \n');git(['add','bad.txt']);assert.throws(()=>publishRelease(root,{confirm:true,initial:true}));git(['rm','--cached','--force','bad.txt']);rmSync(path.join(root,'bad.txt'));
  publishRelease(root,{confirm:true,initial:true});
  assert.equal(git(['cat-file','-t','refs/tags/v-1.0.1'],remote),'tag');assert.equal(git(['rev-parse','main'],remote),git(['rev-parse','HEAD']));
  writeFileSync(path.join(root,'more.txt'),'next');git(['add','.']);assert.throws(()=>publishRelease(root,{confirm:true}),/already exists/);assert.ok(git(['diff','--cached','--name-only']).includes('more.txt'));
 }finally{rmSync(base,{recursive:true,force:true});}
});
