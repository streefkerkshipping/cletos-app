// Controle van de conferentievorm in de app tegen de lokale testserver (poort 4199, proefdata met 2026-10-21-c1).
// Leest wat de app toont, controleert de conferentieregels en maakt schermafbeeldingen (EN + NL).
import { chromium, devices } from '@playwright/test';
const UIT = process.argv[2] || '.';
const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'] }); const p = await ctx.newPage();
const fouten = [];
const check = (ok, wat) => { if (!ok) fouten.push(wat); console.log((ok ? 'OK  ' : 'FOUT') + ' ' + wat); };

await p.goto('http://127.0.0.1:4199/?nu=2026-10-22T12:00:00%2B02:00');
await p.waitForSelector('#samenvatting:not([hidden])');
const optie = await p.locator('#dev-week option:checked').textContent();
check(optie.startsWith('Hillsong Conference Europe 2026 · Wednesday evening, 21 October: I Saw the Lord'), `weekkiezer: "${optie}"`);
const chips = await p.locator('#dev-dagen .chip').allTextContents();
check(JSON.stringify(chips) === JSON.stringify(['Summary', '1', '2', '3', '4', '5', '6', 'Prayer']), `chips: ${chips.join(' | ')}`);
check((await p.locator('#dev-dagen .chip:disabled').count()) === 0, 'geen enkele knop uitgeschakeld (alle zes onderwerpen open)');
check(await p.locator('#kop-beeld').isHidden(), 'geen YouTube-beeld');
check((await p.locator('#samenvatting a.tijdlink').count()) === 0, 'geen YouTube-tijdlinks in de samenvatting');
check((await p.locator('#sv-week').textContent()) === 'Hillsong Conference Europe 2026 · Wednesday evening, 21 October', 'sessienaam boven de samenvatting');
check((await p.locator('[data-t="sv_delen"]').textContent()) === 'The message in six topics, with a question for your group', 'kop "The message in six topics"');
check((await p.locator('[data-t="sv_kop"]').textContent()) === 'The one point of the message', 'kop "The one point of the message"');
check((await p.locator('#sv-delen li').count()) === 6, 'zes onderwerpen in de samenvatting');
check((await p.locator('#sv-titel').textContent()) === 'I Saw the Lord', 'titel zonder dubbele datum (review P2-1)');
check((await p.locator('#sv-citaat .tijdlink.dood').count()) === 1 && (await p.locator('#sv-citaat a').count()) === 0, 'tijd bij het citaat is tekst zonder onderstreping (review P2-2)');
check((await p.locator('#sv-delen .sv-vraag').count()) === 6, 'zes groepsvragen');
check(/Prayer/.test(await p.locator('#samenvatting .naar-gebed').textContent()) && (await p.locator('#samenvatting .naar-gebed').textContent()) === 'Prayers from the session', 'gebedsknop heet "Prayers from the session"');
await p.screenshot({ path: `${UIT}/conference-samenvatting-en.png`, fullPage: true });

await p.getByRole('tab', { name: '3', exact: true }).click(); await p.waitForSelector('#devotion:not([hidden])');
check((await p.locator('#dev-dag').textContent()) === 'Topic 3 of 6', `kop onderwerp: "${await p.locator('#dev-dag').textContent()}"`);
check((await p.locator('#dev-week-label').textContent()) === 'Hillsong Conference Europe 2026 · Wednesday evening, 21 October', 'sessienaam bij het onderwerp');
check((await p.locator('#dev-titel').textContent()) === 'Sit in His Presence Again', `titel: "${await p.locator('#dev-titel').textContent()}"`);
check(await p.locator('#dev-deel').isHidden(), '"Watch this part" verborgen (geen video)');
check((await p.locator('#dev-link').getAttribute('href')) === null && /dood/.test(await p.locator('#dev-link').getAttribute('class')), 'tijd bij de kernzin is geen link en niet onderstreept');
check((await p.locator('#dev-zinnen p').count()) === 3, 'drie alinea\'s');
check(await p.locator('#dev-vraag').isVisible() && await p.locator('#dev-gebed').isVisible(), 'vraag en gebed zichtbaar');
const breedte = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
check(breedte[0] <= breedte[1], `geen horizontale scroll (${breedte.join('/')})`);
await p.screenshot({ path: `${UIT}/conference-onderwerp3-en.png`, fullPage: true });

