const {buildSync}=require('esbuild');
buildSync({entryPoints:['media/index.mjs'],outfile:'media/dist/index.mjs',bundle:true,platform:'node',format:'esm',target:'node24',banner:{js:"import {createRequire} from 'node:module'; const require = createRequire(import.meta.url);"}});
