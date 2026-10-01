// E1, E2, S1 — de app in een echte browser op telefoonformaat, tegen de lokale testopslag (tests/dev-server.mjs).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { eersteZinnen } from '../../web/logica.js';

// De browsertests draaien op een bevroren kopie van de gegevens (tests/fixtures/data), niet op de echte data/.
const fixtureWeek = (week) => JSON.parse(readFileSync(new URL(`../fixtures/data/devoties/${week}.json`, import.meta.url), 'utf8'));

const reset = async (request) => { await request.post('/mock/reset'); };
// Events zonder aanmelden (01-10): de app vraagt nergens meer een naam. De helper opent alleen nog de pagina.
const meldAan = async (page, _naam, _connectgroep, pad = '/#/agenda') => { await page.goto(pad); };

test.beforeEach(async ({ request }) => { await reset(request); });

test('E1 agenda → Coming up for you: zondagblok met adres, route en drie diensten; rest als regels', async ({ page }) => {
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn');
  await expect(page.getByRole('heading', { name: 'Coming up for you' })).toBeAttached();
  const zondag = page.getByTestId('dag-2026-09-27');
  await expect(zondag).toContainText('Sunday 27 September');
  await expect(zondag).toContainText('Seineweg 2');
  await expect(zondag.getByRole('link', { name: 'Directions' })).toHaveAttribute('href', /52\.39083,4\.81737/);
  const tegel = zondag.getByTestId('event-2do1gafm');
  await expect(tegel.getByRole('link', { name: 'Add to calendar' })).toHaveAttribute('download', 'cletos-2do1gafm.ics');
  await expect(tegel.getByRole('link', { name: 'Add to calendar' })).toHaveAttribute('href', /^data:text\/calendar/);
  await expect(tegel).toContainText('10:00');
  await expect(tegel).toContainText('until 11:30');
  await expect(tegel).toContainText('10:00 Service AMS');
  await expect(zondag.getByTestId('event-rsrnbjkr')).toBeVisible();
  await expect(zondag.getByTestId('event-svjssuhu')).toBeVisible();
  // een gewoon evenement is een ingeklapte regel: opentikken toont adres/acties
  const rij = page.getByTestId('event-uu9arbay');
  await expect(rij).toContainText('Sisterhood One Day');
  await expect(rij.locator('.rij-meer')).toBeHidden();
  await rij.getByRole('button', { name: /Sisterhood One Day/ }).click();
  await expect(rij.locator('.rij-meer')).toBeVisible();
  await expect(rij.locator('.wanneer-vol')).toHaveText('Saturday 26 September, 09:00–18:00');
  await expect(rij.getByRole('link', { name: 'Sign up with the church' })).toBeVisible();
  await expect(rij.getByRole('link', { name: 'Add to calendar' })).toHaveAttribute('download', 'cletos-uu9arbay.ics');
  // Deze week = komende 7 dagen: de connectgroep van dinsdag staat erbij
  await expect(page.locator('#week')).toContainText('Connectgroep');
  await expect(page.locator('#week')).toContainText('Tue 19:00');
  // Belangrijk: de conferentie staat er sowieso, met periode en link
  const conf = page.getByTestId('event-hillsong-conference-2026');
  await expect(conf).toContainText('Hillsong Conference Europe');
  await expect(conf).toContainText('Wed 21 – Fri 23 Oct');
  await expect(page.locator('#later')).not.toContainText('Hillsong Conference');
  // later ingeklapt, opent op verzoek
  await expect(page.getByTestId('event-8oychdjx')).toBeHidden();
  await page.getByRole('button', { name: /Show \d+ more/ }).click();
  await expect(page.getByTestId('event-8oychdjx')).toBeVisible();
  await expect(page.getByTestId('event-8oychdjx')).toContainText('Youth Night');
});

