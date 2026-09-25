const $ = (s, r = document) => r.querySelector(s);
// Schermen. Leest data/evenementen.json (statisch) en praat via opslag.js met de opslag. Rechten liggen in de database.
import { groepeerPerDag, formatteerTijd as fmtTijd, routeLink, isDienst, labelPeriode as lblPeriode, labelDag as lblDag, kortDag as krtDag, datumDeel, icsLink } from './logica.js';
import { t, taal, zetTaal, vertaalDom } from './taal.js';
const formatteerTijd = (s, e) => fmtTijd(s, e, taal);
const labelPeriode = (s, e) => lblPeriode(s, e, taal);
const labelDag = (d) => lblDag(d, taal);
document.documentElement.lang = taal; vertaalDom();
$('#taalknop').textContent = t('taal_wissel');
$('#taalknop').onclick = () => { zetTaal(taal === 'en' ? 'nl' : 'en'); location.reload(); };
import { maakOpslag, OpslagFout } from './opslag.js';

const cfg = window.KRING_CONFIG;
const nuParam = cfg?.opslag === 'mock' ? new URLSearchParams(location.search).get('nu') : null;
const nu = () => (nuParam ? new Date(nuParam) : cfg?.nu ? new Date(cfg.nu) : new Date());
const opslag = maakOpslag(cfg);
let lid = null, evenementen = [], bijgewerkt = '', wie = [], punten = [], timer = null;

const zetStatus = (t) => { const e = $('#status'); e.textContent = t || ''; e.hidden = !t; };
const zetAlert = (t) => { const e = $('#alert'); e.textContent = t || ''; e.hidden = !t; };

async function laadEvenementen() {
  try {
    const r = await fetch('data/evenementen.json', { cache: 'no-cache' });
    const d = await r.json();
    evenementen = d.evenementen; bijgewerkt = d.opgehaald_op;
    try { localStorage.setItem('kring.evenementen', JSON.stringify(d)); } catch {}
  } catch {
    try { const d = JSON.parse(localStorage.getItem('kring.evenementen') || 'null'); if (d) { evenementen = d.evenementen; bijgewerkt = d.opgehaald_op; } } catch {}
  }
}

function toonAanmelden() {
  $('#aanmelden').hidden = false; $('#home').hidden = true; $('#wie').hidden = true;
  $('#aanmeldformulier').onsubmit = async (e) => {
    e.preventDefault();
    const fout = $('#aanmeldfout'); fout.hidden = true;
    const knop = $('#aanmeldformulier button'); knop.disabled = true;
    try {
      lid = await opslag.wordLid($('#naam').value.trim(), $('#woonplaats').value.trim());
      onthoudLid(lid);
      await toonHome();
    } catch (err) {
      fout.textContent = err instanceof OpslagFout ? t('aanmeld_fout_storing') : t('aanmeld_fout', { m: err.message });
      fout.hidden = false;
    } finally { knop.disabled = false; }
  };
}

