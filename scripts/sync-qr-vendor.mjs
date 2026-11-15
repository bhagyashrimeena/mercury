import { createRequire } from 'node:module';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const source = require.resolve('jsqr');
const target = new URL('../public/vendor/', import.meta.url);
await mkdir(target, { recursive: true });
await copyFile(source, new URL('jsQR.js', target));
await copyFile(resolve(dirname(source), '../LICENSE'), new URL('jsQR.LICENSE.txt', target));