test('E2 geen enkele vorm van aanmelden: geen schakelaars, geen "ik ga", geen namen, geen naamvraag, en de app praat niet met een database', async ({ page, request }) => {
  await request.post('/mock/seed', { data: { event: 'rsrnbjkr', n: 3, start: '2026-09-27 12:30:00' } }); // er staan namen in de opslag
  const verzoeken = []; page.on('request', r => { if (/\/mock\/(mij|leden|gaat_naar|gebedspunten)|supabase/.test(r.url())) verzoeken.push(r.url()); });
  await page.goto('/#/agenda');
  await expect(page.getByTestId('event-rsrnbjkr')).toBeVisible();
  await expect(page.locator('[role=switch]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /going|Team|Remove me|Save/ })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#home')).not.toContainText('Karin');
  await expect(page.locator('#home')).not.toContainText(/going|no one yet/i);
  await expect(page.locator('#wie')).toHaveCount(0);
  await page.getByTestId('event-uu9arbay').getByRole('button', { name: /Sisterhood One Day/ }).click();
  await expect(page.getByTestId('event-uu9arbay').locator('.acties a:visible')).toHaveText(['Directions', 'Sign up with the church', 'Add to calendar']);
  await page.waitForTimeout(1500); // de oude app vroeg elke seconde de namenlijst op
  expect(verzoeken).toEqual([]);
  const koppen = await page.locator('#home h2').allTextContents();
  assertVolgorde(koppen);
  // Nederlands: de tab heet Events
  await page.locator('#taalknop').click();
  await expect(page.locator('#tabs a')).toHaveText(['Devotie', 'Events']);
});
function assertVolgorde(k) { const i = (n) => k.findIndex(x => x.startsWith(n)); if (!(i('Sunday') < i('Next 7 days') && i('Next 7 days') < i('Important') && i('Important') < i('Later'))) throw new Error('koppen in verkeerde volgorde: ' + k.join(' | ')); }

test('E4 twee pagina\'s: de devotie van vandaag staat er meteen, zonder aanmelden; geen Ask the service, geen connectgroep; Events toont de agenda', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Church Friend');
  await expect(page.locator('.merk')).toHaveText('Church Friend');
  await expect(page.getByLabel('Name', { exact: true })).toHaveCount(0);
  // donderdag = dag 4 uit de week van 20 september
  await expect(page.locator('#dev-dag')).toHaveText('Thursday, day 4 of 6');
  await expect(page.locator('#dev-titel')).toHaveText('Trust Jesus With the Justice');
  await expect(page.locator('#dev-citaat')).toContainText('Forgiveness will free you');
  await expect(page.locator('#dev-link')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=5_LwDEOumtM&t=4169s');
  await expect(page.locator('#dev-gebed')).toContainText('Search me, God');
  await expect(page.locator('#tabs a')).toHaveText(['Devotion', 'Events']);
  await expect(page.getByText('Ask the service')).toHaveCount(0);
  await expect(page.getByText('Connect group')).toHaveCount(0);
  await expect(page.getByText('Prayers')).toHaveCount(0);
  await page.getByRole('link', { name: 'Events' }).dispatchEvent('click'); // vaste tabbalk: Playwright blijft hangen op 'scroll into view'
  await expect(page.getByRole('heading', { name: 'Coming up for you' })).toBeAttached();
  await expect(page.getByTestId('event-2do1gafm')).toBeVisible();
  // een oude link naar de connectgroep-pagina valt terug op de devotie
  await page.goto('/#/connect');
  await expect(page.locator('#dev-titel')).toBeVisible();
});

test('E6 zondag: terugblik met zes hoofdteksten en het slot', async ({ page }) => {
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn', '/?nu=2026-09-27T09:00:00%2B02:00');
  await expect(page.locator('#terugblik')).toBeVisible();
  await expect(page.locator('#devotion')).toBeHidden();
  await expect(page.locator('#tb-lijst li')).toHaveCount(6);
  await expect(page.locator('#tb-lijst')).toContainText('Forgiveness will free you. Unforgiveness will imprison you.');
  await expect(page.locator('#tb-slot')).toContainText('Unforgiveness costs you');
});

