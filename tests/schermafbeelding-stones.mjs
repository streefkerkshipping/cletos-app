// Maakt twee schermafbeeldingen van de Stones-vorm (devotion + zondag-samenvatting) tegen de lokale testserver.
// Gebruik: KRING_OPSLAG=mock KRING_NU='2026-09-30T09:00:00+02:00' PORT=4199 node tests/dev-server.mjs &  →  node tests/schermafbeelding-stones.mjs
import { chromium, devices } from '@playwright/test';
const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'] }); const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4199/?nu=2026-09-30T09:00:00%2B02:00');
await p.getByLabel('Name', { exact: true }).fill('Bas'); await p.getByLabel('Connect group', { exact: true }).fill('Apeldoorn'); await p.getByRole('button', { name: 'Join' }).click();
await p.waitForSelector('#dev-vraag:not([hidden])');
await p.locator('#devotion').screenshot({ path: 'tests/schermafbeelding-devotion-stones-2026-09-30.png' });
await p.getByRole('tab', { name: 'Summary' }).click(); await p.waitForSelector('#samenvatting:not([hidden])');
await p.locator('#samenvatting').screenshot({ path: 'tests/schermafbeelding-samenvatting-stones-2026-09-30.png' });
await b.close();
console.log('klaar');
