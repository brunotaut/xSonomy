// Run after editing src/assets/atlas/{atlas,model}.js. Retain older hashed files
// for clients whose HTML is still cached during a GitHub Pages rollout.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),assets=new URL('src/assets/atlas/',root);
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,12);
const model=await readFile(new URL('model.js',assets),'utf8'),modelName=`model-${hash(model)}.js`;
await writeFile(new URL(modelName,assets),model);
const app=(await readFile(new URL('atlas.js',assets),'utf8')).replace("'./model.js'",`'./${modelName}'`),appName=`atlas-${hash(app)}.js`;
await writeFile(new URL(appName,assets),app);
for(const page of ['landscape','landscape-next']){const path=new URL(`src/${page}/index.html`,root);await writeFile(path,(await readFile(path,'utf8')).replace(/\/assets\/atlas\/atlas(?:-[a-f0-9]+)?\.js/g,`/assets/atlas/${appName}`))}
const testPath=new URL('scripts/test/atlas-ui.test.mjs',root);await writeFile(testPath,(await readFile(testPath,'utf8')).replace(/\/assets\/atlas\/model(?:-[a-f0-9]+)?\.js/g,`/assets/atlas/${modelName}`));
console.log(`Atlas assets: ${appName}, ${modelName}`);
