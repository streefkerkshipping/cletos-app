// U1 — pure logica van de app: groeperen, tijden, routelink. Draait met `node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { groepeerPerDag, formatteerTijd, routeLink, isDienst, labelDag, labelPeriode, maakIcs, icsLink } from '../web/logica.js';

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