const PAGINAS = { '#/home': 'pagina-home', '#/agenda': 'home', '#/connect': 'pagina-connect' };
function toonPagina() {
  const doel = PAGINAS[location.hash] || 'pagina-home';
  for (const s of document.querySelectorAll('.pagina')) s.hidden = s.id !== doel;
  for (const l of document.querySelectorAll('#tabs a')) l.setAttribute('aria-current', l.dataset.pagina === doel ? 'page' : 'false');
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', toonPagina);

// Ask the service: de vraagfunctie zelf is fase 4 (serverfunctie met de kennislaag). Tot die tijd zegt dit blok dat eerlijk.
$('#askformulier').onsubmit = (e) => {
  e.preventDefault();
  const v = $('#askvraag').value.trim(); if (!v) return;
  const p = $('#askantwoord'); p.hidden = false;
  p.textContent = cfg?.askUrl ? t('ask_wacht') : t('ask_niet');
};

async function toonHome() {
  $('#aanmelden').hidden = true; $('#app').hidden = false; $('#tabs').hidden = false; toonPagina();
  const w = $('#wie'); w.hidden = false; w.innerHTML = '';
  w.append(`${lid.naam} · ${lid.woonplaats}`);
  const uit = document.createElement('button'); uit.type = 'button'; uit.textContent = t('verwijder_mij');
  uit.onclick = async () => { if (!confirm(t('verwijder_bevestig'))) return; try { await opslag.verwijderMij(); lid = null; onthoudLid(null); location.reload(); } catch { zetAlert(t('fout_verwijderen')); } };
  w.append(uit);
  $('#bijgewerkt').textContent = bijgewerkt ? t('bijgewerkt', { d: new Date(bijgewerkt).toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }) : '';
  await ververs(true);
  clearInterval(timer); timer = setInterval(() => ververs(false), (cfg.verversSeconden || 5) * 1000);
}

const vandaagStr = () => nu().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
/** Zondag van deze week (vandaag als het zondag is). */
function weekEind() {
  const d = new Date(nu().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
  const naarZondag = (7 - d.getDay()) % 7; d.setDate(d.getDate() + naarZondag);
  return d.toLocaleDateString('sv-SE');
}

let vorigeStand = '';
async function ververs(eerste) {
  let storing = false;
  try { wie = await opslag.wieGaat(); punten = await opslag.gebedspunten(vandaagStr()); zetStatus(''); }
  catch (err) { if (!(err instanceof OpslagFout)) throw err; storing = true; if (eerste) wie = []; zetStatus(t('status_storing')); }
  // Alleen opnieuw tekenen als er echt iets veranderd is: anders verspringt de pagina en raakt invoer (teamveld) kwijt.
  const stand = JSON.stringify({ wie, punten, storing, taal });
  if (!eerste && stand === vorigeStand) return;
  vorigeStand = stand;
  try { render(); } catch (err) { console.error('render mislukt:', err); throw err; }
}

let laterOpen = false; try { laterOpen = localStorage.getItem('kring.later') === '1'; } catch {}

function render() {
  const dagen = groepeerPerDag(evenementen, nu(), taal);
  const zondagDoel = $('#zondag'); zondagDoel.innerHTML = '';
  const week = $('#week'), later = $('#later'), belangrijk = $('#belangrijk');
  $('.rijen', week).innerHTML = ''; $('.rijen', later).innerHTML = ''; $('.rijen', belangrijk).innerHTML = '';
  if (!dagen.length) { zondagDoel.textContent = t('leeg_agenda'); week.hidden = later.hidden = true; return; }

  // Anker: de eerstvolgende dag met een dienst. Belangrijke items krijgen een eigen kop en staan niet dubbel in de lijst.
  const zondag = dagen.find(d => d.items.some(isDienst));
  const top = dagen.flatMap(d => d.items).filter(ev => ev.belangrijk);
  const rest = [];
  for (const d of dagen) {
    const items = d.items.filter(ev => !ev.belangrijk && !(d === zondag && isDienst(ev)));
    if (items.length) rest.push({ ...d, items });
  }
  if (zondag) zondagDoel.append(zondagBlok(zondag));
  belangrijk.hidden = !top.length;
  for (const ev of top) $('.rijen', belangrijk).append(rij(ev, datumDeel(ev.start), true));
  // "Deze week" = de komende zeven dagen (Bas, 24-09: de connectgroep van dinsdag hoort erbij); daarna = "Later".
  const grens = new Date(nu().getTime() + 7 * 24 * 3600 * 1000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
  const dezeWeek = rest.filter(d => d.datum <= grens);
  const daarna = rest.filter(d => d.datum > grens);
  week.hidden = !dezeWeek.length;
  for (const d of dezeWeek) for (const ev of d.items) $('.rijen', week).append(rij(ev, d.datum));
  later.hidden = !daarna.length;
  const n = daarna.reduce((t, d) => t + d.items.length, 0);
  const knop = $('#toon-later'); knop.textContent = laterOpen ? t('verberg') : t('toon_meer', { n });
  $('.rijen', later).hidden = !laterOpen;
  knop.onclick = () => { laterOpen = !laterOpen; try { localStorage.setItem('kring.later', laterOpen ? '1' : '0'); } catch {} render(); };
  for (const d of daarna) { const kop = document.createElement('h3'); kop.className = 'later-dag'; kop.textContent = d.label; $('.rijen', later).append(kop); for (const ev of d.items) $('.rijen', later).append(rij(ev, d.datum)); }
  renderConnect(dagen); renderStart(zondag, dagen); renderPunten();
}

function renderConnect(dagen) {
  const lijst = $('#connect-lijst'); lijst.innerHTML = '';
  const items = dagen.flatMap(d => d.items.map(ev => [ev, d.datum])).filter(([ev]) => ev.categorie === 'Connectgroep');
  $('#connect-leeg').hidden = !!items.length;
  items.forEach(([ev, datum], i) => { if (i === 0) open.add(ev.identifier); lijst.append(rij(ev, datum, true)); });
}

const WEEKDAGEN_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAGEN_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const yt = (sec) => devoties ? `https://www.youtube.com/watch?v=${devoties.video_id}&t=${sec}s` : '#';
function deelTekst(soort) {
  const kop = `${devoties.titel} — Hillsong Church Netherlands, ${datumLang(devoties.week)}`;
  if (soort === 'terugblik') {
    const regels = devoties.terugblik.dagen.map(d => `${d.dag}. “${d.citaat}” (${d.tijd})\n${d.zin}`);
    const slot = devoties.terugblik.slot?.tekst ? `\n${t('slot_kop')}: ${devoties.terugblik.slot.tekst}` : '';
    return `${kop}\n${t('terugblik_titel')}\n\n${regels.join('\n\n')}\n${slot}\n\nhttps://www.youtube.com/watch?v=${devoties.video_id}`;
  }
  const d = devoties.devotions.find(x => x.dag === devDag);
  return `${d.titel}\n${d.bijbeltekst}\n\n“${d.citaat}” (${d.tijd})\n\n${d.zinnen.map(z => z.tekst).join('\n\n')}\n\n${d.gebed.tekst}\n\n${kop}\n${yt(d.tijd_sec)}`;
}
async function deel(soort, statusEl) {
  const tekst = deelTekst(soort); statusEl.textContent = '';
  try {
    if (navigator.share) { await navigator.share({ title: devoties.titel, text: tekst }); return; }
    await navigator.clipboard.writeText(tekst); statusEl.textContent = t('gekopieerd');
  } catch (err) { if (err?.name !== 'AbortError') { try { await navigator.clipboard.writeText(tekst); statusEl.textContent = t('gekopieerd'); } catch { statusEl.textContent = tekst.slice(0, 80) + '…'; } } }
}
$('#dev-delen').onclick = () => deel('devotion', $('#dev-deelstatus'));
$('#tb-delen').onclick = () => deel('terugblik', $('#tb-deelstatus'));
$('#dev-week').onchange = async (e2) => { devWeek = e2.target.value; devoties = await laadWeek(devWeek); devDag = 0; renderDevotion(); };

function renderDevotion() {
  const dev = $('#devotion'), tb = $('#terugblik'), leeg = $('#devotion-leeg'), nav = $('#devotion-nav');
  dev.hidden = tb.hidden = true; leeg.hidden = !!devoties; nav.hidden = !devoties;
  if (!devoties) return;
  // Weekkiezer: "20 September: titel", nieuwste eerst.
  const sel = $('#dev-week'); sel.innerHTML = '';
  for (const w of devIndex) { const o = document.createElement('option'); o.value = w.week; o.textContent = `${datumLang(w.week)}: ${w.titel}`; o.selected = w.week === devWeek; sel.append(o); }
  // Dag: standaard vandaag (in de nieuwste week), anders de samenvatting.
  const nieuwste = devWeek === devIndex[0]?.week;
  if (devDag === null) devDag = nieuwste ? weekdagNu() : 0;
  const chips = $('#dev-dagen'); chips.innerHTML = '';
  for (const dag of [0, 1, 2, 3, 4, 5, 6]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip dagchip'; b.setAttribute('role', 'tab');
    b.textContent = dag === 0 ? t('samenvatting') : t('dag_kort')[dag]; b.setAttribute('aria-selected', String(dag === devDag));
    if (nieuwste && dag > weekdagNu() && weekdagNu() !== 0) b.disabled = true; // nog niet aan de beurt
    b.onclick = () => { devDag = dag; renderDevotion(); }; chips.append(b);
  }
  const weekLabel = t('van_zondag', { d: datumLang(devoties.week) });
  if (devDag === 0) {
    tb.hidden = false; $('#tb-week').textContent = weekLabel; $('#tb-titel').textContent = `${datumLang(devoties.week)}: ${devoties.titel}`;
    const ol = $('#tb-lijst'); ol.innerHTML = '';
    for (const d of devoties.terugblik.dagen) { const li = document.createElement('li'); const q = document.createElement('strong'); q.textContent = d.citaat; const a = document.createElement('a'); a.href = yt(d.tijd_sec); a.target = '_blank'; a.rel = 'noopener'; a.textContent = d.tijd; a.className = 'tijdlink'; const z = document.createElement('span'); z.textContent = d.zin; li.append(q, ' ', a, document.createElement('br'), z); ol.append(li); }
    const slot = devoties.terugblik.slot; $('#tb-slot').textContent = slot?.tekst || ''; $('#tb-slotkop').hidden = !slot?.tekst;
    const c = $('#tb-citaat'); c.innerHTML = ''; if (slot?.citaat) { c.append(`“${slot.citaat}” `); const a = document.createElement('a'); a.href = yt(devoties.terugblik.dagen.find(d => d.tijd === slot.tijd)?.tijd_sec ?? 0); a.target = '_blank'; a.rel = 'noopener'; a.textContent = slot.tijd; a.className = 'tijdlink'; c.append(a); } c.hidden = !slot?.citaat;
    return;
  }
  const d = devoties.devotions.find(x => x.dag === devDag); if (!d) { leeg.hidden = false; return; }
  dev.hidden = false;
  $('#dev-dag').textContent = t('dag_van', { dag: (taal === 'nl' ? WEEKDAGEN_NL : WEEKDAGEN_EN)[devDag], n: d.dag }); $('#dev-week-label').textContent = weekLabel;
  $('#dev-titel').textContent = d.titel; $('#dev-bijbel').textContent = d.bijbeltekst;
  $('#dev-citaat').textContent = `“${d.citaat}”`; const l = $('#dev-link'); l.href = yt(d.tijd_sec); l.textContent = d.tijd; l.className = 'tijdlink';
  const z = $('#dev-zinnen'); z.innerHTML = ''; for (const s of d.zinnen) { const p = document.createElement('p'); p.textContent = s.tekst; z.append(p); }
  $('#dev-gebed').textContent = d.gebed.tekst;
  $('#dev-deelstatus').textContent = '';
}

function renderPunten() {
  for (const soort of ['prayer', 'praise']) {
    const ul = $(`#${soort}-lijst`); ul.innerHTML = '';
    const lijst = punten.filter(p => p.soort === soort);
    if (!lijst.length) { const li = document.createElement('li'); li.className = 'leeg'; li.textContent = soort === 'prayer' ? t('geen_prayers') : t('geen_praise'); ul.append(li); continue; }
    for (const p of lijst) {
      const li = document.createElement('li'); const n = document.createElement('strong'); n.textContent = p.anoniem ? t('anoniem') : p.naam; if (p.anoniem) n.classList.add('anoniem-naam'); const tx = document.createElement('span'); tx.textContent = p.tekst; li.append(n, tx);
      if (p.van_mij) { const x = document.createElement('button'); x.type = 'button'; x.className = 'punt-weg'; x.setAttribute('aria-label', t('verwijder_punt')); x.textContent = '✕'; x.onclick = () => actie(() => opslag.verwijderPunt(p.id), t('fout_punt_weg')); li.append(x); }
      ul.append(li);
    }
  }
}
for (const f of document.querySelectorAll('.puntformulier')) f.onsubmit = (e) => {
  e.preventDefault(); const inp = $('input', f); const v = inp.value.trim(); if (!v) return;
  const anoniem = f.dataset.soort === 'prayer' && $('#prayer-anoniem').checked;
  actie(async () => { await opslag.voegPuntToe(f.dataset.soort, v, weekEind(), anoniem); inp.value = ''; if (anoniem) $('#prayer-anoniem').checked = false; }, t('fout_toevoegen'));
};

function renderStart(zondag, dagen) {
  renderDevotion();
  if (zondag) {
    const mijn = wie.filter(g => lid && g.lid_id === lid.id).map(g => zondag.items.find(ev => ev.identifier === g.event)).filter(Boolean);
    $('#home-zondag').textContent = mijn.length ? t('zondag_gekozen', { dag: zondag.label, t: mijn.map(ev => ev.start.slice(11, 16)).join(taal === 'nl' ? ' en ' : ' and ') }) : t('zondag_niet', { dag: zondag.label });
  } else $('#home-zondag').textContent = t('zondag_geen');
  const cg = dagen.flatMap(d => d.items).find(ev => ev.categorie === 'Connectgroep');
  $('#home-connect').textContent = cg ? `${labelDag(datumDeel(cg.start))}, ${formatteerTijd(cg.start, cg.eind)} · ${[cg.locatie.naam, cg.locatie.adres].filter(Boolean).join(', ')}` : t('connect_geen');
}

function zondagBlok(d) {
  const z = $('#tpl-zondag').content.cloneNode(true).querySelector('.zondag');
  z.dataset.testid = `dag-${d.datum}`;
  const diensten = d.items.filter(isDienst);
  $('.zondag-kop', z).textContent = d.label.charAt(0).toUpperCase() + d.label.slice(1);
  const eerste = diensten[0];
  $('.waar', z).textContent = [eerste.locatie.naam, eerste.locatie.adres].filter(Boolean).join(', ') || t('locatie_volgt');
  const route = routeLink(eerste); if (route) { const r = $('.route', z); r.href = route; r.hidden = false; }
  for (const ev of diensten) $('.tegels', z).append(tegel(ev));
  return z;
}

let devIndex = [], devCache = new Map(), devoties = null, devWeek = null, devDag = null;
async function laadWeek(week) {
  if (devCache.has(week)) return devCache.get(week);
  const r = await fetch(`data/devoties/${week}.json`, { cache: 'no-cache' }); if (!r.ok) return null;
  const d = await r.json(); devCache.set(week, d); return d;
}
fetch('data/devoties/index.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(async (idx) => {
  devIndex = idx; if (!idx.length) return;
  devWeek = idx[0].week; devoties = await laadWeek(devWeek); devDag = null; if (lid) renderDevotion();
}).catch(() => {});
const weekdagNu = () => new Date(nu().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })).getDay();
const datumLang = (week) => new Date(week + 'T12:00:00').toLocaleDateString(taal === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long' });
let teams = []; fetch('data/teams.json').then(r => r.json()).then(d => { teams = d.teams || []; }).catch(() => {});
const teamOpen = new Set();

function tegel(ev) {
  const el = $('#tpl-tegel').content.cloneNode(true).querySelector('.tegel');
  el.dataset.testid = `event-${ev.identifier}`;
  const tijd = formatteerTijd(ev.start, ev.eind);
  $('.tegel-tijd', el).textContent = ev.start.slice(11, 16);
  $('.tegel-tot', el).textContent = tijd.includes('–') ? t('tot', { t: tijd.split('–')[1] }) : '';
  $('.sr', el).textContent = ev.naam;
  const alle = wie.filter(g => g.event === ev.identifier);
  const mijn = lid ? alle.find(g => g.lid_id === lid.id) : null;
  const ikGa = mijn?.rol === 'gaat', ikHelp = mijn?.rol === 'helpt';
  el.classList.toggle('gaat', !!mijn);
  $('.ikga', el).hidden = true; $('.tochniet', el).hidden = true;
  const help = $('.ikhelp', el); help.hidden = true;
  const fout = t('fout_opslaan');
  const vink = $('.tegel-vink', el); vink.setAttribute('aria-pressed', String(!!mijn)); vink.setAttribute('aria-label', mijn ? t('snel_af') : t('snel_aan')); $('span', vink).textContent = mijn ? '✓' : '✕';
  vink.onclick = () => { teamOpen.delete(ev.identifier); mijn ? actie(() => opslag.trekIn(ev), t('fout_intrekken')) : actie(() => opslag.gaatNaar(ev, 'gaat', null), t('fout_ikga')); };
  const teamKnop = $('.tegel-team', el); teamKnop.setAttribute('aria-pressed', String(!!ikHelp)); teamKnop.setAttribute('aria-label', ikHelp ? t('team_uit') : t('team_aan')); $('span', teamKnop).textContent = ikHelp ? '✓' : '✕';
  teamKnop.onclick = () => { if (ikHelp) { teamOpen.delete(ev.identifier); actie(() => opslag.gaatNaar(ev, 'gaat', null), t('fout_opslaan')); } else { teamOpen.has(ev.identifier) ? teamOpen.delete(ev.identifier) : teamOpen.add(ev.identifier); render(); } };
  const ag = $('.agenda', el); ag.hidden = !mijn; ag.href = icsLink(ev); ag.download = `cletos-${ev.identifier}.ics`;
  // teamkiezer
  const kiezer = $('.teamkiezer', el); kiezer.hidden = !teamOpen.has(ev.identifier);
  const kies = (team) => { teamOpen.delete(ev.identifier); actie(() => opslag.gaatNaar(ev, 'helpt', team), fout); };
  for (const team of teams) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = team; b.onclick = () => kies(team); $('.teams', el).append(b); }
  $('.teamanders', el).onsubmit = (e2) => { e2.preventDefault(); const v = $('input', e2.target).value.trim(); if (v) kies(v); };
  // twee lijstjes
  vulLijst($('.lijst.gaan', el), alle.filter(g => g.rol !== 'helpt'), ev.identifier + ':gaan', false);
  const helpers = alle.filter(g => g.rol === 'helpt'); const lh = $('.lijst.helpen', el); lh.hidden = !helpers.length; vulTeams(lh, helpers, ev.identifier + ':helpen');
  return el;
}

