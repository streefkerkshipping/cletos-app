// Pure logica, zonder DOM: getest met node --test (tests/logica.test.mjs).
const TZ = 'Europe/Amsterdam';
const NAMEN = {
  nl: { dagen: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'], kort: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'], maanden: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'], mk: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'], heleDag: 'hele dag' },
  en: { dagen: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], kort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], maanden: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], mk: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], heleDag: 'all day' },
};

/** "2026-09-27 10:00:00" (wandkloktijd Amsterdam) → Date. */
export function parseLokaal(s) {
  const [d, t = '00:00:00'] = s.split(' ');
  const [j, m, dag] = d.split('-').map(Number);
  const [u, mi, se = 0] = t.split(':').map(Number);
  // Zoek de UTC-tijd die in Amsterdam op deze wandkloktijd valt (zomer-/wintertijd).
  const gok = Date.UTC(j, m - 1, dag, u, mi, se);
  const offset = offsetMinuten(new Date(gok));
  return new Date(gok - offset * 60_000);
}
function offsetMinuten(date) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' }).formatToParts(date).find(x => x.type === 'timeZoneName').value;
  const m = p.match(/GMT([+-]\d+)(?::(\d+))?/); if (!m) return 0;
  return Number(m[1]) * 60 + (m[2] ? Math.sign(Number(m[1])) * Number(m[2]) : 0);
}
export const datumDeel = (s) => s.slice(0, 10);
const tijdDeel = (s) => s.slice(11, 16);

export function formatteerTijd(start, eind, taal = 'nl') {
  const a = tijdDeel(start), b = tijdDeel(eind);
  if (a === '00:00' && (b === '23:59' || b === '00:00' || b === '23:00')) return NAMEN[taal].heleDag;
  return b && b !== a ? `${a}–${b}` : a;
}

export function labelDag(datum, taal = 'nl') {
  const [j, m, d] = datum.split('-').map(Number);
  const dag = new Date(Date.UTC(j, m - 1, d)).getUTCDay();
  const n = NAMEN[taal];
  return `${n.dagen[dag]} ${d} ${n.maanden[m - 1]}`;
}
export const kortDag = (datum, taal = 'nl') => { const [j, m, d] = datum.split('-').map(Number); return NAMEN[taal].kort[new Date(Date.UTC(j, m - 1, d)).getUTCDay()]; };

/** Alleen wat nog niet voorbij is, gesorteerd, per dag. */
export function groepeerPerDag(evenementen, nu = new Date(), taal = 'nl') {
  const toekomst = evenementen.filter(e => parseLokaal(e.eind || e.start) >= nu)
    .sort((a, b) => a.start.localeCompare(b.start) || a.naam.localeCompare(b.naam));
  const dagen = [];
  for (const e of toekomst) {
    const datum = datumDeel(e.start);
    let d = dagen[dagen.length - 1];
    if (!d || d.datum !== datum) { d = { datum, label: labelDag(datum, taal), items: [] }; dagen.push(d); }
    d.items.push(e);
  }
  return dagen;
}

export function routeLink(e) {
  const l = e.locatie || {};
  if (l.lat != null && l.lon != null) return `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}`;
  if (l.adres) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(l.adres)}`;
  return null;
}

export const isDienst = (e) => /\bservice\b/i.test(e.naam);
export const isVandaag = (e, nu = new Date()) => datumDeel(e.start) === nu.toLocaleDateString('sv-SE', { timeZone: TZ });

/** "wo 21 – vr 23 okt" voor meerdaagse items, anders "wo 21 okt". */
export function labelPeriode(start, eind, taal = 'nl') {
  const KORT = NAMEN[taal].kort, MK = NAMEN[taal].mk;
  const f = (s) => { const [j, m, d] = datumDeel(s).split('-').map(Number); return { d, m, wd: KORT[new Date(Date.UTC(j, m - 1, d)).getUTCDay()] }; };
  const a = f(start), b = f(eind || start);
  if (datumDeel(start) === datumDeel(eind || start)) return `${a.wd} ${a.d} ${MK[a.m - 1]}`;
  return a.m === b.m ? `${a.wd} ${a.d} – ${b.wd} ${b.d} ${MK[a.m - 1]}` : `${a.wd} ${a.d} ${MK[a.m - 1]} – ${b.wd} ${b.d} ${MK[b.m - 1]}`;
}

/** Agenda-bestand (iCalendar) voor één item. Tijden als UTC (Z) zodat elke agenda-app ze goed zet; hele dag als DATE. */
export function maakIcs(ev, url = '') {
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const heleDag = formatteerTijd(ev.start, ev.eind, 'nl') === 'hele dag';
  let dt;
  if (heleDag) {
    const eind = new Date(parseLokaal(ev.eind || ev.start).getTime() + 24 * 3600 * 1000);
    dt = `DTSTART;VALUE=DATE:${datumDeel(ev.start).replace(/-/g, '')}\r\nDTEND;VALUE=DATE:${eind.toISOString().slice(0, 10).replace(/-/g, '')}`;
  } else {
    dt = `DTSTART:${utc(parseLokaal(ev.start))}\r\nDTEND:${utc(parseLokaal(ev.eind || ev.start))}`;
  }
  const loc = [ev.locatie?.naam, ev.locatie?.adres].filter(Boolean).join(', ');
  const regels = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cletos//NL', 'BEGIN:VEVENT', `UID:${ev.identifier}@cletos`, `DTSTAMP:${utc(new Date())}`, dt, `SUMMARY:${esc(ev.naam)}`];
  if (loc) regels.push(`LOCATION:${esc(loc)}`);
  if (ev.beschrijving) regels.push(`DESCRIPTION:${esc(ev.beschrijving)}`);
  if (ev.aanmelden?.url || url) regels.push(`URL:${ev.aanmelden?.url || url}`);
  regels.push('END:VEVENT', 'END:VCALENDAR');
  return regels.join('\r\n') + '\r\n';
}
export const icsLink = (ev) => 'data:text/calendar;charset=utf-8,' + encodeURIComponent(maakIcs(ev));
