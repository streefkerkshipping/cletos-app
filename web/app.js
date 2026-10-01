const $ = (s, r = document) => r.querySelector(s);
// Schermen. Leest data/evenementen.json (statisch) en praat via opslag.js met de opslag. Rechten liggen in de database.
import { groepeerPerDag, formatteerTijd as fmtTijd, routeLink, isDienst, labelPeriode as lblPeriode, labelDag as lblDag, kortDag as krtDag, datumDeel, icsLink, leesDieplink, korteDeeltekst } from './logica.js';
import { t, taal, zetTaal, vertaalDom } from './taal.js';
import { leesDieplink as leesDl } from './logica.js';
// Een gedeelde link draagt de taal van het bericht: eerst de taal zetten, dan pas de pagina opbouwen.
{ const dl = leesDl(location.hash); if (dl?.taal && dl.taal !== taal) zetTaal(dl.taal); }
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
let lid = null, evenementen = [], bijgewerkt = '', wie = [], timer = null;

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

// Geen aanmeldscherm (Bas, 01-10): devoties lees je zonder iets in te vullen. Je naam wordt pas gevraagd als je in de
// agenda aangeeft dat je gaat of servet, en daarna op het toestel onthouden.
const GEEN_GROEP = '--'; // de kolom connectgroep bestaat nog (2–60 tekens verplicht); de app vraagt en toont hem niet meer
function vraagNaam() {
  const dlg = $('#naamvraag'), form = $('#naamformulier'), fout = $('#naamfout'), knop = $('button[type=submit]', form);
  const annuleer = $('#naam-annuleer');
  return new Promise((klaar) => {
    fout.hidden = true; let bezig = false;
    form.onsubmit = async (e) => {
      e.preventDefault(); if (bezig) return; fout.hidden = true;
      const naam = $('#naam').value.trim(); // de database telt de naam zonder spaties eromheen
      if (naam.length < 2) { fout.textContent = t('naam_te_kort'); fout.hidden = false; return; }
      bezig = true; knop.disabled = annuleer.disabled = true; // sluiten tijdens het opslaan zou de naam wel en de keuze niet bewaren
      try { lid = await opslag.wordLid(naam, GEEN_GROEP); onthoudLid(lid); toonWie(); dlg.close(); }
      catch (err) { fout.textContent = err instanceof OpslagFout ? t('aanmeld_fout_storing') : t('aanmeld_fout', { m: err.message }); fout.hidden = false; }
      finally { bezig = false; knop.disabled = annuleer.disabled = false; if (!dlg.open) klaar(!!lid); }
    };
    annuleer.onclick = () => dlg.close();
    dlg.oncancel = (e) => { if (bezig) e.preventDefault(); }; // Escape
    dlg.onclose = () => { if (!bezig) klaar(!!lid); }; // sluit het venster toch tijdens het opslaan, dan rondt de opslag het af
    dlg.showModal(); $('#naam').focus();
  });
}

