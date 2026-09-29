// A2 — Ask the service: elk citaat dat terugkomt staat letterlijk in de segmenten van de genoemde preek. Geen AI in deze tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { norm, zoekCitaat, tijdLabel, geldigeMap, controleerBronnen, maakAntwoord, WEIGERING } from '../lokaal/ask.mjs';

const SEGMENTEN = [
  { sec: 1.3, tekst: '[applause and music]' },
  { sec: 1043.2, tekst: 'Forgiveness is not forgetting.' },
  { sec: 1046.9, tekst: "It's releasing a debt [music] into" },
  { sec: 1049.4, tekst: "God's hands, and trusting him" },
  { sec: 1052.0, tekst: 'to do justice.' },
  { sec: 2101.5, tekst: 'Choose freedom again, every day.' },
];
const PREEK = { map: '2026-09-20-AVoWL5wCHuA', meta: { video_id: 'AVoWL5wCHuA', datum: '2026-09-20', titel_youtube: 'Following God Wholeheartedly | Hillsong Church Netherlands' }, segmenten: SEGMENTEN };
const leesPreek = (map) => (map === PREEK.map ? PREEK : null);

test('norm: hoofdletters, leestekens en apostrofs tellen niet mee; woorden en volgorde wel', () => {
  assert.equal(norm('It’s  releasing, a DEBT!'), 'its releasing a debt');
  assert.notEqual(norm('a debt releasing'), norm('releasing a debt'));
});

test('zoekCitaat: citaat over meerdere segmenten → seconde van het segment waar het begint', () => {
  const r = zoekCitaat(SEGMENTEN, "It's releasing a debt into God's hands");
  assert.equal(r.sec, 1046.9);
});

test('zoekCitaat: geluidsmarkering als [music] midden in een zin breekt het citaat niet', () => {
  assert.ok(zoekCitaat(SEGMENTEN, 'releasing a debt into God’s hands, and trusting him to do justice'));
});

test('zoekCitaat: begint het citaat halverwege een segment, dan telt dat segment', () => {
  assert.equal(zoekCitaat(SEGMENTEN, 'trusting him to do justice').sec, 1049.4);
});

test('zoekCitaat: weglating (…) → elk deel moet er staan, tijd van het eerste deel', () => {
  assert.equal(zoekCitaat(SEGMENTEN, 'Forgiveness is not forgetting … Choose freedom again').sec, 1043.2);
  assert.equal(zoekCitaat(SEGMENTEN, 'Forgiveness is not forgetting ... forgiveness is a feeling'), null);
});

test('zoekCitaat: verzonnen of geparafraseerd citaat → niet gevonden', () => {
  assert.equal(zoekCitaat(SEGMENTEN, 'Forgiveness means you forget what happened'), null);
});

test('zoekCitaat: minder dan drie woorden is geen citaat', () => {
  assert.equal(zoekCitaat(SEGMENTEN, 'do justice'), null);
  assert.equal(zoekCitaat(SEGMENTEN, ''), null);
});

test('tijdLabel: seconden → m:ss, boven het uur u:mm:ss', () => {
  assert.equal(tijdLabel(1046.9), '17:26');
  assert.equal(tijdLabel(65), '1:05');
  assert.equal(tijdLabel(4169), '1:09:29');
});

test('geldigeMap: alleen een preekmap-naam, geen pad naar elders', () => {
  assert.equal(geldigeMap('2026-09-20-AVoWL5wCHuA'), true);
  assert.equal(geldigeMap('2026-03-15'), true);
  for (const fout of ['../../wiki/admin', '2026-09-20/../../..', '/etc/passwd', 'kennis', '', null, 42]) assert.equal(geldigeMap(fout), false);
});

test('controleerBronnen: gevonden citaat krijgt datum, tijd en link naar de seconde; de rest valt weg', () => {
  const r = controleerBronnen([
    { map: PREEK.map, citaat: "It's releasing a debt into God's hands" },
    { map: PREEK.map, citaat: 'Forgiveness means you forget what happened' },
    { map: '../../wiki/admin', citaat: 'Forgiveness is not forgetting.' },
    { map: '2026-01-01', citaat: 'Forgiveness is not forgetting.' },
  ], leesPreek);
  assert.equal(r.bronnen.length, 1);
  assert.deepEqual(r.bronnen[0], { datum: '2026-09-20', titel: 'Following God Wholeheartedly', tijd: '17:26', tijd_sec: 1046, youtube_url: 'https://www.youtube.com/watch?v=AVoWL5wCHuA&t=1046s', citaat: "It's releasing a debt into God's hands" });
  assert.equal(r.afgevallen.length, 3);
});

test('maakAntwoord: antwoord met minstens één gecontroleerd citaat gaat door', () => {
  const r = maakAntwoord({ antwoord: 'Vergeving is loslaten.', weigering: false, bronnen: [{ map: PREEK.map, citaat: 'Forgiveness is not forgetting.' }] }, leesPreek, 'nl');
  assert.equal(r.weigering, false);
  assert.equal(r.antwoord, 'Vergeving is loslaten.');
  assert.equal(r.bronnen.length, 1);
});

test('maakAntwoord: geen enkel citaat teruggevonden → weigering met de vaste zin, het antwoord van het model vervalt', () => {
  const r = maakAntwoord({ antwoord: 'De spreker zegt dat je alles moet vergeten.', weigering: false, bronnen: [{ map: PREEK.map, citaat: 'You must forget everything that happened' }] }, leesPreek, 'nl');
  assert.equal(r.weigering, true);
  assert.equal(r.bronnen.length, 0);
  assert.ok(r.antwoord.startsWith(WEIGERING.nl));
  assert.ok(!r.antwoord.includes('alles moet vergeten'));
});

test('maakAntwoord: het model weigert zelf → vaste zin voorop, zijn toelichting erachter, in de gevraagde taal', () => {
  const r = maakAntwoord({ antwoord: 'The closest is a sermon about generosity.', weigering: true, bronnen: [] }, leesPreek, 'en');
  assert.equal(r.weigering, true);
  assert.ok(r.antwoord.startsWith(WEIGERING.en));
  assert.ok(r.antwoord.includes('generosity'));
});

test('maakAntwoord: kapotte uitvoer van het model → weigering, geen crash', () => {
  for (const kapot of [null, {}, { antwoord: 42 }, { antwoord: 'x', bronnen: 'geen lijst' }]) assert.equal(maakAntwoord(kapot, leesPreek, 'nl').weigering, true);
});