// Deelbericht: de kopieerknop → klembord; we lezen de tekst via de deelfunctie zelf (clipboard is in headless niet betrouwbaar).
await p.getByRole('tab', { name: 'Prayer' }).click(); await p.waitForSelector('#gebeden:not([hidden])');
check((await p.locator('#gebeden h2').textContent()) === 'Prayers from the session', 'gebedenpagina heet "Prayers from the session"');
check((await p.locator('#gb-lijst .devotion-kop').count()) === 2, 'twee gebeden uit de sessie');

// Deep link naar onderwerp 5
await p.goto('http://127.0.0.1:4199/?nu=2026-10-22T12:00:00%2B02:00#/d/2026-10-21-c1/5/en'); await p.waitForSelector('#devotion:not([hidden])');
check((await p.locator('#dev-dag').textContent()) === 'Topic 5 of 6', 'dieplink #/d/2026-10-21-c1/5 opent onderwerp 5');

// Nederlands
await p.getByRole('button', { name: 'Switch to Dutch' }).click(); await p.waitForSelector('#samenvatting:not([hidden]), #devotion:not([hidden])');
await p.goto('http://127.0.0.1:4199/?nu=2026-10-22T12:00:00%2B02:00#/d/2026-10-21-c1/0/nl'); await p.waitForSelector('#samenvatting:not([hidden])');
const chipsNl = await p.locator('#dev-dagen .chip').allTextContents();
check(JSON.stringify(chipsNl) === JSON.stringify(['Samenvatting', '1', '2', '3', '4', '5', '6', 'Gebed']), `chips NL: ${chipsNl.join(' | ')}`);
check((await p.locator('#sv-week').textContent()) === 'Hillsong Conference Europe 2026 · woensdagavond 21 oktober', 'sessienaam NL');
check((await p.locator('[data-t="sv_delen"]').textContent()) === 'De boodschap in zes onderwerpen, met een vraag voor je groep', 'kop NL');
await p.screenshot({ path: `${UIT}/conference-samenvatting-nl.png`, fullPage: true });
await p.getByRole('tab', { name: '1', exact: true }).click(); await p.waitForSelector('#devotion:not([hidden])');
check((await p.locator('#dev-dag').textContent()) === 'Onderwerp 1 van 6', `kop NL onderwerp: "${await p.locator('#dev-dag').textContent()}"`);

// De zondagsweek werkt nog als vanouds (weekdagen, video, "day x of 6")
await p.getByRole('button', { name: 'Switch to English' }).click();
await p.goto('http://127.0.0.1:4199/?nu=2026-10-22T12:00:00%2B02:00#/d/2026-10-18/4/en'); await p.waitForSelector('#devotion:not([hidden])');
const chipsZo = await p.locator('#dev-dagen .chip').allTextContents();
check(chipsZo[1] === 'Mon' && chipsZo[6] === 'Sat', `zondagsweek: weekdagknoppen (${chipsZo.join(' | ')})`);
check((await p.locator('#dev-dag').textContent()) === 'Thursday, day 4 of 6', 'zondagsweek: "Thursday, day 4 of 6"');
check(await p.locator('#kop-beeld').isVisible(), 'zondagsweek: YouTube-beeld zichtbaar');
check(/youtube\.com/.test(await p.locator('#dev-link').getAttribute('href')), 'zondagsweek: tijd is een YouTube-link');
check(await p.locator('#dev-deel').isVisible(), 'zondagsweek: "Watch this part" zichtbaar');
// Review P1-1: de blokkade "nog niet aan de beurt" blijft aan de nieuwste zondagsweek hangen, ook met de conferentie erboven (donderdag 22-10: vr/za dicht).
const dicht = await p.locator('#dev-dagen .chip:disabled').allTextContents();
check(JSON.stringify(dicht) === JSON.stringify(['Fri', 'Sat']), `zondagsweek 18-10 op donderdag: dicht = ${dicht.join(',')}`);
await p.goto('http://127.0.0.1:4199/?nu=2026-10-22T12:00:00%2B02:00#/d/2026-10-11/4/en'); await p.waitForSelector('#devotion:not([hidden])');
check((await p.locator('#dev-dagen .chip:disabled').count()) === 0, 'oudere zondagsweek 11-10: alles open');
await b.close();
console.log(fouten.length ? `\n${fouten.length} FOUT(EN)` : '\nALLES OK');
process.exit(fouten.length ? 1 : 0);
