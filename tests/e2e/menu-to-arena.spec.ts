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

test('seleção: esquerda/direita percorrem as 5 variantes e voltam ao Personalizado', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect.poll(() => activeScene(page), { timeout: 15_000 }).toBe('Title');
  await page.keyboard.press('Enter');
  await expect.poll(() => activeScene(page)).toBe('CharacterSelect');

  const variant = () => page.evaluate(() => (window as unknown as G).__game.scene.getScene('CharacterSelect').slots[0].variant);
  expect(await variant()).toBe(0);
  const seen: number[] = [];
  for (let k = 0; k < 5; k++) {
    await page.keyboard.press('KeyD');
    await expect.poll(variant).toBe((k + 1) % 5);
    seen.push(await variant());
  }
  expect(seen).toEqual([1, 2, 3, 4, 0]);
  await page.keyboard.press('KeyA');
  await expect.poll(variant).toBe(4); // volta pela esquerda até o Astronauta/Mobile
  expect(errors).toEqual([]);
});

test('título → Personagens: navega por papéis e variantes e volta', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect.poll(() => activeScene(page), { timeout: 15_000 }).toBe('Title');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown', { delay: 50 }); // um toque por quadro
  await page.keyboard.press('Enter');
  await expect.poll(() => activeScene(page)).toBe('Characters');

  const state = () =>
    page.evaluate(() => {
      const s = (window as unknown as G).__game.scene.getScene('Characters');
      return [s.role, s.variant];
    });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(state).toEqual([0, 2]);
  await page.keyboard.press('ArrowDown'); // troca de papel volta para a primeira variante
  await expect.poll(state).toEqual([1, 0]);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(state).toEqual([1, 4]);

  await page.keyboard.press('Escape');
  await expect.poll(() => activeScene(page)).toBe('Title');
  expect(errors).toEqual([]);
});
