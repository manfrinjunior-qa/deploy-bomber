import { expect, test } from '@playwright/test';

type G = { __game: { scene: { getScenes: (a: boolean) => { scene: { key: string } }[]; getScene: (k: string) => any } } };
const activeScene = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as G).__game.scene.getScenes(true).map((s) => s.scene.key)[0]);

test('menu → seleção → arena com 2 jogadores no mesmo teclado', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect.poll(() => activeScene(page), { timeout: 15_000 }).toBe('Title');

  await page.keyboard.press('Enter'); // Modo História
  await expect.poll(() => activeScene(page)).toBe('CharacterSelect');

  await page.keyboard.press('KeyR'); // P2 entra
  await page.keyboard.press('KeyQ'); // P1 pronto
  await page.keyboard.press('KeyR'); // P2 pronto
  await page.keyboard.press('Enter');
  await expect.poll(() => activeScene(page)).toBe('Arena');

  // história 1: cada um começa no seu canto do mapa
  const spawn = await page.evaluate(() =>
    (window as unknown as G).__game.scene.getScene('Arena').world.players.map((p: { slot: number; x: number; y: number }) => [p.slot, p.x, p.y]),
  );
  expect(spawn).toEqual([
    [0, 1, 1],
    [1, 13, 1],
  ]);

  // depois do "PRONTO? VAI!", P1 anda e solta uma bomba
  await page.waitForTimeout(2600);
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyS');
  await page.keyboard.press('KeyQ');
  const world = () =>
    page.evaluate(() => {
      const w = (window as unknown as G).__game.scene.getScene('Arena').world;
      return { y: w.players[0].y, bombs: w.bombs.length };
    });
  await expect.poll(async () => (await world()).bombs).toBe(1);
  expect((await world()).y).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});
