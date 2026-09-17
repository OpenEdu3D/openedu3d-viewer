import { expect, test } from '@playwright/test';
import { createSurfaceAnnotation } from './helpers';

test('缩放更新标注投影，出界锚点在淡化模式也隐藏，重置后恢复且保存数据不变', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#event-log')).toContainText('heart-demo');
  const box = await createSurfaceAnnotation(page, '缩放观察点');
  const label = page.getByRole('button', { name: '缩放观察点', exact: true });
  await expect(label).toBeVisible();
  const saved = await page.locator('#annotation-data').innerText();
  const before = (await label.boundingBox())!;

  await page.getByLabel('遮挡标注', { exact: true }).selectOption('fade');
  await page.mouse.move(box.x + box.width * .25, box.y + box.height * .85);
  await page.mouse.wheel(0, 800);
  await expect.poll(async () => {
    const after = await label.boundingBox();
    return after ? Math.hypot(after.x - before.x, after.y - before.y) : 0;
  }).toBeGreaterThan(3);
  await expect(page.locator('#annotation-data')).toHaveText(saved);

  // Right-button dragging is the public OrbitControls pan interaction.
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(box.x + box.width * .95, box.y + box.height * .85, { steps: 20 });
  await page.mouse.up({ button: 'right' });
  await expect(label).toHaveCount(0);
  await expect(page.locator('#annotation-data')).toHaveText(saved);

  await page.getByRole('button', { name: '重置视角', exact: true }).click();
  await expect(label).toBeVisible();
  await expect(label).toHaveCSS('opacity', '1');
  await expect(page.locator('#annotation-data')).toHaveText(saved);
});
