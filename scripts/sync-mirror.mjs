import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// The a702 entry point is a distribution mirror. Only public source is copied.
const root = fileURLToPath(new URL('../', import.meta.url));
const mirror = path.join(root, 'a702');
await mkdir(mirror, { recursive: true });
for (const name of ['src', 'public', 'index.html', 'vite.config.js', 'meterial.txt']) {
  await cp(path.join(root, name), path.join(mirror, name), { recursive: true, force: true });
}
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
manifest.scripts = { dev: 'vite', build: 'vite build', preview: 'vite preview' };
await writeFile(path.join(mirror, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
await cp(path.join(root, 'package-lock.json'), path.join(mirror, 'package-lock.json'));
await writeFile(path.join(mirror, 'README.md'), '# Civiquill a702 entry point\n\nThis is the distribution mirror of the [main Civiquill website](../README.md). Edit the parent source. From the parent website directory, run `npm run sync:mirror` or `npm run build:all`.\n\nFrom this directory, use `npm run dev`, `npm run build`, or `npm run preview`. Public asset paths support subpath hosting. Local environment files are independent and never copied by the sync script.\n\nSee [brand guidelines](../../BRANDING.md), [contract integration](../../contracts/INTEGRATION.md), and [social assets](../../twitter/README.md). The bundled EvidaraEscrow ABI preserves deployed compatibility.\n');
console.log('Civiquill a702 mirror synchronized; environment files remain local.');