const PAGINAS = { '#/home': 'pagina-home', '#/agenda': 'home' };
function toonPagina() {
  const doel = PAGINAS[location.hash] || 'pagina-home';
  for (const s of document.querySelectorAll('.pagina')) s.hidden = s.id !== doel;
  document.body.dataset.pagina = doel; // de devotiepagina krijgt een eigen, matte leesachtergrond
  for (const l of document.querySelectorAll('#tabs a')) l.setAttribute('aria-current', l.dataset.pagina === doel ? 'page' : 'false');
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', () => { const dl = leesDieplink(location.hash); if (dl?.taal && dl.taal !== taal) return location.reload(); if (dl) { verbruikDieplink(); kiesDevotie(dl.week, dl.dag); } toonPagina(); });

function toonWie() {
  const w = $('#wie'); w.innerHTML = ''; w.hidden = !lid; if (!lid) return;
  w.append(lid.naam);
  const uit = document.createElement('button'); uit.type = 'button'; uit.textContent = t('verwijder_mij');
  uit.onclick = async () => { if (!confirm(t('verwijder_bevestig'))) return; try { await opslag.verwijderMij(); lid = null; onthoudLid(null); location.reload(); } catch { zetAlert(t('fout_verwijderen')); } };
  w.append(uit);
}
async function toonApp() {
  $('#app').hidden = false; $('#tabs').hidden = false; toonPagina(); toonWie();
  $('#bijgewerkt').textContent = bijgewerkt ? t('bijgewerkt', { d: new Date(bijgewerkt).toLocaleString(taal === 'nl' ? 'nl-NL' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }) : '';
  await ververs(true);
  clearInterval(timer); timer = setInterval(() => ververs(false), (cfg.verversSeconden || 5) * 1000);
}

let vorigeStand = '';
async function ververs(eerste) {
  let storing = false;
  try { wie = await opslag.wieGaat(); zetStatus(''); }
  catch (err) { if (!(err instanceof OpslagFout)) throw err; storing = true; if (eerste) wie = []; zetStatus(t('status_storing')); }
  // Alleen opnieuw tekenen als er echt iets veranderd is: anders verspringt de pagina en raakt invoer (teamveld) kwijt.
  const stand = JSON.stringify({ wie, storing, taal, lid: lid?.id });
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
  if (!dagen.length) { zondagDoel.textContent = t('leeg_agenda'); week.hidden = later.hidden = belangrijk.hidden = true; renderDevotion(); return; }

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
  renderDevotion();
}

const WEEKDAGEN_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAGEN_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
// Tweetalige devotions (Bas, 28-09): in het Nederlands het veld dat op _nl eindigt, als de week een goedgekeurde vertaling heeft;
// anders het Engels. Het citaat heeft geen _nl: dat is letterlijk wat de spreker zei.
const inTaal = (obj, veld) => (taal === 'nl' && obj?.[veld + '_nl']) || obj?.[veld] || '';
const yt = (sec) => devoties ? `https://www.youtube.com/watch?v=${devoties.video_id}&t=${sec}s` : '#';
const stonesVorm = () => devoties?.vorm === 'stones';
// Het beeld van de preek van die week (Bas, 01-10): de YouTube-afbeelding, met een tik naar de video op de juiste seconde.
const VIDEO_ID = /^[\w-]{6,20}$/;
function zetBeeld(el, sec, label) {
  const ok = VIDEO_ID.test(devoties?.video_id || ''); el.hidden = !ok; if (!ok) return;
  el.href = sec ? yt(sec) : `https://www.youtube.com/watch?v=${devoties.video_id}`; el.setAttribute('aria-label', label);
  const img = $('img', el), src = `https://i.ytimg.com/vi/${devoties.video_id}/hqdefault.jpg`;
  img.onerror = () => { el.hidden = true; }; if (img.getAttribute('src') !== src) img.src = src;
}
// Delen (Bas, 01-10): een kort bericht waarin staat waar het over gaat, met een link naar de devotie in de app.
const appBasis = () => location.origin + location.pathname;
const deelTekst = (soort) => korteDeeltekst(devoties, soort === 'devotion' ? devDag : 0, taal, appBasis(), t('lees_hele'));
async function kopieer(tekst, statusEl, melding) {
  try { await navigator.clipboard.writeText(tekst); statusEl.textContent = melding; } catch { statusEl.textContent = tekst.length > 90 ? tekst.slice(0, 90) + '…' : tekst; }
}
// Drie knoppen onder elke devotie (Bas, 01-10): WhatsApp, algemeen delen (het deelmenu van de telefoon) en de link kopiëren.
for (const blok of document.querySelectorAll('.devotion-acties')) {
  const soort = blok.dataset.soort, status = $('.deel-status', blok);
  $('.wa-knop', blok).onclick = () => { status.textContent = ''; window.open('https://wa.me/?text=' + encodeURIComponent(deelTekst(soort)), '_blank', 'noopener'); };
  $('.knop:not(.kopieer-knop)', blok).onclick = async () => {
    const tekst = deelTekst(soort); status.textContent = '';
    if (!navigator.share) return kopieer(tekst, status, t('gekopieerd'));
    try { await navigator.share({ title: inTaal(devoties, 'titel'), text: tekst }); } catch (err) { if (err?.name !== 'AbortError') await kopieer(tekst, status, t('gekopieerd')); }
  };
  // Kopiëren neemt hetzelfde bericht mee als delen, met de link eronder (Bas, 01-10: alleen een link zegt te weinig).
  $('.kopieer-knop', blok).onclick = () => kopieer(deelTekst(soort), status, t('gekopieerd'));
}
const tijdLink = (sec, tekst) => { const a = document.createElement('a'); a.href = yt(sec); a.target = '_blank'; a.rel = 'noopener'; a.textContent = tekst; a.className = 'tijdlink'; return a; };
// Zondag in de Stones-vorm: het ene punt, de preek in zes delen (kernzin + korte uitleg), één zin om mee te nemen, de uitnodiging, bijbelteksten, slotgebed.
function renderSamenvatting(weekLabel) {
  const s = devoties.samenvatting, sv = $('#samenvatting'); sv.hidden = false;
  $('#sv-week').textContent = weekLabel; $('#sv-titel').textContent = `${datumLang(devoties.week)}: ${inTaal(devoties, 'titel')}`;
  zetBeeld($('#kop-beeld'), 0, t('kijk_preek'));
  $('#sv-punt').textContent = inTaal(s.kop, 'tekst');
  const c = $('#sv-citaat'); c.innerHTML = ''; c.append(`“${s.kop.citaat}” `, tijdLink(s.kop.tijd_sec, s.kop.tijd));
  const ol = $('#sv-delen'); ol.innerHTML = '';
  for (const x of s.delen) { const li = document.createElement('li'); const k = document.createElement('strong'); k.textContent = inTaal(x, 'titel'); const q = document.createElement('span'); q.className = 'sv-citaat'; q.textContent = ` — “${x.citaat}” `; const u = document.createElement('span'); u.className = 'sv-uitleg'; u.textContent = inTaal(x, 'uitleg'); li.append(k, q, tijdLink(x.tijd_sec, x.tijd), u); ol.append(li); }
  const l = $('#sv-luister'); l.innerHTML = ''; l.append(`“${s.luister.citaat}” `, tijdLink(s.luister.tijd_sec, s.luister.tijd));
  $('#sv-uitnodiging').textContent = inTaal(s.uitnodiging, 'tekst');
  const uc = $('#sv-uitnodiging-citaat'); uc.innerHTML = ''; uc.append(`“${s.uitnodiging.citaat}” `, tijdLink(s.uitnodiging.tijd_sec, s.uitnodiging.tijd));
  const ul = $('#sv-bijbel'); ul.innerHTML = '';
  for (const b of s.bijbelteksten) { const li = document.createElement('li'); const r = document.createElement('strong'); r.textContent = inTaal(b, 'ref'); li.append(r, ` — ${inTaal(b, 'waar')}`); ul.append(li); }
  $('#sv-gebed').textContent = `🙏 ${inTaal(s.gebed, 'tekst')}`;
  $('#sv-deelstatus').textContent = '';
}
const GEBED = 7;
function renderGebeden(weekLabel) {
  $('#gebeden').hidden = false; $('#gb-week').textContent = weekLabel;
  zetBeeld($('#kop-beeld'), devoties.gebeden[0].tijd_sec, t('kijk_deel'));
  const lijst = $('#gb-lijst'); lijst.innerHTML = '';
  for (const g of devoties.gebeden) {
    const kop = document.createElement('p'); kop.className = 'devotion-kop'; kop.append(inTaal(g, 'titel'), ' · ', tijdLink(g.tijd_sec, g.tijd));
    const p = document.createElement('p'); p.className = 'devotion-gebed gebed-vol'; p.textContent = `🙏 ${inTaal(g, 'tekst')}`;
    lijst.append(kop, p);
  }
}
$('#dev-week').onchange = async (e2) => { devWeek = e2.target.value; devoties = await laadWeek(devWeek); devDag = 0; renderDevotion(); };

function renderDevotion() {
  const dev = $('#devotion'), tb = $('#terugblik'), leeg = $('#devotion-leeg'), nav = $('#devotion-nav');
  dev.hidden = tb.hidden = $('#samenvatting').hidden = $('#gebeden').hidden = true; leeg.hidden = !!devoties; nav.hidden = !devoties;
  if (!devoties) return;
  // De gebeden uit de dienst (Bas, 01-10): een eigen knop naast zaterdag, en onder elke devotie een knop ernaartoe.
  const heeftGebeden = !!devoties.gebeden?.length; if (devDag === GEBED && !heeftGebeden) devDag = 0;
  for (const k of document.querySelectorAll('.naar-gebed')) { k.hidden = !heeftGebeden; k.onclick = () => { devDag = GEBED; renderDevotion(); window.scrollTo(0, 0); }; }
  // Weekkiezer: "20 September: titel", nieuwste eerst.
  const sel = $('#dev-week'); sel.innerHTML = '';
  for (const w of devIndex) { const o = document.createElement('option'); o.value = w.week; o.textContent = `${datumLang(w.week)}: ${inTaal(w, 'titel')}`; o.selected = w.week === devWeek; sel.append(o); }
  // Dag: standaard vandaag (in de nieuwste week), anders de samenvatting.
  const nieuwste = devWeek === devIndex[0]?.week;
  if (devDag === null) devDag = nieuwste ? weekdagNu() : 0;
  const chips = $('#dev-dagen'); chips.innerHTML = '';
  for (const dag of heeftGebeden ? [0, 1, 2, 3, 4, 5, 6, GEBED] : [0, 1, 2, 3, 4, 5, 6]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip dagchip'; b.setAttribute('role', 'tab');
    b.textContent = dag === 0 ? t('samenvatting') : dag === GEBED ? t('gebed_tab') : t('dag_kort')[dag]; b.setAttribute('aria-selected', String(dag === devDag));
    if (nieuwste && dag !== GEBED && dag > weekdagNu() && weekdagNu() !== 0) b.disabled = true; // nog niet aan de beurt
    b.onclick = () => { devDag = dag; renderDevotion(); }; chips.append(b);
  }
  // De gekozen knop schuift in beeld (de rij is op een telefoon breder dan het scherm), zonder de pagina te verschuiven.
  const gekozen = chips.querySelector('[aria-selected="true"]'); if (gekozen) chips.scrollLeft = Math.max(0, gekozen.offsetLeft - chips.offsetLeft - (chips.clientWidth - gekozen.offsetWidth) / 2);
  const weekLabel = t('van_zondag', { d: datumLang(devoties.week) });
  if (devDag === GEBED) { renderGebeden(weekLabel); return; }
  if (devDag === 0 && stonesVorm() && devoties.samenvatting) { renderSamenvatting(weekLabel); return; }
  if (devDag === 0) {
    tb.hidden = false; $('#tb-week').textContent = weekLabel; $('#tb-titel').textContent = `${datumLang(devoties.week)}: ${inTaal(devoties, 'titel')}`;
    zetBeeld($('#kop-beeld'), 0, t('kijk_preek'));
    const ol = $('#tb-lijst'); ol.innerHTML = '';
    for (const d of devoties.terugblik.dagen) { const li = document.createElement('li'); const q = document.createElement('strong'); q.textContent = d.citaat; const a = document.createElement('a'); a.href = yt(d.tijd_sec); a.target = '_blank'; a.rel = 'noopener'; a.textContent = d.tijd; a.className = 'tijdlink'; const z = document.createElement('span'); z.textContent = inTaal(d, 'zin'); li.append(q, ' ', a, document.createElement('br'), z); ol.append(li); }
    const slot = devoties.terugblik.slot; $('#tb-slot').textContent = inTaal(slot, 'tekst'); $('#tb-slotkop').hidden = !slot?.tekst;
    const c = $('#tb-citaat'); c.innerHTML = ''; if (slot?.citaat) { c.append(`“${slot.citaat}” `); const a = document.createElement('a'); a.href = yt(devoties.terugblik.dagen.find(d => d.tijd === slot.tijd)?.tijd_sec ?? 0); a.target = '_blank'; a.rel = 'noopener'; a.textContent = slot.tijd; a.className = 'tijdlink'; c.append(a); } c.hidden = !slot?.citaat;
    return;
  }
  const d = devoties.devotions.find(x => x.dag === devDag); if (!d) { leeg.hidden = false; return; }
  dev.hidden = false;
  $('#dev-dag').textContent = t('dag_van', { dag: (taal === 'nl' ? WEEKDAGEN_NL : WEEKDAGEN_EN)[devDag], n: d.dag }); $('#dev-week-label').textContent = weekLabel;
  $('#dev-titel').textContent = inTaal(d, 'titel'); $('#dev-bijbel').textContent = inTaal(d, 'bijbeltekst');
  // Stones-vorm: tijdvak van dit deel, bijbelvers voluit, de vraag, en 🙏 voor het gebed. Oude weken hebben die velden niet.
  const stones = stonesVorm() && !!d.tijdvak;
  zetBeeld($('#kop-beeld'), stones ? d.tijdvak_sec : d.tijd_sec, t('kijk_deel'));
  const deelEl = $('#dev-deel'); deelEl.hidden = !stones; if (stones) { const a = $('a', deelEl); a.href = yt(d.tijdvak_sec); a.textContent = d.tijdvak; }
  const vers = $('#dev-vers'); vers.hidden = !d.bijbelvers; vers.textContent = d.bijbelvers ? `“${inTaal(d, 'bijbelvers')}”` : '';
  $('#dev-citaat').textContent = `“${d.citaat}”`; const l = $('#dev-link'); l.href = yt(d.tijd_sec); l.textContent = d.tijd; l.className = 'tijdlink';
  const z = $('#dev-zinnen'); z.innerHTML = ''; for (const s of d.zinnen) { const p = document.createElement('p'); p.textContent = inTaal(s, 'tekst'); z.append(p); }
  const vraag = $('#dev-vraag'); vraag.hidden = !d.vraag; vraag.textContent = d.vraag ? inTaal(d.vraag, 'tekst') : '';
  $('#dev-gebed').textContent = (stones ? '🙏 ' : '') + inTaal(d.gebed, 'tekst');
  $('#dev-deelstatus').textContent = '';
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
  const dl = leesDieplink(location.hash);
  if (dl) { verbruikDieplink(); if (await kiesDevotie(dl.week, dl.dag)) return; } // onbekende week of ontbrekend bestand: gewoon vandaag
  devWeek = idx[0].week; devoties = await laadWeek(devWeek); devDag = null; renderDevotion();
}).catch(() => {});
// Deep link (#/d/<week>/<dag>): opent precies die devotie, ook een dag die deze week nog niet aan de beurt is.
async function kiesDevotie(week, dag) {
  if (!devIndex.some(w => w.week === week)) return false;
  const d = await laadWeek(week).catch(() => null); if (!d) return false;
  devWeek = week; devoties = d; devDag = dag; renderDevotion(); return true;
}
// De link is eenmalig: daarna staat de app weer op #/home, zodat herladen vandaag toont en dezelfde link opnieuw werkt.
function verbruikDieplink() { try { history.replaceState(null, '', location.pathname + location.search + '#/home'); } catch {} }
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
  const vink = $('.tegel-vink', el); vink.setAttribute('aria-checked', String(!!mijn)); vink.setAttribute('aria-label', mijn ? t('snel_af') : t('snel_aan'));
  vink.onclick = () => { teamOpen.delete(ev.identifier); mijn ? actie(() => opslag.trekIn(ev), t('fout_intrekken')) : actie(() => opslag.gaatNaar(ev, 'gaat', null), t('fout_ikga')); };
  const teamKnop = $('.tegel-team', el); teamKnop.setAttribute('aria-checked', String(!!ikHelp)); teamKnop.setAttribute('aria-label', ikHelp ? t('team_uit') : t('team_aan'));
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
  if (gaan.length) for (const g of toon) { const li = document.createElement('li'); const n = document.createElement('span'); n.className = 'n'; n.textContent = g.naam; li.append(n); if (metTeam && g.team) { const w = document.createElement('span'); w.className = 'w'; w.textContent = g.team; li.append(w); } if (lid && g.lid_id === lid.id) li.classList.add('ik'); ul.append(li); }
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
  const vink = $('.vink', r); vink.setAttribute('aria-checked', String(ikGa)); vink.setAttribute('aria-label', ikGa ? t('snel_af') : t('snel_aan'));
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
  if (gaan.length) { wg.append(taal === 'nl' ? 'Gaat ook: ' : 'Also going: '); gaan.forEach((g, i) => { const s = document.createElement('strong'); s.textContent = g.naam; wg.append(s); if (i < gaan.length - 1) wg.append(', '); }); }
  else wg.textContent = taal === 'nl' ? 'Nog niemand aangemeld.' : 'No one signed up yet.';
  $('.ikga', r).onclick = () => actie(() => opslag.gaatNaar(ev), t('fout_ikga'));
  $('.tochniet', r).onclick = () => actie(() => opslag.trekIn(ev), t('fout_intrekken'));
  return r;
}

