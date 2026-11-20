import cp from 'node:child_process';
export function assertCleanCheckout(directory,tooling){
 const git=args=>cp.execFileSync('git',args,{cwd:directory,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
 if(git(['ls-tree','--name-only',tooling.tag,'--','.codeship','node_modules','.env']))throw Error('Release must not track private state or runtime dependencies');
 if(git(['remote','get-url','origin'])!=='https://github.com/CODEXSUN/codeship.git'||git(['status','--porcelain'])||git(['rev-parse','HEAD'])!==tooling.commit||git(['rev-parse',tooling.tag+'^{commit}'])!==tooling.commit)throw Error('Run the updater from the clean published CodeShip tooling tag');
}
