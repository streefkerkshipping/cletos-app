// Lokale testserver: serveert app/web en app/data, en speelt de opslag na in het geheugen (twee browsers delen dezelfde
// lijst, precies wat E2 nodig heeft). Alleen voor tests; productie gebruikt Supabase. Start: `npm run dev`.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web'), DATA = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 4173);
const NU = process.env.KRING_NU || '';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

let db = { leden: [], gaat_naar: [], gebedspunten: [] }; let storing = false;
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const lees = (req) => new Promise((ok) => { let b = ''; req.on('data', c => b += c); req.on('end', () => ok(b ? JSON.parse(b) : {})); });
const zonderAuth = ({ auth_uid, ...l }) => l;

async function mock(req, res, url) {
  const toestel = req.headers['x-toestel'] || '';
  const mij = () => db.leden.find(l => l.auth_uid === toestel);
  if (url.pathname === '/mock/status') return json(res, 200, { ok: true, storing });
  if (url.pathname === '/mock/reset') { db = { leden: [], gaat_naar: [], gebedspunten: [] }; storing = false; return json(res, 200, { ok: true }); }
  if (url.pathname === '/mock/storing') { storing = url.searchParams.get('aan') === '1'; return json(res, 200, { storing }); }
  if (storing) return json(res, 503, { fout: 'opslag onbereikbaar (gesimuleerd)' });
  if (url.pathname === '/mock/seed' && req.method === 'POST') {
    const b = await lees(req); const namen = ['Karin', 'Piet', 'Joke', 'Henk', 'Els', 'Wim', 'Truus', 'Kees', 'Ans', 'Jan'];
    for (let i = 0; i < (b.n || 0); i++) { const l = { id: randomUUID(), auth_uid: 'seed-' + i, naam: namen[i % namen.length] + (i >= namen.length ? ' ' + i : ''), woonplaats: 'Apeldoorn', rol: 'lid' }; db.leden.push(l); db.gaat_naar.push({ id: randomUUID(), lid_id: l.id, event_identifier: b.event, event_start: b.start || '', rol: b.rol || 'gaat', team: b.team || null }); }
    return json(res, 200, { ok: true, n: b.n });
  }
  if (url.pathname === '/mock/gebedspunten') {
    if (req.method === 'GET') { const vanaf = url.searchParams.get('vanaf') || '0000-00-00'; const ik = mij(); return json(res, 200, db.gebedspunten.filter(g => g.week_eind >= vanaf).map(g => { const l = db.leden.find(x => x.id === g.auteur_lid_id); const { auteur_lid_id, ...z } = g; return { ...z, naam: g.anoniem ? null : (l?.naam || ''), van_mij: !!ik && ik.id === g.auteur_lid_id }; })); }
    const l = mij(); if (!l) return json(res, 403, { fout: 'niet aangemeld' });
    if (req.method === 'POST') { const b = await lees(req); const g = { id: randomUUID(), auteur_lid_id: l.id, soort: b.soort, tekst: b.tekst, week_eind: b.week_eind, anoniem: !!b.anoniem, gemaakt_op: new Date().toISOString() }; db.gebedspunten.push(g); return json(res, 201, { id: g.id }); }
    if (req.method === 'DELETE') { const id = url.searchParams.get('id'); db.gebedspunten = db.gebedspunten.filter(g => !(g.id === id && g.auteur_lid_id === l.id)); return json(res, 200, {}); }
  }
  if (url.pathname === '/mock/seedgebed' && req.method === 'POST') { const b = await lees(req); const l = { id: randomUUID(), auth_uid: 'seed-g', naam: 'Karin', woonplaats: 'Apeldoorn', rol: 'lid' }; db.leden.push(l); db.gebedspunten.push({ id: randomUUID(), auteur_lid_id: l.id, soort: b.soort || 'prayer', tekst: b.tekst, week_eind: b.week_eind, anoniem: !!b.anoniem, gemaakt_op: new Date().toISOString() }); return json(res, 200, {}); }
  if (url.pathname === '/mock/mij') { const l = mij(); return l ? json(res, 200, zonderAuth(l)) : json(res, 404, {}); }
  if (url.pathname === '/mock/leden') {
    if (req.method === 'GET') return json(res, 200, db.leden.map(zonderAuth));
    if (req.method === 'POST') {
      const b = await lees(req);
      if (!toestel || !b.naam || !b.woonplaats) return json(res, 400, { fout: 'naam/woonplaats' });
      if (mij()) return json(res, 409, { fout: 'al lid' });
      const lid = { id: randomUUID(), auth_uid: toestel, naam: b.naam, woonplaats: b.woonplaats, rol: 'lid' };
      db.leden.push(lid); return json(res, 201, zonderAuth(lid));
    }
    if (req.method === 'DELETE') { const l = mij(); if (!l) return json(res, 403, {}); db.leden = db.leden.filter(x => x !== l); db.gaat_naar = db.gaat_naar.filter(g => g.lid_id !== l.id); return json(res, 200, {}); }
  }
  if (url.pathname === '/mock/gaat_naar') {
    if (req.method === 'GET') return json(res, 200, db.gaat_naar.map(g => { const l = db.leden.find(x => x.id === g.lid_id); return { ...g, leden: { naam: l.naam, woonplaats: l.woonplaats } }; }));
    const l = mij(); if (!l) return json(res, 403, { fout: 'niet aangemeld' });
    if (req.method === 'POST') {
      const b = await lees(req);
      if (db.gaat_naar.some(g => g.lid_id === l.id && g.event_identifier === b.event_identifier)) return json(res, 409, {});
      const g = { id: randomUUID(), lid_id: l.id, event_identifier: b.event_identifier, event_start: b.event_start, rol: b.rol === 'helpt' ? 'helpt' : 'gaat', team: b.team || null };
      db.gaat_naar.push(g); return json(res, 201, g);
    }
    if (req.method === 'PATCH') { const b = await lees(req); const ev = url.searchParams.get('event'); const g = db.gaat_naar.find(x => x.lid_id === l.id && x.event_identifier === ev); if (!g) return json(res, 404, {}); if (b.rol) g.rol = b.rol; if ('team' in b) g.team = b.team || null; return json(res, 200, g); }
    if (req.method === 'DELETE') { const ev = url.searchParams.get('event'); db.gaat_naar = db.gaat_naar.filter(g => !(g.lid_id === l.id && g.event_identifier === ev)); return json(res, 200, {}); }
  }
  return json(res, 404, { fout: 'onbekend' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname.startsWith('/mock/')) return mock(req, res, url);
  if (url.pathname === '/config.js' && process.env.KRING_OPSLAG !== 'supabase') { res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-store' }); return res.end(`window.KRING_CONFIG={opslag:'mock',mockUrl:'/mock',verversSeconden:1,nu:${JSON.stringify(NU)}};`); }
  const p = url.pathname === '/' ? '/index.html' : url.pathname;
  const bestand = p.startsWith('/data/') ? path.join(DATA, p.slice(6)) : path.join(WEB, p);
  if (!bestand.startsWith(WEB) && !bestand.startsWith(DATA)) { res.writeHead(403); return res.end(); }
  if (!existsSync(bestand)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(bestand)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(await readFile(bestand));
}).listen(PORT, '127.0.0.1', () => console.log(`Cletos testserver op http://127.0.0.1:${PORT} (opslag: mock)`));
