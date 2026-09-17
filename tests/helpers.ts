import type { Page } from '@playwright/test';

/** Creates an annotation through the same controls and canvas interaction as a consumer. */
export async function createSurfaceAnnotation(page: Page, title: string, description?: string) {
  await page.getByRole('button', { name: '添加三维标注', exact: true }).click();
  const box = await page.getByLabel('三维模型交互画布').boundingBox();
  if (!box) throw new Error('The model interaction canvas must be visible.');
  await page.mouse.click(box.x + box.width * .5, box.y + box.height * .62);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('标注名称', { exact: true }).fill(title);
  if (description !== undefined) await dialog.getByLabel('课堂说明', { exact: true }).fill(description);
  await dialog.getByRole('button', { name: '确认添加', exact: true }).click();
  return box;
}

/** Encodes a GLB JSON chunk, optionally preserving an existing binary chunk. */
export function encodeGlb(document: unknown, tail = Buffer.alloc(0)) {
  const json = Buffer.from(JSON.stringify(document));
  const padded = Math.ceil(json.length / 4) * 4;
  const header = Buffer.alloc(20 + padded, 32);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(header.length + tail.length, 8);
  header.writeUInt32LE(padded, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  json.copy(header, 20);
  return Buffer.concat([header, tail]);
}