const MAX_NAMEN = 2; const uitgeklapt = new Set();
/** Teamlijst: per team één regel "Kids: Bas Streefkerk, Piet" (Bas, 24-09: zo kort mogelijk maar duidelijk). */
function vulTeams(blok, helpers, sleutel) {
  const ul = $('.namen', blok);
  const perTeam = new Map();
  for (const g of helpers) { const k = g.team || t('geen_team'); if (!perTeam.has(k)) perTeam.set(k, []); perTeam.get(k).push(g); }
  const regels = [...perTeam.entries()];
  const alles = uitgeklapt.has(sleutel);
  const toon = alles ? regels : regels.slice(0, MAX_NAMEN);
  for (const [team, leden] of toon) { const li = document.createElement('li'); li.className = 'teamregel'; const n = document.createElement('span'); n.className = 'n'; n.textContent = `${team}: `; li.append(n); leden.forEach((g, i) => { const s = document.createElement('span'); s.textContent = g.naam; if (lid && g.lid_id === lid.id) s.className = 'ikzelf'; li.append(s); if (i < leden.length - 1) li.append(', '); }); ul.append(li); }
  if (regels.length > MAX_NAMEN) {
    const meer = document.createElement('button'); meer.type = 'button'; meer.className = 'meer';
    meer.textContent = alles ? t('minder') : t('nog_n', { n: regels.length - MAX_NAMEN });
    meer.setAttribute('aria-label', alles ? 'Show fewer' : `Show ${regels.length - MAX_NAMEN} more`);
    meer.onclick = () => { alles ? uitgeklapt.delete(sleutel) : uitgeklapt.add(sleutel); render(); };
    ul.after(meer);
  }
}
function vulLijst(blok, gaan, sleutel, metTeam) {
  const ul = $('.namen', blok);
  const alles = uitgeklapt.has(sleutel);
  const toon = alles ? gaan : gaan.slice(0, MAX_NAMEN);
  if (gaan.length) for (const g of toon) { const li = document.createElement('li'); const n = document.createElement('span'); n.className = 'n'; n.textContent = g.naam; const w = document.createElement('span'); w.className = 'w'; w.textContent = metTeam && g.team ? `${g.woonplaats} · ${g.team}` : g.woonplaats; li.append(n, w); if (lid && g.lid_id === lid.id) li.classList.add('ik'); ul.append(li); }
  else { const li = document.createElement('li'); li.className = 'leeg'; li.textContent = t('nog_niemand'); ul.append(li); }
  if (gaan.length > MAX_NAMEN) {
    const meer = document.createElement('button'); meer.type = 'button'; meer.className = 'meer';
    meer.textContent = alles ? t('minder') : t('nog_n', { n: gaan.length - MAX_NAMEN });
    meer.setAttribute('aria-label', alles ? 'Show fewer' : `Show ${gaan.length - MAX_NAMEN} more`);
    meer.onclick = () => { alles ? uitgeklapt.delete(sleutel) : uitgeklapt.add(sleutel); render(); };
    ul.after(meer);
  }
}

