// E1, E2, S1 — de app in een echte browser op telefoonformaat, tegen de lokale testopslag (tests/dev-server.mjs).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// De browsertests draaien op een bevroren kopie van de gegevens (tests/fixtures/data), niet op de echte data/.
const fixtureWeek = (week) => JSON.parse(readFileSync(new URL(`../fixtures/data/devoties/${week}.json`, import.meta.url), 'utf8'));

const reset = async (request) => { await request.post('/mock/reset'); };
const meldAan = async (page, naam, connectgroep, pad = '/#/agenda') => {
  await page.goto(pad);
  await page.getByLabel('Name', { exact: true }).fill(naam);
  await page.getByLabel('Connect group', { exact: true }).fill(connectgroep);
  await page.getByRole('button', { name: 'Join' }).click();
};

test.beforeEach(async ({ request }) => { await reset(request); });

test('E1 join → Coming up for you: zondagblok met adres, route en drie diensten; rest als regels', async ({ page }) => {
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn');
  await expect(page.getByRole('heading', { name: 'Coming up for you' })).toBeAttached();
  const zondag = page.getByTestId('dag-2026-09-27');
  await expect(zondag).toContainText('Sunday 27 September');
  await expect(zondag).toContainText('Seineweg 2');
  await expect(zondag.getByRole('link', { name: 'Directions' })).toHaveAttribute('href', /52\.39083,4\.81737/);
  const tegel = zondag.getByTestId('event-2do1gafm');
  await expect(tegel).toContainText('10:00');
  await expect(tegel).toContainText('until 11:30');
  await expect(tegel).toContainText('10:00 Service AMS');
  await expect(zondag.getByTestId('event-rsrnbjkr')).toBeVisible();
  await expect(zondag.getByTestId('event-svjssuhu')).toBeVisible();
  // een gewoon evenement is een ingeklapte regel: opentikken toont adres/acties
  const rij = page.getByTestId('event-uu9arbay');
  await expect(rij).toContainText('Sisterhood One Day');
  await expect(rij.getByRole('button', { name: 'I’m going' })).toBeHidden();
  await rij.getByRole('button', { name: /Sisterhood One Day/ }).click();
  await expect(rij.getByRole('button', { name: 'I’m going' })).toBeVisible();
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

test('E2 ik ga → blijft na herladen, tweede toestel ziet het, intrekken werkt in beide', async ({ browser, page }) => {
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn');
  const kaart = page.getByTestId('event-2do1gafm');
  await kaart.locator('.tegel-vink').click();
  await expect(kaart.locator('.tegel-vink')).toHaveAttribute('aria-checked', 'true');
  await expect(kaart.locator('.tegel-vink')).toHaveAttribute('aria-checked', 'true');
  const ag = kaart.getByRole('link', { name: 'Add to calendar' });
  await expect(ag).toHaveAttribute('href', /^data:text\/calendar/);
  await expect(ag).toHaveAttribute('download', 'cletos-2do1gafm.ics');
  await page.reload();
  await expect(page.getByTestId('event-2do1gafm').locator('.tegel-vink')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('event-2do1gafm')).toContainText('Bas Streefkerk'); await expect(page.getByTestId('event-2do1gafm')).toContainText('Apeldoorn');

  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  await meldAan(p2, 'Test Persoon', 'Utrecht');
  await expect(p2.getByTestId('event-2do1gafm')).toContainText('Bas Streefkerk', { timeout: 5000 });
  await expect(p2.getByTestId('event-2do1gafm').locator('.tegel-vink')).toHaveAttribute('aria-checked', 'false');

  await page.getByTestId('event-2do1gafm').locator('.tegel-vink').click();
  await expect(page.getByTestId('event-2do1gafm')).not.toContainText('Bas Streefkerk');
  await expect(page.getByTestId('event-2do1gafm').locator('.tegel-vink')).toHaveAttribute('aria-checked', 'false');
  await expect(p2.getByTestId('event-2do1gafm')).not.toContainText('Bas Streefkerk', { timeout: 6000 });
  await ctx2.close();
});

test('S1 opslag onbereikbaar → evenementen blijven zichtbaar, melding, ik-ga faalt netjes', async ({ page, request }) => {
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn');
  await expect(page.getByTestId('event-2do1gafm')).toBeVisible();
  await request.post('/mock/storing?aan=1');
  await page.reload();
  await expect(page.getByTestId('event-2do1gafm')).toBeVisible();
  await expect(page.locator('#status')).toContainText('Storage is unavailable');
  await page.getByTestId('event-2do1gafm').locator('.tegel-vink').click();
  await expect(page.getByRole('alert')).toContainText('failed');
  await expect(page.getByTestId('event-2do1gafm').locator('.tegel-vink')).toHaveAttribute('aria-checked', 'false');
  await request.post('/mock/storing?aan=0');
});

test('E2b zeven mensen bij 12:30 → twee namen en een knopje "nog 5" dat de rest toont', async ({ page, request }) => {
  await request.post('/mock/seed', { data: { event: 'rsrnbjkr', n: 7, start: '2026-09-27 12:30:00' } });
  await request.post('/mock/seed', { data: { event: 'uu9arbay', n: 2, start: '2026-09-26 09:00:00' } });
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn');
  // regels tonen een teller
  const sis = page.getByTestId('event-uu9arbay');
  await expect(sis.locator('.tel')).toHaveText('2 going');
  await sis.getByRole('button', { name: /Sisterhood One Day/ }).click();
  await sis.getByRole('button', { name: 'I’m going' }).click();
  await expect(sis.locator('.tel')).toHaveText('you + 2');
  const tegel = page.getByTestId('event-rsrnbjkr');
  await expect(tegel.locator('.lijst.gaan .namen li')).toHaveCount(2);
  const meer = tegel.getByRole('button', { name: 'Show 5 more' });
  await expect(meer).toHaveText('5 more');
  await meer.click();
  await expect(tegel.locator('.lijst.gaan .namen li')).toHaveCount(7);
  await expect(tegel).toContainText('Truus');
  await tegel.getByRole('button', { name: 'Show fewer' }).click();
  await expect(tegel.locator('.lijst.gaan .namen li')).toHaveCount(2);
});

test('E3 Team-schakelaar → teamkiezer → naam onder Team; Team uit = alleen gaan; ander team via invulveld; volgorde koppen', async ({ page }) => {
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn');
  const tegel = page.getByTestId('event-rsrnbjkr');
  await tegel.locator('.tegel-team').click();
  await expect(tegel.getByText('Which team?')).toBeVisible();
  await tegel.getByRole('button', { name: 'Welcome' }).click();
  await expect(tegel.locator('.lijst.helpen .teamregel')).toHaveText('Welcome: Bas Streefkerk');
  await expect(tegel.locator('.lijst.gaan')).toContainText('no one yet');
  await expect(tegel.locator('.tegel-vink')).toHaveAttribute('aria-checked', 'true');
  await expect(tegel.locator('.tegel-team')).toHaveAttribute('aria-checked', 'true');
  await tegel.locator('.tegel-team').click();
  await expect(tegel.locator('.lijst.helpen')).toBeHidden();
  await expect(tegel.locator('.lijst.gaan')).toContainText('Bas Streefkerk');
  await expect(tegel.locator('.tegel-vink')).toHaveAttribute('aria-checked', 'true');
  await expect(tegel.locator('.tegel-team')).toHaveAttribute('aria-checked', 'false');
  // ander team via invulveld
  await tegel.locator('.tegel-team').click();
  await tegel.getByLabel('Other team').fill('Techniek');
  await tegel.getByRole('button', { name: 'OK' }).click();
  await expect(tegel.locator('.lijst.helpen .teamregel')).toHaveText('Techniek: Bas Streefkerk');
  await expect(tegel.getByRole('button', { name: 'Shuttle' })).toBeHidden();
  // service uit → ook team weg
  await tegel.locator('.tegel-vink').click();
  await expect(tegel.locator('.tegel-team')).toHaveAttribute('aria-checked', 'false');
  await expect(tegel.locator('.lijst.helpen')).toBeHidden();
  const koppen = await page.locator('#home h2').allTextContents();
  assertVolgorde(koppen);
});
function assertVolgorde(k) { const i = (n) => k.findIndex(x => x.startsWith(n)); if (!(i('Sunday') < i('Next 7 days') && i('Next 7 days') < i('Important') && i('Important') < i('Later'))) throw new Error('koppen in verkeerde volgorde: ' + k.join(' | ')); }

test('E4 drie pagina\'s: Home standaard met devotion van vandaag, Connectgroep toont dinsdag 29 september met adres', async ({ page }) => {
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn', '/');
  // Home is de start; donderdag = dag 4 uit de week van 20 september
  await expect(page.getByRole('heading', { name: 'Welcome home' })).toBeVisible();
  await expect(page.locator('#dev-dag')).toHaveText('Thursday, day 4 of 6');
  await expect(page.locator('#dev-titel')).toHaveText('Trust Jesus With the Justice');
  await expect(page.locator('#dev-citaat')).toContainText('Forgiveness will free you');
  await expect(page.locator('#dev-link')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=5_LwDEOumtM&t=4169s');
  await expect(page.locator('#dev-gebed')).toContainText('Search me, God');
  // Ask the service: uitleg aanwezig, invoer zegt eerlijk dat het nog niet is aangesloten
  await expect(page.getByRole('heading', { name: 'Ask the service' })).toBeVisible();
  await page.getByLabel('Your question').fill('Wat is er gezegd over vergeving?');
  await page.getByRole('button', { name: 'Ask the service' }).click();
  await expect(page.locator('#askantwoord')).toContainText('isn’t connected yet');
  await page.getByRole('link', { name: 'Agenda' }).dispatchEvent('click');
  await expect(page.getByRole('heading', { name: 'Coming up for you' })).toBeAttached();
  await page.getByRole('link', { name: 'Connect group' }).dispatchEvent('click'); // vaste tabbalk: Playwright blijft hangen op 'scroll into view'
  await expect(page.getByRole('heading', { name: 'Connect group', level: 1 })).toBeVisible();
  const cg = page.locator('#pagina-connect').getByTestId('event-connectgroep-2026-09-29');
  await expect(cg.locator('.wanneer-vol')).toHaveText('Tuesday 29 September, 19:00–20:45');
  await expect(cg).toContainText('Minden 50-54');
  await expect(cg).toContainText('No obligation');
  await cg.getByRole('button', { name: 'I’m going' }).click();
  await expect(cg.locator('.tel')).toHaveText('you’re going');
  await page.getByRole('link', { name: 'Home' }).dispatchEvent('click');
  await expect(page.locator('#home-connect')).toContainText('Tuesday 29 September, 19:00–20:45');
});

test('E6 zondag: terugblik met zes hoofdteksten en het slot', async ({ page }) => {
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn', '/?nu=2026-09-27T09:00:00%2B02:00');
  await expect(page.locator('#terugblik')).toBeVisible();
  await expect(page.locator('#devotion')).toBeHidden();
  await expect(page.locator('#tb-lijst li')).toHaveCount(6);
  await expect(page.locator('#tb-lijst')).toContainText('Forgiveness will free you. Unforgiveness will imprison you.');
  await expect(page.locator('#tb-slot')).toContainText('Unforgiveness costs you');
});

test('E5 vinkje in de ingeklapte regel: ✕ → tik → ✓ en "jij gaat", zonder openklappen; nog een tik → weg', async ({ page }) => {
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn');
  const rij = page.getByTestId('event-uu9arbay');
  const vink = rij.locator('.vink');
  await expect(vink).toHaveAttribute('aria-checked', 'false');
  await expect(vink).toHaveAttribute('aria-checked', 'false');
  await vink.click();
  await expect(vink).toHaveAttribute('aria-checked', 'true');
  await expect(vink).toHaveAttribute('aria-checked', 'true');
  await expect(rij.locator('.tel')).toHaveText('you’re going');
  await expect(rij.locator('.rij-meer')).toBeHidden();
  await vink.click();
  await expect(vink).toHaveAttribute('aria-checked', 'false');
  await expect(rij.locator('.tel')).toHaveCount(0);
});

test('E7 Prayers en Praise: toevoegen, tweede toestel ziet het, eigen punt verwijderen, oud punt (vorige week) niet zichtbaar', async ({ browser, page, request }) => {
  await request.post('/mock/seedgebed', { data: { soort: 'prayer', tekst: 'Oud punt van vorige week', week_eind: '2026-09-20' } });
  await request.post('/mock/seedgebed', { data: { soort: 'praise', tekst: 'Karin heeft een baan!', week_eind: '2026-09-27' } });
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn', '/#/connect');
  await expect(page.locator('#praise-lijst')).toContainText('Karin heeft een baan!');
  await expect(page.locator('#prayer-lijst')).not.toContainText('Oud punt');
  await page.getByLabel('New prayer point').fill('Voor mijn moeder, ze is ziek');
  await page.locator('#prayers').getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('#prayer-lijst')).toContainText('Voor mijn moeder, ze is ziek');
  await expect(page.locator('#prayer-lijst')).toContainText('Bas Streefkerk');
  await expect(page.getByLabel('New prayer point')).toHaveValue('');
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  await meldAan(p2, 'Test Persoon', 'Utrecht', '/#/connect');
  await expect(p2.locator('#prayer-lijst')).toContainText('Voor mijn moeder', { timeout: 5000 });
  await expect(p2.locator('#prayer-lijst').getByRole('button', { name: 'Remove this item' })).toHaveCount(0);
  await page.locator('#prayer-lijst').getByRole('button', { name: 'Remove this item' }).click();
  await expect(page.locator('#prayer-lijst')).not.toContainText('Voor mijn moeder');
  await expect(p2.locator('#prayer-lijst')).not.toContainText('Voor mijn moeder', { timeout: 6000 });
  // anoniem: eigen scherm toont Anoniem + verwijderknop; ander ziet Anoniem zonder naam of knop
  await page.getByLabel('New prayer point').fill('Voor iets waar ik niet over kan praten');
  await page.getByLabel(/Post anonymously/).check();
  await page.locator('#prayers').getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('#prayer-lijst')).toContainText('Anonymous');
  await expect(page.locator('#prayer-lijst').getByRole('button', { name: 'Remove this item' })).toHaveCount(1);
  await expect(page.getByLabel(/Post anonymously/)).not.toBeChecked();
  await expect(p2.locator('#prayer-lijst')).toContainText('Voor iets waar ik niet over kan praten', { timeout: 5000 });
  await expect(p2.locator('#prayer-lijst')).not.toContainText('Bas Streefkerk');
  await expect(p2.locator('#prayer-lijst').getByRole('button', { name: 'Remove this item' })).toHaveCount(0);
  await ctx2.close();
});

test('E8 devotion-menu: dagknoppen, eerdere week als "datum: titel" met samenvatting, deelknop geeft de tekst door', async ({ page }) => {
  await page.addInitScript(() => { window.__gedeeld = null; navigator.share = async (d) => { window.__gedeeld = d; }; });
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn', '/');
  await expect(page.locator('#dev-titel')).toHaveText('Trust Jesus With the Justice');
  await expect(page.getByRole('tab', { name: 'Thu' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Fri' })).toBeDisabled();
  await page.getByRole('tab', { name: 'Mon' }).click();
  await expect(page.locator('#dev-titel')).toHaveText('The Life Jesus Came to Give');
  await page.getByRole('button', { name: 'Share' }).first().click();
  const gedeeld = await page.evaluate(() => window.__gedeeld);
  if (!gedeeld || !gedeeld.text.includes('The Life Jesus Came to Give') || !gedeeld.text.includes('youtube.com/watch?v=5_LwDEOumtM')) throw new Error('deeltekst klopt niet: ' + JSON.stringify(gedeeld).slice(0, 200));
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
  await page.locator('#taalknop').click(); // herlaadt de pagina in het Nederlands
  await expect(page.locator('#dev-dag')).toHaveText('donderdag, dag 4 van 6');
  await expect(page.locator('#dev-titel')).toHaveText(d.titel_nl);
  await expect(page.locator('#dev-bijbel')).toHaveText(d.bijbeltekst_nl);
  await expect(page.locator('#dev-citaat')).toContainText('Forgiveness will free you'); // letterlijk citaat blijft Engels
  await expect(page.locator('#dev-zinnen p')).toHaveText(d.zinnen.map(z => z.tekst_nl));
  await expect(page.locator('#dev-gebed')).toHaveText(d.gebed.tekst_nl);
  await expect(page.locator('#dev-week option:checked')).toHaveText(`20 september: ${w.titel_nl}`);
  await page.getByRole('button', { name: 'Delen' }).first().click();
  const gedeeld = await page.evaluate(() => window.__gedeeld);
  if (!gedeeld || !gedeeld.text.includes(d.titel_nl) || !gedeeld.text.includes(d.gebed.tekst_nl) || !gedeeld.text.includes(d.citaat)) throw new Error('deeltekst klopt niet: ' + JSON.stringify(gedeeld).slice(0, 300));
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
  await page.locator('#taalknop').click();
  await expect(page.locator('#dev-titel')).toHaveText(d.titel);
  await expect(page.locator('#dev-zinnen p')).toHaveText(d.zinnen.map(z => z.tekst));
});

test('E10 Ask the service aangesloten: vraag → wachttekst → antwoord met citaat, datum en link naar de seconde; weigering zonder bronnen; storing meldt zich netjes', async ({ page }) => {
  // De motor zelf (lokaal/ask.mjs) heeft eigen tests; hier speelt de test de serverfunctie na en toetst alleen het scherm.
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.KRING_CONFIG={opslag:'mock',mockUrl:'/mock',verversSeconden:1,nu:'2026-09-24T12:00:00+02:00',askUrl:'/ask'};" }));
  const goed = { antwoord: 'The speaker describes forgiveness as releasing a debt into God’s hands.', weigering: false, bronnen: [
    { datum: '2026-09-20', titel: 'Following God Wholeheartedly', tijd: '17:26', tijd_sec: 1046, youtube_url: 'https://www.youtube.com/watch?v=AVoWL5wCHuA&t=1046s', citaat: "It's releasing a debt into God's hands" },
    { datum: '2025-11-02', titel: 'Grace', tijd: '1:02:03', tijd_sec: 3723, youtube_url: 'https://evil.example/watch?t=1', citaat: 'a second quote from another sermon' },
  ] };
  let volgende = { status: 200, json: goed }, verzoek = null;
  await page.route('**/ask', async r => { verzoek = r.request().postDataJSON(); await new Promise(x => setTimeout(x, 400)); await r.fulfill(volgende); });
  await meldAan(page, 'Bas Streefkerk', 'Apeldoorn', '/');
  const knop = page.getByRole('button', { name: 'Ask the service' });
  await page.getByLabel('Your question').fill('What was said about forgiveness?');
  await knop.click();
  await expect(page.locator('#asktekst')).toContainText('Searching');
  await expect(knop).toBeDisabled();
  await expect(page.locator('#asktekst')).toHaveText(goed.antwoord);
  await expect(knop).toBeEnabled();
  expect(verzoek).toEqual({ vraag: 'What was said about forgiveness?', taal: 'en' });
  await expect(page.locator('#askbronkop')).toBeVisible();
  await expect(page.locator('#askbronnen li')).toHaveCount(2);
  const eerste = page.locator('#askbronnen li').first();
  await expect(eerste.locator('blockquote')).toHaveText("“It's releasing a debt into God's hands”");
  await expect(eerste.locator('a')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=AVoWL5wCHuA&t=1046s');
  await expect(eerste).toContainText('20 September 2026');
  await expect(eerste.locator('a')).toContainText('17:26');
  // een link die niet naar YouTube wijst wordt geen link
  await expect(page.locator('#askbronnen li').nth(1).locator('a')).toHaveCount(0);
  // weigering: de zin staat er, de bronnen van de vorige vraag zijn weg
  volgende = { status: 200, json: { antwoord: 'That isn’t in the sermons I have.', weigering: true, bronnen: [] } };
  await page.getByLabel('Your question').fill('What is the wifi password?');
  await knop.click();
  await expect(page.locator('#asktekst')).toHaveText('That isn’t in the sermons I have.');
  await expect(page.locator('#askbronnen li')).toHaveCount(0);
  await expect(page.locator('#askbronkop')).toBeHidden();
  // storing van de serverfunctie
  volgende = { status: 502, json: { fout: 'geen antwoord binnen 240 seconden' } };
  await knop.click();
  await expect(page.locator('#asktekst')).toContainText('No answer came back');
  await expect(knop).toBeEnabled();
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
  await expect(page.locator('#dev-deel')).toContainText(d.tijdvak);
  await expect(page.locator('#dev-deel a')).toHaveAttribute('href', new RegExp(`t=${d.tijdvak_sec}s`));
  await expect(page.locator('#dev-bijbel')).toHaveText(d.bijbeltekst);
  await expect(page.locator('#dev-vers')).toContainText(d.bijbelvers);
  await expect(page.locator('#dev-citaat')).toContainText(d.citaat);
  await expect(page.locator('#dev-zinnen p')).toHaveText(d.zinnen.map(z => z.tekst));
  await expect(page.locator('#dev-vraag')).toHaveText(d.vraag.tekst);
  await expect(page.locator('#dev-gebed')).toHaveText('🙏 ' + d.gebed.tekst);
  await page.getByRole('button', { name: 'Share' }).first().click();
  const gedeeld = await page.evaluate(() => window.__gedeeld);
  if (!gedeeld || !gedeeld.text.includes(d.bijbelvers) || !gedeeld.text.includes(d.vraag.tekst) || !gedeeld.text.includes('part 3 of 6')) throw new Error('deeltekst klopt niet: ' + JSON.stringify(gedeeld).slice(0, 300));
  // zondag: de samenvatting in zes delen, niet de oude terugblik
  await page.getByRole('tab', { name: 'Summary' }).click();
  await expect(page.locator('#samenvatting')).toBeVisible();
  await expect(page.locator('#terugblik')).toBeHidden();
  await expect(page.locator('#sv-punt')).toHaveText(week.samenvatting.kop.tekst);
  await expect(page.locator('#sv-delen li')).toHaveCount(6);
  await expect(page.locator('#sv-delen li').first()).toContainText(week.samenvatting.delen[0].uitleg);
  await expect(page.locator('#sv-bijbel li')).toHaveCount(week.samenvatting.bijbelteksten.length);
  await expect(page.locator('#sv-gebed')).toContainText(week.samenvatting.gebed.tekst);
  // Nederlands
  await page.locator('#taalknop').click(); // herlaadt de pagina: woensdag staat weer voor
  await expect(page.locator('#dev-titel')).toHaveText(d.titel_nl);
  await page.getByRole('tab', { name: 'Samenvatting' }).click();
  await expect(page.locator('#sv-punt')).toHaveText(week.samenvatting.kop.tekst_nl);
  await expect(page.locator('#sv-delen li').first()).toContainText(week.samenvatting.delen[0].uitleg_nl);
  await expect(page.locator('#sv-delen li').first()).toContainText(week.samenvatting.delen[0].citaat); // citaat blijft Engels
  await page.getByRole('tab', { name: 'wo', exact: true }).click();
  await expect(page.locator('#dev-titel')).toHaveText(d.titel_nl);
  await expect(page.locator('#dev-vers')).toContainText(d.bijbelvers_nl);
  await expect(page.locator('#dev-zinnen p')).toHaveText(d.zinnen.map(z => z.tekst_nl));
  await expect(page.locator('#dev-vraag')).toHaveText(d.vraag.tekst_nl);
  await expect(page.locator('#dev-gebed')).toHaveText('🙏 ' + d.gebed.tekst_nl);
  // een oude week valt terug op de oude vorm
  await page.getByLabel('Week').selectOption('2026-09-20');
  await expect(page.locator('#terugblik')).toBeVisible();
  await expect(page.locator('#samenvatting')).toBeHidden();
  await page.getByRole('tab', { name: 'ma', exact: true }).click();
  await expect(page.locator('#dev-deel')).toBeHidden();
  await expect(page.locator('#dev-vraag')).toBeHidden();
});
