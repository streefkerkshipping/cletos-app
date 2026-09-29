// Handmatige controle op de ECHTE data/ en de datum van vandaag (geen vaste testklok): start zelf een testserver,
// meldt aan, leest de devotion van vandaag in het Engels en het Nederlands, en maakt twee schermafbeeldingen.
// Gebruik: node tests/controle-echte-data.mjs <map-voor-schermafbeeldingen>
import { spawn } from 'node:child_process';
import { chromium, devices } from '@playwright/test';
const uit = process.argv[2] || '.'; const PORT = '4188';
const server = spawn('node', ['tests/dev-server.mjs'], { env: { ...process.env, PORT, KRING_OPSLAG: 'mock', KRING_NU: '', KRING_DATA: '' }, stdio: 'ignore' });
const wacht = (ms) => new Promise(r => setTimeout(r, ms));
let code = 0;
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/mock/status`)).ok) break; } catch {} await wacht(250); }
  const browser = await chromium.launch(); const ctx = await browser.newContext({ ...devices['iPhone 14'] }); const page = await ctx.newPage();
  const fouten = []; page.on('pageerror', e => fouten.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/status of 404/.test(m.text())) fouten.push(m.text()); });
  // 404's apart: de testopslag antwoordt 404 op /mock/mij zolang je nog niet bent aangemeld (dat hoort zo); elke andere 404 is een fout.
  page.on('response', r => { if (r.status() === 404 && !r.url().endsWith('/mock/mij')) fouten.push('404 ' + r.url()); });
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.getByLabel('Name', { exact: true }).fill('Controle'); await page.getByLabel('Connect group', { exact: true }).fill('Apeldoorn');
  await page.getByRole('button', { name: 'Join' }).click();
  const lees = async () => ({ dag: await page.locator('#dev-dag').textContent(), week: await page.locator('#dev-week option:checked').textContent(), titel: await page.locator('#dev-titel').textContent(), bijbel: await page.locator('#dev-bijbel').textContent(), citaat: (await page.locator('#dev-citaat').textContent()).slice(0, 70), link: await page.locator('#dev-link').getAttribute('href'), zinnen: await page.locator('#dev-zinnen p').count(), eersteZin: await page.locator('#dev-zinnen p').first().textContent(), gebed: await page.locator('#dev-gebed').textContent(), breedte: await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]) });
  await page.locator('#dev-titel').waitFor();
  console.log('EN', JSON.stringify(await lees(), null, 1)); await page.screenshot({ path: `${uit}/devotion-en.png`, fullPage: true });
  await page.locator('#taalknop').click(); await page.locator('#dev-titel').waitFor(); await wacht(500);
  console.log('NL', JSON.stringify(await lees(), null, 1)); await page.screenshot({ path: `${uit}/devotion-nl.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Samenvatting' }).click();
  console.log('NL samenvatting', JSON.stringify({ titel: await page.locator('#tb-titel').textContent(), regels: await page.locator('#tb-lijst li').count(), slotkop: await page.locator('#tb-slotkop').textContent(), slot: await page.locator('#tb-slot').textContent() }, null, 1));
  await page.getByRole('link', { name: 'Agenda' }).dispatchEvent('click'); await wacht(500);
  console.log('agenda-tegels zondag:', await page.locator('.tegel').count(), '| eerste dag:', (await page.locator('.zondag, .dagkop, h2').first().textContent())?.slice(0, 60));
  await page.screenshot({ path: `${uit}/agenda-nl.png`, fullPage: true });
  console.log('fouten in de browser:', fouten.length ? fouten : 'geen');
  if (fouten.length) code = 1;
  await browser.close();
} catch (e) { console.error('CONTROLE MISLUKT', e); code = 1; } finally { server.kill(); }
process.exit(code);
