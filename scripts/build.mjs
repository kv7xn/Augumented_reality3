import { cp, mkdir, writeFile, rm } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { startServer } from './server.mjs';

await rm('public', { recursive: true, force: true });
await cp('site', 'public', { recursive: true });
await mkdir('public/vendor', { recursive: true });
await mkdir('public/targets', { recursive: true });
const assets = {
  'three.js': 'three@0.160.0/build/three.module.js',
  'OrbitControls.js': 'three@0.160.0/examples/jsm/controls/OrbitControls.js',
  'CSS3DRenderer.js': 'three@0.160.0/examples/jsm/renderers/CSS3DRenderer.js'
};
async function download(source, destination) {
  const response = await fetch(`https://cdn.jsdelivr.net/npm/${source}`, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Dependency download failed: ${source} (${response.status})`);
  await mkdir(destination.slice(0, destination.lastIndexOf('/')), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}
await Promise.all(Object.entries(assets).map(([name, source]) => download(source, `public/vendor/${name}`)));
// Preserve the package's relative imports, including versioned shared chunks.
const manifestResponse = await fetch('https://data.jsdelivr.com/v1/package/npm/mind-ar@1.2.5/flat', { signal: AbortSignal.timeout(60000) });
if (!manifestResponse.ok) throw new Error(`MindAR distribution listing failed (${manifestResponse.status})`);
const manifest = await manifestResponse.json();
const distribution = manifest.files.filter(file => file.name.startsWith('/dist/') && !file.name.endsWith('.map'));
if (!distribution.length) throw new Error('MindAR distribution is empty');
await Promise.all(distribution.map(file => {
  const relative = file.name.slice('/dist/'.length);
  if (relative.split('/').some(part => part === '..' || part === '.')) throw new Error('Invalid distribution path');
  return download(`mind-ar@1.2.5${file.name}`, `public/vendor/${relative}`);
}));
console.log(`Downloaded ${distribution.length} MindAR distribution files.`);
await cp('scripts/target-art.js', 'public/target-art.js');
await writeFile('public/__compile.html', '<!doctype html><html><head><meta charset="utf-8"><title>Compile targets</title></head><body></body></html>');
const server = await startServer();
let browser;
try {
  browser = await chromium.launch({ args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  page.on('pageerror', error => console.error(error.message));
  page.on('response', response => { if (response.status() >= 400) console.error(`HTTP ${response.status()}: ${response.url()}`); });
  await page.goto('http://127.0.0.1:4173/__compile.html');
  const result = await page.evaluate(async () => {
    const { drawTarget } = await import('./target-art.js');
    const compilerModule = await import('./vendor/mindar-image.prod.js');
    const Compiler = compilerModule.Compiler || window.MINDAR?.IMAGE?.Compiler;
    if (!Compiler) throw new Error(`MindAR compiler API is unavailable; exports: ${Object.keys(compilerModule).join(', ')}`);
    const images = await Promise.all(['earth', 'sun'].map(async kind => {
      const image = new Image();
      image.src = drawTarget(kind).toDataURL('image/png');
      await image.decode();
      return image;
    }));
    const compiler = new Compiler();
    await Promise.race([
      compiler.compileImageTargets(images, () => {}),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Target compilation timed out')), 240000))
    ]);
    return { data: Array.from(new Uint8Array(compiler.exportData())), images: images.map(image => image.src.split(',')[1]) };
  });
  if (result.data.length < 1000) throw new Error('Compiled target data is unexpectedly small');
  await writeFile('public/targets/planets.mind', Buffer.from(result.data));
  await Promise.all(['earth', 'sun'].map((name, index) => writeFile(`public/targets/${name}.png`, Buffer.from(result.images[index], 'base64'))));
  console.log('Compiled Earth and Sun image targets successfully.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await Promise.all(['public/__compile.html', 'public/target-art.js'].map(file => rm(file, { force: true })));
}