test('E8 devotion-menu: dagknoppen, eerdere week als "datum: titel" met samenvatting, deelknop geeft een kort bericht met een link naar de app', async ({ page }) => {
  await page.addInitScript(() => { window.__gedeeld = null; navigator.share = async (d) => { window.__gedeeld = d; }; });
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn', '/');
  await expect(page.locator('#dev-titel')).toHaveText('Trust Jesus With the Justice');
  await expect(page.getByRole('tab', { name: 'Thu' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Fri' })).toBeDisabled();
  await page.getByRole('tab', { name: 'Mon' }).click();
  await expect(page.locator('#dev-titel')).toHaveText('The Life Jesus Came to Give');
  await page.locator('#dev-delen').click();
  const gedeeld = await page.evaluate(() => window.__gedeeld);
  const ma = fixtureWeek('2026-09-20').devotions.find(x => x.dag === 1);
  // een week zonder het veld "deel": de eerste zinnen van de devotie en de kernzin
  expect(gedeeld.text).toBe(`${ma.titel}\n${ma.bijbeltekst}\n\n“${eersteZinnen(ma.zinnen[0].tekst)}”\n\n“${ma.citaat}”\n\nRead the whole daily devotion: http://127.0.0.1:4173/#/d/2026-09-20/1/en`);
  expect(gedeeld.text).not.toContain(ma.gebed.tekst); // de hele devotie gaat niet meer mee
  // de samenvatting van de week deelt ook kort, met de link naar dag 0
  await page.getByRole('tab', { name: 'Summary' }).click();
  await page.locator('#tb-delen').click();
  const sv = await page.evaluate(() => window.__gedeeld);
  expect(sv.text).toContain('Following God Wholeheartedly');
  expect(sv.text).toMatch(/Read the whole daily devotion: http:\/\/127\.0\.0\.1:4173\/#\/d\/2026-09-20\/0\/en$/);
  expect(sv.text.length).toBeLessThan(600);
  // eerdere week kiezen → samenvatting met "30 August: titel"
  await page.getByLabel('Week').selectOption('2026-08-30');
  await expect(page.locator('#tb-titel')).toHaveText('30 August: Living with a spirit of honor');
  await expect(page.locator('#tb-lijst li')).toHaveCount(6);
  await page.getByRole('tab', { name: 'Tue' }).click();
  await expect(page.locator('#dev-dag')).toHaveText('Tuesday, day 2 of 6');
  await expect(page.locator('#dev-link')).toHaveAttribute('href', /0KY9VBJ-oDY/);
});

test('E9 Nederlands: taalknop → devotion, gebed, weekkiezer, samenvatting en deeltekst in het Nederlands; citaat blijft Engels; week zonder vertaling blijft Engels', async ({ page }) => {
  const w = fixtureWeek('2026-09-20'); const d = w.devotions.find(x => x.dag === 4);
  expect(w.talen).toEqual(['en', 'nl']);
  expect(d.titel_nl).toBeTruthy(); expect(d.titel_nl).not.toBe(d.titel);
  await page.addInitScript(() => { window.__gedeeld = null; navigator.share = async (x) => { window.__gedeeld = x; }; });
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn', '/');
  await expect(page.locator('#dev-titel')).toHaveText(d.titel);
  await expect(page.locator('#taalknop')).toHaveText('Switch to Dutch');
  await page.getByRole('button', { name: 'Switch to Dutch' }).click(); // herlaadt de pagina in het Nederlands
  await expect(page.locator('#taalknop')).toHaveText('Switch to English'); // de knop is vervangen
  await expect(page.getByRole('button', { name: 'Switch to Dutch' })).toHaveCount(0);
  await expect(page.locator('#tabs a')).toHaveText(['Devotie', 'Events']);
  await expect(page.locator('#dev-dag')).toHaveText('donderdag, dag 4 van 6');
  await expect(page.locator('#dev-titel')).toHaveText(d.titel_nl);
  await expect(page.locator('#dev-bijbel')).toHaveText(d.bijbeltekst_nl);
  await expect(page.locator('#dev-citaat')).toContainText('Forgiveness will free you'); // letterlijk citaat blijft Engels
  await expect(page.locator('#dev-zinnen p')).toHaveText(d.zinnen.map(z => z.tekst_nl));
  await expect(page.locator('#dev-gebed')).toHaveText(d.gebed.tekst_nl);
  await expect(page.locator('#dev-week option:checked')).toHaveText(`20 september: ${w.titel_nl}`);
  await page.locator('#dev-delen').click();
  const gedeeld = await page.evaluate(() => window.__gedeeld);
  expect(gedeeld.text).toBe(`${d.titel_nl}\n${d.bijbeltekst_nl}\n\n“${eersteZinnen(d.zinnen[0].tekst_nl)}”\n\n“${d.citaat}”\n\nLees de hele daily devotion: http://127.0.0.1:4173/#/d/2026-09-20/4/nl`);
  // samenvatting van de week
  await page.getByRole('tab', { name: 'Samenvatting' }).click();
  await expect(page.locator('#tb-titel')).toHaveText(`20 september: ${w.titel_nl}`);
  await expect(page.locator('#tb-lijst li').first()).toContainText(w.terugblik.dagen[0].zin_nl);
  await expect(page.locator('#tb-lijst li').first()).toContainText(w.terugblik.dagen[0].citaat);
  await expect(page.locator('#tb-slot')).toHaveText(w.terugblik.slot.tekst_nl);
  // een week zonder vertaling valt terug op het Engels in plaats van leeg te blijven
  const oud = fixtureWeek('2026-08-30'); expect(oud.talen).toBeUndefined();
  await page.getByLabel('Week').selectOption('2026-08-30');
  await expect(page.locator('#tb-titel')).toHaveText(`30 augustus: ${oud.titel}`);
  await page.getByRole('tab', { name: 'di', exact: true }).click();
  await expect(page.locator('#dev-titel')).toHaveText(oud.devotions[1].titel);
  // en terug naar Engels
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator('#taalknop')).toHaveText('Switch to Dutch');
  await expect(page.locator('#dev-titel')).toHaveText(d.titel);
  await expect(page.locator('#dev-zinnen p')).toHaveText(d.zinnen.map(z => z.tekst));
});

test('E11 Stones-vorm (30-09): tijdvak, bijbelvers voluit, drie alinea\'s, vraag en gebed; zondag toont de samenvatting in zes delen; ook in het Nederlands', async ({ page }) => {
  // De echte week 2026-09-27 (data/) wordt vóór de bevroren fixture-weken gezet, zodat de test de nieuwe vorm op echte data toetst.
  const week = JSON.parse(readFileSync(new URL('../../data/devoties/2026-09-27.json', import.meta.url), 'utf8'));
  expect(week.vorm).toBe('stones');
  const d = week.devotions.find(x => x.dag === 3); expect(d.zinnen).toHaveLength(3); expect(d.vraag.tekst_nl).toBeTruthy();
  const index = JSON.parse(readFileSync(new URL('../fixtures/data/devoties/index.json', import.meta.url), 'utf8'));
  await page.route('**/data/devoties/index.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ week: week.week, titel: week.titel, video_id: week.video_id, titel_nl: week.titel_nl }, ...index]) }));
  await page.route('**/data/devoties/2026-09-27.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(week) }));
  await page.addInitScript(() => { window.__gedeeld = null; navigator.share = async (x) => { window.__gedeeld = x; }; });
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn', '/?nu=2026-09-30T09:00:00%2B02:00');
  await expect(page.locator('#dev-dag')).toHaveText('Wednesday, day 3 of 6');
  await expect(page.locator('#dev-titel')).toHaveText(d.titel);
  await expect(page.locator('#dev-punt')).toHaveText(`Point 2 of 4: ${d.punt.tekst}`); // woensdag = het tweede punt van de spreker
  await expect(page.locator('#dev-deel')).toContainText(d.tijdvak);
  await expect(page.locator('#dev-deel a')).toHaveAttribute('href', new RegExp(`t=${d.tijdvak_sec}s`));
  await expect(page.locator('#dev-bijbel')).toHaveText(d.bijbeltekst);
  await expect(page.locator('#dev-vers')).toContainText(d.bijbelvers);
  await expect(page.locator('#dev-citaat')).toContainText(d.citaat);
  await expect(page.locator('#dev-zinnen p')).toHaveText(d.zinnen.map(z => z.tekst));
  await expect(page.locator('#dev-vraag')).toHaveText(d.vraag.tekst);
  await expect(page.locator('#dev-gebed')).toHaveText('🙏 ' + d.gebed.tekst);
  // het beeld van de preek van die week, met een tik naar dit deel van de video
  await expect(page.locator('#kop-beeld img')).toHaveAttribute('src', `https://i.ytimg.com/vi/${week.video_id}/hqdefault.jpg`);
  await expect(page.locator('#kop-beeld')).toHaveAttribute('href', new RegExp(`v=${week.video_id}&t=${d.tijdvak_sec}s`));
  // delen: het begin, de oplossing en de link; de vraag en de hele alinea's gaan niet mee
  await page.locator('#dev-delen').click();
  const gedeeld = await page.evaluate(() => window.__gedeeld);
  expect(d.deel.begin).toBeTruthy(); expect(d.zinnen.map(z => z.tekst).join(' ')).toContain(d.deel.oplossing);
  expect(gedeeld.text).toBe(`${d.titel}\n${d.bijbeltekst}\n\n“${d.deel.begin}”\n\n“${d.deel.oplossing}”\n\nRead the whole daily devotion: http://127.0.0.1:4173/#/d/2026-09-27/3/en`);
  expect(gedeeld.text).not.toContain(d.vraag.tekst);
  for (const z of d.zinnen) expect(gedeeld.text).not.toContain(z.tekst);
  expect(d.deel.oplossing.split(/\s+/).length).toBeGreaterThan(40); // een echt stuk van de devotie, niet één zin
  // kopiëren: hetzelfde bericht als delen, met de link eronder
  await page.evaluate(() => { window.__klembord = null; navigator.clipboard.writeText = async (x) => { window.__klembord = x; }; });
  await expect(page.locator('#devotion .kopieer-knop')).toHaveText('Copy');
  await page.locator('#devotion .kopieer-knop').click();
  expect(await page.evaluate(() => window.__klembord)).toBe(gedeeld.text);
  await expect(page.locator('#dev-deelstatus')).toHaveText('Copied. Paste it wherever you like.');
  // WhatsApp: rond logo, even hoog als de deelknop, opent wa.me met hetzelfde bericht
  const wa = page.locator('#devotion .wa-knop');
  await expect(wa).toHaveAttribute('aria-label', 'Share on WhatsApp');
  expect((await wa.boundingBox()).height).toBe((await page.locator('#dev-delen').boundingBox()).height);
  expect((await wa.boundingBox()).width).toBe((await wa.boundingBox()).height);
  await page.evaluate(() => { window.__geopend = null; window.open = (u) => { window.__geopend = u; }; });
  await wa.click();
  expect(await page.evaluate(() => window.__geopend)).toBe('https://wa.me/?text=' + encodeURIComponent(gedeeld.text));
  // gebed van afgelopen week: knop onder de devotie en een eigen knop naast zaterdag, met de volledige gebeden uit de dienst
  expect(week.gebeden.length).toBeGreaterThan(0);
  await expect(page.locator('#dev-dagen [role=tab]').last()).toHaveText('Prayer');
  await expect(page.getByRole('tab', { name: 'Prayer' })).toBeEnabled(); // ook als zaterdag nog niet aan de beurt is
  await page.locator('#devotion .naar-gebed').click();
  await expect(page.locator('#gebeden')).toBeVisible();
  await expect(page.locator('#devotion')).toBeHidden();
  await expect(page.getByRole('tab', { name: 'Prayer' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#gb-lijst .gebed-vol')).toHaveText(week.gebeden.map(g => '🙏 ' + g.tekst));
  await expect(page.locator('#gb-lijst .devotion-kop').first()).toContainText(week.gebeden[0].titel);
  await expect(page.locator('#gb-lijst .tijdlink').first()).toHaveAttribute('href', new RegExp(`t=${week.gebeden[0].tijd_sec}s`));
  expect(week.gebeden[0].tekst.length).toBeGreaterThan(d.gebed.tekst.length); // het hele gebed, niet het korte slot van de devotie
  await page.getByRole('tab', { name: 'Wed' }).click();
  await expect(page.locator('#devotion')).toBeVisible();
  // zondag: de samenvatting in zes delen, niet de oude terugblik
  await page.getByRole('tab', { name: 'Summary' }).click();
  await expect(page.locator('#samenvatting')).toBeVisible();
  await expect(page.locator('#terugblik')).toBeHidden();
  await expect(page.locator('#sv-punt')).toHaveText(week.samenvatting.kop.tekst);
  await expect(page.locator('#sv-delen li')).toHaveCount(6);
  await expect(page.locator('#sv-delen li').first()).toContainText(week.samenvatting.delen[0].uitleg);
  // Connect Group Notes: bij elk deel het punt van de spreker en één vraag voor de groep; gebedspunten onderaan
  await expect(page.locator('#sv-delen .sv-vraag')).toHaveText(week.samenvatting.delen.map(x => x.vraag));
  await expect(page.locator('#sv-delen .sv-vraag')).toHaveCount(6);
  await expect(page.locator('#sv-delen .sv-label')).toHaveText(['Opening', 'Point 1 of 4', 'Point 2 of 4', 'Point 3 of 4', 'Point 4 of 4', 'The invitation']);
  await expect(page.locator('#sv-gebedspunten li')).toHaveText(week.samenvatting.gebedspunten.map(g => g.tekst));
  await expect(page.locator('#sv-bijbel li')).toHaveCount(week.samenvatting.bijbelteksten.length);
  await expect(page.locator('#sv-gebed')).toContainText(week.samenvatting.gebed.tekst);
  // Nederlands
  await page.locator('#taalknop').click(); // herlaadt de pagina: woensdag staat weer voor
  await expect(page.locator('#dev-titel')).toHaveText(d.titel_nl);
  await page.getByRole('tab', { name: 'Samenvatting' }).click();
  await expect(page.locator('#sv-punt')).toHaveText(week.samenvatting.kop.tekst_nl);
  await expect(page.locator('#sv-delen li').first()).toContainText(week.samenvatting.delen[0].uitleg_nl);
  await expect(page.locator('#sv-delen .sv-vraag')).toHaveText(week.samenvatting.delen.map(x => x.vraag_nl));
  await expect(page.locator('#sv-delen .sv-label').nth(1)).toHaveText('Punt 1 van 4');
  await expect(page.locator('#sv-gebedspunten li')).toHaveText(week.samenvatting.gebedspunten.map(g => g.tekst_nl));
  await expect(page.locator('#sv-delen li').first()).toContainText(week.samenvatting.delen[0].citaat); // citaat blijft Engels
  await page.getByRole('tab', { name: 'wo', exact: true }).click();
  await expect(page.locator('#dev-titel')).toHaveText(d.titel_nl);
  await expect(page.locator('#dev-vers')).toContainText(d.bijbelvers_nl);
  await expect(page.locator('#dev-zinnen p')).toHaveText(d.zinnen.map(z => z.tekst_nl));
  await expect(page.locator('#dev-vraag')).toHaveText(d.vraag.tekst_nl);
  await expect(page.locator('#dev-gebed')).toHaveText('🙏 ' + d.gebed.tekst_nl);
  // een oude week valt terug op de oude vorm
  await page.getByRole('tab', { name: 'Gebed' }).click();
  await expect(page.locator('#gb-lijst .gebed-vol')).toHaveText(week.gebeden.map(g => '🙏 ' + g.tekst_nl));
  await expect(page.locator('#gebeden h2')).toHaveText('Gebed van afgelopen week');
  await page.getByLabel('Week').selectOption('2026-09-20');
  await expect(page.locator('#terugblik')).toBeVisible();
  await expect(page.locator('#samenvatting')).toBeHidden();
  await expect(page.getByRole('tab', { name: 'Gebed' })).toHaveCount(0); // een week zonder gebeden heeft de knop niet
  await expect(page.locator('.naar-gebed:visible')).toHaveCount(0);
  await page.getByRole('tab', { name: 'ma', exact: true }).click();
  await expect(page.locator('#dev-deel')).toBeHidden();
  await expect(page.locator('#dev-punt')).toBeHidden(); // een week zonder punten heeft geen label
  await expect(page.locator('#dev-vraag')).toBeHidden();
});

test('E12 deep link: #/d/<week>/<dag> opent precies die devotie, zonder aanmelden; ook een dag die nog niet aan de beurt is en de samenvatting; een onbekende week valt terug op vandaag', async ({ page }) => {
  const w = fixtureWeek('2026-09-20');
  await page.goto('/#/d/2026-09-20/2');
  await expect(page.locator('#dev-dag')).toHaveText('Tuesday, day 2 of 6');
  await expect(page.locator('#dev-titel')).toHaveText(w.devotions.find(x => x.dag === 2).titel);
  await expect(page.getByRole('tab', { name: 'Tue' })).toHaveAttribute('aria-selected', 'true');
  // zaterdag is op donderdag nog niet aan de beurt, maar een gedeelde link opent hem wel
  await expect(page).toHaveURL(/#\/home$/); // de link is verbruikt: herladen toont weer vandaag
  await page.goto('/#/d/2026-09-20/6'); // tweede link terwijl de app open staat
  await expect(page.locator('#dev-titel')).toHaveText(w.devotions.find(x => x.dag === 6).titel);
  // andere dag kiezen en daarna dezelfde link nog eens openen: hij werkt opnieuw
  await page.getByRole('tab', { name: 'Mon' }).click();
  await expect(page.locator('#dev-titel')).toHaveText(w.devotions.find(x => x.dag === 1).titel);
  await page.goto('/#/d/2026-09-20/6');
  await expect(page.locator('#dev-titel')).toHaveText(w.devotions.find(x => x.dag === 6).titel);
  await page.reload();
  await expect(page.locator('#dev-dag')).toHaveText('Thursday, day 4 of 6');
  // een link die binnenkomt terwijl de app al open staat
  await page.evaluate(() => { location.hash = '#/d/2026-08-30/0'; });
  await expect(page.locator('#terugblik')).toBeVisible();
  await expect(page.locator('#tb-titel')).toHaveText('30 August: Living with a spirit of honor');
  // onbekende week, of een week waarvan het bestand ontbreekt: gewoon vandaag, met de weekkiezer
  await page.goto('about:blank'); await page.goto('/#/d/1999-01-01/3');
  await expect(page.locator('#dev-dag')).toHaveText('Thursday, day 4 of 6');
  await page.route('**/data/devoties/2026-08-30.json', r => r.fulfill({ status: 404, body: 'weg' }));
  await page.goto('about:blank'); await page.goto('/#/d/2026-08-30/2');
  await expect(page.locator('#dev-dag')).toHaveText('Thursday, day 4 of 6');
  await expect(page.getByLabel('Week')).toBeVisible();
  // de taal reist mee: een Nederlandse link zet de app van een Engelse lezer op Nederlands, bij openen en terwijl de app open staat
  await page.goto('about:blank'); await page.goto('/#/d/2026-09-20/2/nl');
  await expect(page.locator('#dev-titel')).toHaveText(w.devotions.find(x => x.dag === 2).titel_nl);
  await expect(page.locator('#tabs a').first()).toHaveText('Devotie');
  await page.goto('/#/d/2026-09-20/3/en');
  await expect(page.locator('#dev-titel')).toHaveText(w.devotions.find(x => x.dag === 3).titel);
  await expect(page.locator('#tabs a').first()).toHaveText('Devotion');
});
