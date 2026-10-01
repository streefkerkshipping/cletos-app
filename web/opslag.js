// Opslaglaag: één interface, twee uitvoeringen. 'supabase' voor echt, 'mock' voor tests (tests/dev-server.mjs).
// Interface: init() → mij() → wordLid(naam, connectgroep: sinds 01-10 een vaste vulwaarde) → gaatNaar(ev, rol='gaat'|'helpt', team) → trekIn(ev) → wieGaat() → verwijderMij()
// Elke functie gooit een OpslagFout als de opslag niet bereikbaar is; de schermen vangen dat op.

import { parseLokaal } from './logica.js';

export class OpslagFout extends Error {}

function mock(cfg) {
  const basis = cfg.mockUrl || '/mock';
  let toestel = null;
  try { toestel = localStorage.getItem('kring.toestel'); if (!toestel) { toestel = crypto.randomUUID(); localStorage.setItem('kring.toestel', toestel); } } catch { toestel = crypto.randomUUID(); }
  const call = async (pad, init = {}) => {
    let r;
    try { r = await fetch(basis + pad, { ...init, headers: { 'Content-Type': 'application/json', 'X-Toestel': toestel, ...(init.headers || {}) } }); }
    catch (e) { throw new OpslagFout('opslag onbereikbaar'); }
    if (r.status === 503) throw new OpslagFout('opslag onbereikbaar');
    return r;
  };
  return {
    soort: 'mock',
    async init() {},
    async mij() { const r = await call('/mij'); return r.ok ? r.json() : null; },
    async wordLid(naam, connectgroep) { const r = await call('/leden', { method: 'POST', body: JSON.stringify({ naam, connectgroep }) }); if (!r.ok) throw new Error('aanmelden geweigerd'); return r.json(); },
    async gaatNaar(ev, rol = 'gaat', team = null) {
      const r = await call('/gaat_naar', { method: 'POST', body: JSON.stringify({ event_identifier: ev.identifier, event_start: ev.start, rol, team }) });
      if (r.status === 409) { const p = await call(`/gaat_naar?event=${encodeURIComponent(ev.identifier)}`, { method: 'PATCH', body: JSON.stringify({ rol, team }) }); if (!p.ok) throw new Error('wijzigen geweigerd'); return; }
      if (!r.ok) throw new Error('opslaan geweigerd');
    },
    async trekIn(ev) { const r = await call(`/gaat_naar?event=${encodeURIComponent(ev.identifier)}`, { method: 'DELETE' }); if (!r.ok) throw new Error('intrekken geweigerd'); },
    async wieGaat() { const r = await call('/gaat_naar'); return (await r.json()).map(g => ({ event: g.event_identifier, lid_id: g.lid_id, naam: g.leden.naam, rol: g.rol || 'gaat', team: g.team || null })); },
    async verwijderMij() { await call('/leden', { method: 'DELETE' }); },
  };
}

function supabase(cfg) {
  let sb = null, sessie = null, bezig = null;
  // Eén client, ook als twee aanroepen tegelijk binnenkomen; na een mislukte poging mag het opnieuw.
  const laad = () => sb ? Promise.resolve(sb) : (bezig ??= maak().finally(() => { bezig = null; }));
  const maak = async () => {
    let createClient;
    // Laadt de bibliotheek niet (offline, adblocker, storing bij de CDN), dan is dat voor de schermen een storing van de opslag.
    try { ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm')); }
    catch { throw new OpslagFout('opslag onbereikbaar'); }
    sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    return sb;
  };
  const vang = (r, wat) => {
    if (r.error) {
      const m = String(r.error.message || '');
      if (/fetch|network|Failed|load/i.test(m)) throw new OpslagFout('opslag onbereikbaar');
      throw new Error(`${wat}: ${m}`);
    }
    return r.data;
  };
  const zorgSessie = async () => {
    const c = await laad();
    if (sessie) return sessie;
    const { data } = await c.auth.getSession();
    if (data.session) return (sessie = data.session);
    const r = await c.auth.signInAnonymously();
    if (r.error) throw new OpslagFout('anonieme login mislukt: ' + r.error.message);
    return (sessie = r.data.session);
  };
  return {
    soort: 'supabase',
    async init() { await laad(); },
    async mij() {
      const c = await laad(); const { data } = await c.auth.getSession(); if (!data.session) return null; sessie = data.session;
      return vang(await c.from('leden').select('id,naam,connectgroep,rol').eq('auth_uid', data.session.user.id).maybeSingle(), 'lid ophalen');
    },
    async wordLid(naam, connectgroep) {
      await zorgSessie(); const c = await laad();
      return vang(await c.from('leden').insert({ naam, connectgroep }).select('id,naam,connectgroep,rol').single(), 'aanmelden');
    },
    async gaatNaar(ev, rol = 'gaat', team = null) {
      const c = await laad(); const mij = await this.mij(); if (!mij) throw new Error('niet aangemeld');
      const r = await c.from('gaat_naar').upsert({ lid_id: mij.id, event_identifier: ev.identifier, event_start: parseLokaal(ev.start).toISOString(), rol, team }, { onConflict: 'lid_id,event_identifier' });
      vang(r, 'opslaan');
    },
    async trekIn(ev) {
      const c = await laad(); const mij = await this.mij(); if (!mij) return;
      vang(await c.from('gaat_naar').delete().eq('lid_id', mij.id).eq('event_identifier', ev.identifier), 'intrekken');
    },
    async wieGaat() {
      const c = await laad();
      const rijen = vang(await c.from('gaat_naar').select('event_identifier,lid_id,rol,team,leden(naam)'), 'lijst ophalen');
      return rijen.map(g => ({ event: g.event_identifier, lid_id: g.lid_id, naam: g.leden?.naam || '', rol: g.rol || 'gaat', team: g.team || null }));
    },
    async verwijderMij() {
      const c = await laad(); const mij = await this.mij(); if (!mij) return;
      vang(await c.from('leden').delete().eq('id', mij.id), 'verwijderen');
      await c.auth.signOut(); sessie = null;
    },
  };
}

export function maakOpslag(cfg) {
  if (!cfg) throw new Error('config.js ontbreekt (kopieer config.example.js)');
  return cfg.opslag === 'mock' ? mock(cfg) : supabase(cfg);
}