async function actie(fn, melding) {
  zetAlert('');
  if (!lid) {
    // Het toestel kan al een naam hebben die de app nog niet kent (gestart tijdens een storing, of ingevuld in een ander tabblad).
    try { lid = await opslag.mij(); } catch {}
    if (lid) { onthoudLid(lid); toonWie(); } else if (!(await vraagNaam())) return;
  }
  try { await fn(); await ververs(false); }
  catch (err) { zetAlert(err instanceof OpslagFout ? melding : t('niet_gelukt', { m: err.message })); }
}

// Lokale kopie van "wie ben ik", zodat de agenda ook bij een storing van de opslag getoond wordt.
const onthoudLid = (l) => { try { l ? localStorage.setItem('kring.lid', JSON.stringify(l)) : localStorage.removeItem('kring.lid'); } catch {} };
const onthoudenLid = () => { try { return JSON.parse(localStorage.getItem('kring.lid') || 'null'); } catch { return null; } };

(async function start() {
  if ('serviceWorker' in navigator && cfg?.opslag !== 'mock') { try { await navigator.serviceWorker.register('sw.js'); } catch {} }
  // Eerst de pagina, dan de opslag: de devotie en de agenda wachten nooit op de database (Bas, 01-10: lezen zonder iets in te vullen).
  $('#app').hidden = false; $('#tabs').hidden = false; toonPagina();
  await laadEvenementen(); render();
  let storing = false;
  try { await opslag.init(); lid = await opslag.mij(); onthoudLid(lid); }
  catch (err) { storing = err instanceof OpslagFout; lid = storing ? onthoudenLid() : null; }
  await toonApp(); if (storing) zetStatus(t('status_storing'));
})();
