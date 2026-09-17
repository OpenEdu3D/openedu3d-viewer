import { expect, test } from '@playwright/test';
import { encodeGlb } from './helpers';

test('开发者通过 Vue 组件加载 GLB 并获得加载完成事件', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  await expect(page.locator('canvas')).toBeVisible();
  const events = JSON.parse(await page.locator('#event-log').innerText());
  expect(events.loaded.nodePaths.length).toBeGreaterThan(0);
  expect(events.error).toBeNull();
});

test('WebGL 不可用的浏览器显示可解释的错误，不发出模型加载完成事件', async ({ playwright, baseURL }) => {
  const browser = await playwright.chromium.launch({ args: ['--disable-webgl'] });
  try {
    const page = await browser.newPage();
    await page.goto(baseURL!);
    await expect(page.getByRole('status')).toContainText('WebGL');
    await expect(page.locator('#event-log')).toContainText('webgl-unavailable');
    const events = JSON.parse(await page.locator('#event-log').innerText());
    expect(events.loaded).toBeNull();
    await expect(page.getByRole('button', { name: '添加三维标注', exact: true })).toBeDisabled();
  } finally {
    await browser.close();
  }
});

test('清空和失败来源有明确反馈，不残留旧模型', async ({ page }) => {
  await page.route('**/missing.glb', route => route.fulfill({ status: 404, body: 'Not found' }));
  await page.goto('/');
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  await page.getByRole('button', { name: '清空模型', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('请导入');
  await page.getByRole('button', { name: '加载不存在的模型', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('HTTP 404');
  const events = JSON.parse(await page.locator('#event-log').innerText());
  expect(events.loaded).toBeNull();
  expect(events.error.code).toBe('load-failed');
});

test('不支持的本地文件明确报告格式错误', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  await page.getByLabel('选择 GLB 模型').setInputFiles({ name: 'wrong.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from('not a GLB') });
  await expect(page.locator('#event-log')).toContainText('unsupported-model');
  await expect(page.getByRole('status')).toContainText('仅支持');
});

test('导入动画、压缩及空场景 GLB 会终止编辑并给出格式或有效网格反馈', async ({ page }) => {
  const { readFile } = await import('node:fs/promises');
  const original = await readFile('public/heart.glb');
  const originalJsonLength = original.readUInt32LE(12);
  const originalJson = JSON.parse(original.subarray(20, 20 + originalJsonLength).toString());
  const tail = original.subarray(20 + originalJsonLength);
  const unsupported = [
    { name: 'animated.glb', buffer: encodeGlb({ ...originalJson, animations: [{ channels: [], samplers: [] }] }, tail), code: 'unsupported-model', message: '动画' },
    { name: 'compressed.glb', buffer: encodeGlb({ ...originalJson, extensionsUsed: ['KHR_draco_mesh_compression'] }, tail), code: 'unsupported-model', message: '压缩' },
    { name: 'empty.glb', buffer: encodeGlb({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }], nodes: [] }), code: 'invalid-model', message: '有效网格' }
  ];
  await page.goto('/');
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  for (const file of unsupported) {
    await page.getByLabel('选择 GLB 模型').setInputFiles({ name: file.name, mimeType: 'model/gltf-binary', buffer: file.buffer });
    await expect(page.getByRole('status')).toContainText(file.message);
    await expect(page.locator('#event-log')).toContainText(file.code);
    await expect(page.getByRole('button', { name: '添加三维标注', exact: true })).toBeDisabled();
  }
  await page.getByRole('button', { name: '重新载入心脏', exact: true }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '添加三维标注', exact: true })).toBeEnabled();
});

test('教师可以导入本地 GLB，宿主获得新的模型描述', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  await page.getByLabel('选择 GLB 模型').setInputFiles('public/heart.glb');
  await expect(page.locator('#event-log')).not.toContainText('heart-demo');
  const events = JSON.parse(await page.locator('#event-log').innerText());
  expect(events.loaded.nodePaths.length).toBeGreaterThan(0);
});

test('最新 URL 生效，卸载后迟到请求不会发出加载事件', async ({ page }) => {
  const { readFile } = await import('node:fs/promises');
  const body = await readFile('public/heart.glb');
  function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>(complete => { resolve = complete; });
    return { promise, resolve };
  }
  function pendingLoad() {
    return { requested: deferred(), gate: deferred(), settled: deferred() };
  }
  let pending = pendingLoad();
  await page.route('**/slow.glb', async route => {
    const request = pending;
    request.requested.resolve();
    await request.gate.promise;
    try {
      await route.fulfill({ body, contentType: 'model/gltf-binary' });
    } catch {
      // The consumer has already cancelled this browser request.
    } finally {
      request.settled.resolve();
    }
  });
  const cancelled = () => page.waitForEvent('requestfailed', request => new URL(request.url()).pathname === '/slow.glb');
  const settleRendering = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const history = async () => JSON.parse(await page.locator('#event-history').innerText()).map((event: { modelId: string }) => event.modelId);
  await page.goto('/');
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  await page.getByLabel('模型 URL', { exact: true }).fill('/slow.glb');
  await page.getByRole('button', { name: '加载 URL', exact: true }).click();
  await pending.requested.promise;
  const replaced = cancelled();
  await page.getByRole('button', { name: '重新载入心脏', exact: true }).click();
  await replaced;
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  pending.gate.resolve();
  await pending.settled.promise;
  await settleRendering();
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(await history()).toEqual(['heart-demo', 'heart-demo']);

  pending = pendingLoad();
  await page.getByRole('button', { name: '加载 URL', exact: true }).click();
  await pending.requested.promise;
  const unmounted = cancelled();
  await page.getByLabel('挂载组件', { exact: true }).uncheck();
  await unmounted;
  pending.gate.resolve();
  await pending.settled.promise;
  await settleRendering();
  await expect(page.getByLabel('三维模型交互画布')).toHaveCount(0);
  expect(JSON.parse(await page.locator('#event-log').innerText()).loaded).toBeNull();
  expect(await history()).toEqual(['heart-demo', 'heart-demo']);
  await page.getByRole('button', { name: '重新载入心脏', exact: true }).click();
  await page.getByLabel('挂载组件', { exact: true }).check();
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  expect(await history()).toEqual(['heart-demo', 'heart-demo', 'heart-demo']);
});

test('本地 GLB 引用外部资源时给出内嵌资源提示', async ({ page }) => {
  const file = encodeGlb({ asset: { version: '2.0' }, buffers: [{ uri: 'external.bin', byteLength: 8 }] });
  await page.goto('/');
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  await page.getByLabel('选择 GLB 模型').setInputFiles({ name: 'external.glb', mimeType: 'model/gltf-binary', buffer: file });
  await expect(page.getByRole('status')).toContainText('内嵌');
  await expect(page.locator('#event-log')).toContainText('unsupported-model');
});
