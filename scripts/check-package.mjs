import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const scratch = await mkdtemp(join(tmpdir(), 'openedu3d-consumer-'));
const consumer = join(scratch, 'consumer');
let server;
let browser;
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: 'inherit' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed`);
}
async function version(name) { return JSON.parse(await readFile(join(root, 'node_modules', name, 'package.json'), 'utf8')).version; }
try {
  run('npm', ['run', 'build']);
  run('npm', ['pack', '--pack-destination', scratch]);
  const meta = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const archive = join(scratch, `${meta.name.replace('@', '').replace('/', '-')}-${meta.version}.tgz`);
  await mkdir(join(consumer, 'public'), { recursive: true });
  const dependencies = { '@openedu3d/viewer': `file:${archive}` };
  for (const name of ['vue', 'three', 'vite', '@vitejs/plugin-vue', 'typescript', 'vue-tsc', '@types/three', '@types/node']) dependencies[name] = await version(name);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies }));
  await writeFile(join(consumer, 'index.html'), '<html><body><div id="app"></div><script type="module" src="/main.ts"></script></body></html>');
  await writeFile(join(consumer, 'main.ts'), "import { createApp } from 'vue';\nimport '@openedu3d/viewer/style.css';\nimport App from './App.vue';\ncreateApp(App).mount('#app');\n");
  await writeFile(join(consumer, 'App.vue'), (await readFile(join(root, 'examples/App.vue'), 'utf8')).replace("'../src/index'", "'@openedu3d/viewer'"));
  const readme = await readFile(join(root, 'README.md'), 'utf8');
  const snippets = [...readme.matchAll(/```vue\n([\s\S]*?)\n```/g)].map(match => match[1]).filter(code => code.startsWith('<script'));
  assert(snippets.length > 0, 'README must contain a complete Vue example');
  for (const [index, snippet] of snippets.entries()) await writeFile(join(consumer, `ReadmeExample${index}.vue`), snippet);
  await writeFile(join(consumer, 'readme.html'), '<html><body><div id="app"></div><script type="module" src="/readme.ts"></script></body></html>');
  await writeFile(join(consumer, 'readme.ts'), "import { createApp } from 'vue';\nimport App from './ReadmeExample0.vue';\ncreateApp(App).mount('#app');\n");
  await writeFile(join(consumer, 'vite.config.ts'), "import vue from '@vitejs/plugin-vue';\nexport default { plugins: [vue()], build: { rollupOptions: { input: { main: 'index.html', readme: 'readme.html' } } } };\n");
  await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'ESNext', moduleResolution: 'Bundler', strict: true, skipLibCheck: true, noEmit: true, lib: ['ES2020', 'DOM'], types: ['node'] }, include: ['*.ts', '*.vue'] }));
  await copyFile(join(root, 'public/heart.glb'), join(consumer, 'public/heart.glb'));
  await mkdir(join(consumer, 'public/models'));
  await copyFile(join(root, 'public/heart.glb'), join(consumer, 'public/models/heart.glb'));
  run('npm', ['install', '--registry=https://registry.npmjs.org', '--fetch-timeout=30000', '--fetch-retries=1', '--cache', join(tmpdir(), 'openedu3d-npm-cache'), '--no-audit', '--no-fund'], consumer);
  run('node', ['--input-type=module', '-e', "import { ModelAnnotationViewer } from '@openedu3d/viewer'; if (!ModelAnnotationViewer) throw Error('Missing export');"], consumer);
  run('node', ['-e', "if (!require('@openedu3d/viewer').ModelAnnotationViewer) throw Error('Missing CJS export');"], consumer);
  run('npm', ['exec', 'vue-tsc', '--', '--noEmit'], consumer);
  run('npm', ['exec', 'vite', '--', 'build'], consumer);
  server = spawn('npm', ['exec', 'vite', '--', 'preview', '--host', '127.0.0.1', '--port', '5176', '--strictPort'], { cwd: consumer, stdio: 'inherit', detached: true });
  const url = 'http://127.0.0.1:5176';
  let available = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(url)).ok) { available = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(available, 'Consumer preview server did not start');
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.locator('#event-log').filter({ hasText: 'heart-demo' }).waitFor();
  assert.equal(await page.getByLabel('三维模型交互画布').evaluate(element => getComputedStyle(element).position), 'absolute', 'Published CSS missing');
  await page.getByRole('button', { name: '添加三维标注', exact: true }).click();
  const box = await page.getByLabel('三维模型交互画布').boundingBox();
  await page.mouse.click(box.x + box.width * .5, box.y + box.height * .62);
  await page.getByRole('dialog').getByLabel('标注名称', { exact: true }).fill('打包后的标注');
  await page.getByRole('dialog').getByRole('button', { name: '确认添加', exact: true }).click();
  await page.getByRole('button', { name: '打包后的标注', exact: true }).waitFor();
  const data = JSON.parse(await page.locator('#annotation-data').innerText());
  assert.equal(data[0].modelId, 'heart-demo');
  await page.getByLabel('课堂展示模式', { exact: true }).check();
  assert.equal(await page.getByRole('button', { name: '添加三维标注', exact: true }).count(), 0);
  await page.goto(`${url}/readme.html`);
  await expect(page.getByRole('button', { name: '添加三维标注', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '添加三维标注', exact: true }).click();
  const readmeBox = await page.getByLabel('三维模型交互画布').boundingBox();
  await page.mouse.click(readmeBox.x + readmeBox.width * .5, readmeBox.y + readmeBox.height * .62);
  await page.getByRole('dialog').getByLabel('标注名称', { exact: true }).fill('README 接入验证');
  await page.getByRole('dialog').getByRole('button', { name: '确认添加', exact: true }).click();
  await expect(page.getByRole('button', { name: 'README 接入验证', exact: true })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('Installed tarball: ESM/CJS, consumer + README types, production build, CSS, WebGL, annotation binding, present mode and README example passed.');
} finally {
  await browser?.close();
  if (server?.pid) { try { process.kill(-server.pid, 'SIGTERM'); } catch {} }
  await rm(scratch, { recursive: true, force: true });
}
