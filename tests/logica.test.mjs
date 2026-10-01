// U1 — pure logica van de app: groeperen, tijden, routelink. Draait met `node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { groepeerPerDag, formatteerTijd, routeLink, isDienst, labelDag, labelPeriode, maakIcs, icsLink, leesDieplink, dieplink, korteDeeltekst, eersteZinnen } from '../web/logica.js';
import { readFileSync } from 'node:fs';

const ev = (o) => ({ identifier: 'x', naam: 'Iets', start: '2026-09-27 10:00:00', eind: '2026-09-27 11:30:00', locatie: { naam: '', adres: '', lat: null, lon: null }, site: null, aanmelden: { nodig: false, url: '' }, ...o });

test('groepeerPerDag: gesorteerd op start, gegroepeerd per dag, verleden weg', () => {
  const nu = new Date('2026-09-26T12:00:00+02:00');
  const lijst = [
    ev({ identifier: 'b', start: '2026-09-27 12:30:00', eind: '2026-09-27 14:00:00' }),
    ev({ identifier: 'a', start: '2026-09-27 10:00:00', eind: '2026-09-27 11:30:00' }),
    ev({ identifier: 'oud', start: '2026-09-20 10:00:00', eind: '2026-09-20 11:30:00' }),
    ev({ identifier: 'c', start: '2026-09-30 19:00:00', eind: '2026-09-30 21:30:00' }),
  ];
  const dagen = groepeerPerDag(lijst, nu);
  assert.deepEqual(dagen.map(d => d.datum), ['2026-09-27', '2026-09-30']);
  assert.deepEqual(dagen[0].items.map(i => i.identifier), ['a', 'b']);
});

test('groepeerPerDag: iets dat vandaag nog bezig is blijft staan', () => {
  const nu = new Date('2026-09-27T10:30:00+02:00');
  const dagen = groepeerPerDag([ev({ start: '2026-09-27 10:00:00', eind: '2026-09-27 11:30:00' })], nu);
  assert.equal(dagen.length, 1);
});

test('formatteerTijd: begin–eind, en hele dag bij 00:00', () => {
  assert.equal(formatteerTijd('2026-09-27 10:00:00', '2026-09-27 11:30:00'), '10:00–11:30');
  assert.equal(formatteerTijd('2026-10-04 00:00:00', '2026-10-04 23:59:00'), 'hele dag');
});

test('labelDag: Nederlandse weekdag en datum', () => {
  assert.equal(labelDag('2026-09-27'), 'zondag 27 september');
});

test('routeLink: coördinaten gaan voor, anders adres, anders niets', () => {
  assert.match(routeLink(ev({ locatie: { naam: 'Circa', adres: 'Seineweg 2, 1043 BG Amsterdam', lat: 52.39083, lon: 4.81737 } })), /52\.39083,4\.81737/);
  assert.match(routeLink(ev({ locatie: { naam: 'Dominion', adres: 'Ergens 1, Amsterdam', lat: null, lon: null } })), /Ergens%201%2C%20Amsterdam/);
  assert.equal(routeLink(ev({ locatie: { naam: '', adres: '', lat: null, lon: null } })), null);
});

test('isDienst: herkent zondagdiensten aan de naam', () => {
  assert.equal(isDienst(ev({ naam: '12:30 Service AMS' })), true);
  assert.equal(isDienst(ev({ naam: 'Connect Group' })), false);
});

test('labelPeriode: één dag, meerdere dagen, over een maandgrens', () => {
  assert.equal(labelPeriode('2026-10-09 19:00:00', '2026-10-09 21:30:00'), 'vr 9 okt');
  assert.equal(labelPeriode('2026-10-21 00:00:00', '2026-10-23 23:59:00'), 'wo 21 – vr 23 okt');
  assert.equal(labelPeriode('2026-09-30 10:00:00', '2026-10-02 10:00:00'), 'wo 30 sep – vr 2 okt');
});

test('maakIcs: dienst in Amsterdamse tijd → UTC, met locatie; hele dag als DATE', () => {
  const dienst = ev({ identifier: 'rsrnbjkr', naam: '12:30 Service AMS', start: '2026-09-27 12:30:00', eind: '2026-09-27 14:00:00', locatie: { naam: 'Circa', adres: 'Seineweg 2, 1043 BG Amsterdam', lat: 1, lon: 1 } });
  const ics = maakIcs(dienst);
  assert.match(ics, /DTSTART:20260927T103000Z/);
  assert.match(ics, /DTEND:20260927T120000Z/);
  assert.match(ics, /SUMMARY:12:30 Service AMS/);
  assert.match(ics, /LOCATION:Circa\\, Seineweg 2\\, 1043 BG Amsterdam/);
  assert.match(ics, /UID:rsrnbjkr@cletos/);
  const conf = ev({ identifier: 'conf', naam: 'Conferentie', start: '2026-10-21 00:00:00', eind: '2026-10-23 23:59:00' });
  assert.match(maakIcs(conf), /DTSTART;VALUE=DATE:20261021\r\nDTEND;VALUE=DATE:20261024/);
  assert.match(icsLink(dienst), /^data:text\/calendar;charset=utf-8,BEGIN%3AVCALENDAR/);
});

// Church Friend (01-10): kort delen met een link naar de devotie in de app.
const weekStones = JSON.parse(readFileSync(new URL('../data/devoties/2026-09-27.json', import.meta.url), 'utf8'));
const BASIS = 'https://app.cletos.nl/';