const open = new Set();
function rij(ev, datum, metDatum = false) {
  const r = $('#tpl-rij').content.cloneNode(true).querySelector('.rij');
  r.dataset.testid = `event-${ev.identifier}`;
  if (metDatum) r.classList.add('met-datum');
  const gaan = wie.filter(g => g.event === ev.identifier);
  const ikGa = !!lid && gaan.some(g => g.lid_id === lid.id);
  r.classList.toggle('gaat', ikGa);
  const tijd = formatteerTijd(ev.start, ev.eind);
  $('.rij-wanneer', r).textContent = metDatum ? labelPeriode(ev.start, ev.eind) : `${krtDag(datum, taal)} ${tijd === t('hele_dag') ? '' : tijd.split('–')[0]}`.trim();
  $('.rij-naam', r).textContent = ev.naam;
  const meta = $('.rij-meta', r); meta.innerHTML = '';
  if (gaan.length) { const tel = document.createElement('span'); tel.className = 'tel'; const anderen = gaan.length - (ikGa ? 1 : 0); tel.textContent = ikGa ? (anderen ? t('jij_plus', { n: anderen }) : t('jij_gaat')) : (gaan.length === 1 ? t('gaat_1') : t('gaan_n', { n: gaan.length })); meta.append(tel); }
  if (ev.aanmelden.nodig) { const s = document.createElement('span'); s.className = 'stil'; s.textContent = t('aanmelden_badge'); meta.append(s); }
  const meer = $('.rij-meer', r), kop = $('.rij-open', r);
  const isOpen = open.has(ev.identifier); meer.hidden = !isOpen; kop.setAttribute('aria-expanded', String(isOpen));
  kop.onclick = () => { const nuOpen = meer.hidden; meer.hidden = !nuOpen; kop.setAttribute('aria-expanded', String(nuOpen)); nuOpen ? open.add(ev.identifier) : open.delete(ev.identifier); };
  const vink = $('.vink', r); vink.setAttribute('aria-pressed', String(ikGa)); vink.setAttribute('aria-label', ikGa ? t('snel_af') : t('snel_aan')); $('span', vink).textContent = ikGa ? '✓' : '✕';
  vink.onclick = (e2) => { e2.stopPropagation(); ikGa ? actie(() => opslag.trekIn(ev), t('fout_intrekken')) : actie(() => opslag.gaatNaar(ev), t('fout_ikga')); };
  const meerdaags = datumDeel(ev.start) !== datumDeel(ev.eind || ev.start);
  $('.wanneer-vol', r).textContent = meerdaags ? `${labelPeriode(ev.start, ev.eind)}${tijd === t('hele_dag') ? '' : ', ' + tijd}` : `${labelDag(datumDeel(ev.start))}, ${tijd}`;
  const loc = [ev.locatie.naam, ev.locatie.adres].filter(Boolean).join(', ');
  $('.locatie', r).textContent = loc || t('locatie_onbekend');
  if (ev.beschrijving) { const b = $('.beschrijving', r); b.textContent = ev.beschrijving; b.hidden = false; }
  const route = routeLink(ev); if (route) { const a = $('.route', r); a.href = route; a.hidden = false; }
  if (ev.aanmelden.nodig) { const a = $('.aanmeldlink', r); a.href = ev.aanmelden.url; a.hidden = false; }
  const ag = $('.agenda', r); ag.href = icsLink(ev); ag.download = `cletos-${ev.identifier}.ics`;
  $('.ikga', r).hidden = ikGa; $('.tochniet', r).hidden = !ikGa;
  const wg = $('.wiegaat', r); wg.innerHTML = '';
  if (gaan.length) { wg.append(taal === 'nl' ? 'Gaat ook: ' : 'Also going: '); gaan.forEach((g, i) => { const s = document.createElement('strong'); s.textContent = `${g.naam} · ${g.woonplaats}`; wg.append(s); if (i < gaan.length - 1) wg.append(', '); }); }
  else wg.textContent = taal === 'nl' ? 'Nog niemand aangemeld.' : 'No one signed up yet.';
  $('.ikga', r).onclick = () => actie(() => opslag.gaatNaar(ev), t('fout_ikga'));
  $('.tochniet', r).onclick = () => actie(() => opslag.trekIn(ev), t('fout_intrekken'));
  return r;
}

async function actie(fn, melding) {
  zetAlert('');
  try { await fn(); await ververs(false); }
  catch (err) { zetAlert(err instanceof OpslagFout ? melding : t('niet_gelukt', { m: err.message })); }
}

// Lokale kopie van "wie ben ik", zodat de agenda ook bij een storing van de opslag getoond wordt.
const onthoudLid = (l) => { try { l ? localStorage.setItem('kring.lid', JSON.stringify(l)) : localStorage.removeItem('kring.lid'); } catch {} };
const onthoudenLid = () => { try { return JSON.parse(localStorage.getItem('kring.lid') || 'null'); } catch { return null; } };

(async function start() {
  if ('serviceWorker' in navigator && cfg?.opslag !== 'mock') { try { await navigator.serviceWorker.register('sw.js'); } catch {} }
  await laadEvenementen();
  let storing = false;
  try { await opslag.init(); lid = await opslag.mij(); onthoudLid(lid); }
  catch (err) { storing = err instanceof OpslagFout; lid = storing ? onthoudenLid() : null; }
  if (lid) { await toonHome(); if (storing) zetStatus(t('status_storing')); }
  else toonAanmelden();
})();
