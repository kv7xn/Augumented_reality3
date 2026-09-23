import { test, expect } from '@playwright/test';

test('Earth and Sun render and all layer controls work', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#camera')).toBeEnabled();
  await expect(page.locator('#preview canvas')).toBeVisible();
  await expect(page.locator('#object-title')).toHaveText('Earth');
  await page.getByRole('button', { name: 'Inner core', exact: true }).click();
  await expect(page.locator('#cutaway')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#topic-description')).toContainText('solid');
  await page.getByRole('button', { name: 'Magnetic field', exact: true }).click();
  await expect(page.locator('#field')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#choose-sun').click();
  await expect(page.locator('#object-title')).toHaveText('Sun');
  await page.getByRole('button', { name: 'Core & fusion', exact: true }).click();
  await expect(page.locator('#topic-equation')).toContainText('Δmc²');
  await page.locator('#scale').fill('130');
  await expect(page.locator('#scale-value')).toHaveText('130%');
  await page.locator('#rotation').fill('45');
  await expect(page.locator('#rotation-value')).toHaveText('45°');
  await page.locator('#reset').click();
  await expect(page.locator('#scale')).toHaveValue('100');
  await expect(page.locator('#cutaway')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('Mobile layout and reduced motion are respected', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#camera')).toBeEnabled();
  await expect(page.locator('#motion')).toHaveText('Play animation');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  await page.locator('#motion').click();
  await expect(page.locator('#motion')).toHaveText('Pause animation');
});

test('Both exact scan pictures are downloadable', async ({ page }) => {
  await page.goto('/targets.html');
  for (const name of ['earth', 'sun']) {
    const image = page.locator(`img[src="./targets/${name}.png"]`);
    await expect(image).toBeVisible();
    expect(await image.evaluate(element => element.complete && element.naturalWidth === 720)).toBe(true);
  }
  await expect(page.getByRole('link', { name: 'Download Earth picture' })).toHaveAttribute('download', 'orbit-lab-earth.png');
});

test('Denied camera permission preserves the usable preview', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
  });
  await page.goto('/');
  await page.locator('#camera').click();
  await expect(page.locator('#status')).toContainText('permission was denied');
  await expect(page.locator('#preview')).toBeVisible();
  await expect(page.locator('#camera')).toBeEnabled();
  await page.locator('#choose-sun').click();
  await expect(page.locator('#object-title')).toHaveText('Sun');
});

test('Synthetic picture tracking selects the Sun and stop releases the camera', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const context = canvas.getContext('2d');
      const image = new Image(); image.src = new URL('./targets/sun.png', location.href).href; await image.decode();
      function draw() { context.fillStyle = '#ddd'; context.fillRect(0,0,640,480); context.drawImage(image,176,60,288,360); }
      draw(); const timer = setInterval(draw, 66);
      const stream = canvas.captureStream(15);
      window.testTracks = stream.getTracks();
      const track = window.testTracks[0], originalStop = track.stop.bind(track);
      track.stop = () => { clearInterval(timer); originalStop(); };
      return stream;
    };
  });
  await page.goto('/');
  await page.locator('#camera').click();
  await expect(page.locator('#tracking')).toHaveText('SUN LOCKED', { timeout: 60000 });
  await expect(page.locator('#object-title')).toHaveText('Sun');
  await page.locator('#camera').click();
  await expect(page.locator('#preview')).toBeVisible();
  expect(await page.evaluate(() => window.testTracks.every(track => track.readyState === 'ended'))).toBe(true);
});