test('leesDieplink: alleen #/d/<week>/<dag 0–6>[/nl|en]; dieplink maakt dezelfde vorm', () => {
  assert.deepEqual(leesDieplink('#/d/2026-09-27/4'), { week: '2026-09-27', dag: 4, taal: null });
  assert.deepEqual(leesDieplink('#/d/2026-09-27/0/nl'), { week: '2026-09-27', dag: 0, taal: 'nl' });
  assert.deepEqual(leesDieplink('#/d/2026-09-27/7'), { week: '2026-09-27', dag: 7, taal: null }); // 7 = de gebeden uit de dienst
  for (const h of ['', '#/home', '#/agenda', '#/d/2026-09-27/8', '#/d/2026-9-27/1', '#/d/2026-09-27/4/x', '#/d/2026-09-27/4/nl/x', '#/d/<script>/1']) assert.equal(leesDieplink(h), null, h);
  assert.deepEqual(leesDieplink(new URL(dieplink(BASIS, '2026-09-27', 4, 'en')).hash), { week: '2026-09-27', dag: 4, taal: 'en' });
});

test('eersteZinnen: de eerste twee zinnen, nooit over een weglating heen', () => {
  assert.equal(eersteZinnen('Een. Twee! Drie? Vier.'), 'Een. Twee!');
  assert.equal(eersteZinnen('Alleen dit stuk. ... En dan nog veel meer. En meer.'), 'Alleen dit stuk.');
  assert.equal(eersteZinnen('geen punt'), 'geen punt');
  assert.equal(eersteZinnen(''), '');
});

test('korteDeeltekst: titel, bijbeltekst, het begin, de oplossing en de link met de taal; niet de vraag, het vers, het gebed of hele alinea\'s; elk stuk staat letterlijk in de devotie', () => {
  for (const d of weekStones.devotions) {
    const en = korteDeeltekst(weekStones, d.dag, 'en', BASIS, 'Read the whole daily devotion');
    assert.equal(en, `${d.titel}\n${d.bijbeltekst}\n\n“${d.deel.begin}”\n\n“${d.deel.oplossing}”\n\nRead the whole daily devotion: https://app.cletos.nl/#/d/2026-09-27/${d.dag}/en`);
    const alles = d.zinnen.map(z => z.tekst).join(' '), allesNl = d.zinnen.map(z => z.tekst_nl).join(' ');
    assert.ok(alles.includes(d.deel.begin) && alles.includes(d.deel.oplossing), `dag ${d.dag}: letterlijk uit de alinea's`);
    assert.ok(allesNl.includes(d.deel.begin_nl) && allesNl.includes(d.deel.oplossing_nl), `dag ${d.dag}: Nederlands letterlijk uit de vertaalde alinea's`);
    for (const z of d.zinnen) assert.ok(!en.includes(z.tekst));
    assert.ok(!en.includes(d.vraag.tekst) && !en.includes(d.gebed.tekst)); // het vers mag wel: de spreker leest het soms voor in het gekozen stuk
    assert.ok(en.split(/\s+/).length < 200 && d.deel.oplossing.split(/\s+/).length >= 40, 'korter dan de devotie, maar met een echt stuk erin');
    const nl = korteDeeltekst(weekStones, d.dag, 'nl', BASIS, 'Lees de hele daily devotion');
    assert.equal(nl, `${d.titel_nl}\n${d.bijbeltekst_nl}\n\n“${d.deel.begin_nl}”\n\n“${d.deel.oplossing_nl}”\n\nLees de hele daily devotion: https://app.cletos.nl/#/d/2026-09-27/${d.dag}/nl`);
  }
});

test('korteDeeltekst zonder "deel" (oude weken, of een stuk dat niet letterlijk klopte): eerste zinnen + kernzin; zondag: het ene punt, de zin om mee te nemen, link naar dag 0', () => {
  const s = weekStones.samenvatting;
  const nl = korteDeeltekst(weekStones, 0, 'nl', BASIS, 'Lees de hele daily devotion');
  assert.equal(nl, `${weekStones.titel_nl}\n\n${s.kop.tekst_nl}\n\n“${s.luister.citaat}”\n\nLees de hele daily devotion: https://app.cletos.nl/#/d/2026-09-27/0/nl`);
  const oud = JSON.parse(readFileSync(new URL('./fixtures/data/devoties/2026-08-30.json', import.meta.url), 'utf8'));
  const en = korteDeeltekst(oud, 0, 'en', BASIS, 'Read the whole daily devotion');
  assert.ok(en.startsWith(oud.titel) && en.includes(oud.terugblik.slot.tekst) && en.endsWith('#/d/2026-08-30/0/en'));
  const o = oud.devotions[1], dag = korteDeeltekst(oud, 2, 'nl', BASIS, 'Lees de hele daily devotion'); // geen vertaling → Engels
  assert.equal(dag, `${o.titel}\n${o.bijbeltekst}\n\n“${eersteZinnen(o.zinnen[0].tekst)}”\n\n“${o.citaat}”\n\nLees de hele daily devotion: https://app.cletos.nl/#/d/2026-08-30/2/nl`);
  const zonder = { ...weekStones, devotions: weekStones.devotions.map(x => ({ ...x, deel: undefined })) }, d4 = weekStones.devotions[3];
  assert.ok(korteDeeltekst(zonder, 4, 'nl', BASIS, 'x').includes(`“${eersteZinnen(d4.zinnen[0].tekst_nl)}”\n\n“${d4.citaat}”`));
});
