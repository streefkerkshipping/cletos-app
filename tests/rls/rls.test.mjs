// R1–R3 — rechten in de echte database, via directe aanroepen (niet via de UI).
// Slaat over met een duidelijke melding als app/.env ontbreekt (dan is dit onderdeel BLOCKED, niet groen).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
if (existsSync(new URL('../../.env', import.meta.url))) {
  for (const r of readFileSync(new URL('../../.env', import.meta.url), 'utf8').split('\n')) {
    const m = r.match(/^\s*([A-Z_]+)=([^#]*)/); if (m) env[m[1]] = m[2].trim();
  }
}
const url = env.SUPABASE_URL, anon = env.SUPABASE_ANON_KEY;
const skip = !url || !anon || url.includes('<project>') ? 'BLOCKED: app/.env zonder SUPABASE_URL/SUPABASE_ANON_KEY' : false;

const rest = (pad, init = {}, token = anon) => fetch(`${url}/rest/v1/${pad}`, { ...init, headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) } });
const nieuwLid = async (naam, woonplaats) => {
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInAnonymously(); if (error) throw error;
  const token = data.session.access_token;
  const r = await rest('leden', { method: 'POST', body: JSON.stringify({ naam, woonplaats }) }, token);
  const tekst = await r.text();
  assert.equal(r.status, 201, tekst);
  return { token, lid: JSON.parse(tekst)[0], sb };
};

test('R1 zonder lid-rij: lezen mag, schrijven niet', { skip }, async () => {
  assert.equal((await rest('leden?select=naam&limit=1')).status, 200);
  const r = await rest('gaat_naar', { method: 'POST', body: JSON.stringify({ lid_id: '00000000-0000-0000-0000-000000000000', event_identifier: 'test', event_start: '2026-09-27T10:00:00+02:00' }) });
  assert.ok([401, 403].includes(r.status), `verwacht 401/403, kreeg ${r.status}`);
});

test('R2/R3 lid kan alleen eigen rijen schrijven en verwijderen', { skip }, async () => {
  const a = await nieuwLid('Test A', 'Apeldoorn'); const b = await nieuwLid('Test B', 'Utrecht');
  try {
  const ins = await rest('gaat_naar', { method: 'POST', body: JSON.stringify({ lid_id: a.lid.id, event_identifier: 'rls-test', event_start: '2026-09-27T10:00:00+02:00' }) }, a.token);
  const insTekst = await ins.text(); assert.equal(ins.status, 201, insTekst); const rij = JSON.parse(insTekst)[0];
  // R3: B schrijft met A's lid_id
  const vals = await rest('gaat_naar', { method: 'POST', body: JSON.stringify({ lid_id: a.lid.id, event_identifier: 'rls-test-2', event_start: '2026-09-27T10:00:00+02:00' }) }, b.token);
  assert.ok([401, 403].includes(vals.status), `R3 verwacht 401/403, kreeg ${vals.status}`);
  // R4: A wisselt eigen rij naar 'helpt' met team; B kan A's rij niet wijzigen
  const upd = await rest(`gaat_naar?id=eq.${rij.id}`, { method: 'PATCH', body: JSON.stringify({ rol: 'helpt', team: 'Welcome' }) }, a.token);
  assert.equal(upd.status, 200, await upd.text());
  const updB = await rest(`gaat_naar?id=eq.${rij.id}`, { method: 'PATCH', body: JSON.stringify({ rol: 'gaat' }) }, b.token);
  assert.deepEqual(await updB.json(), []);
  const na = await (await rest(`gaat_naar?id=eq.${rij.id}&select=rol,team`)).json(); assert.deepEqual(na, [{ rol: 'helpt', team: 'Welcome' }]);
  // R5: precies wat de app doet — upsert op (lid_id, event_identifier) — moet voor de eigenaar werken, voor een ander niet
  const upA = await a.sb.from('gaat_naar').upsert({ lid_id: a.lid.id, event_identifier: 'rls-test', event_start: '2026-09-27T10:00:00+02:00', rol: 'helpt', team: 'Kids' }, { onConflict: 'lid_id,event_identifier' });
  assert.equal(upA.error, null, upA.error?.message);
  const upB = await b.sb.from('gaat_naar').upsert({ lid_id: a.lid.id, event_identifier: 'rls-test', event_start: '2026-09-27T10:00:00+02:00', rol: 'gaat', team: null }, { onConflict: 'lid_id,event_identifier' });
  assert.ok(upB.error, 'R5: B mag A\'s rij niet via upsert overschrijven');
  assert.deepEqual(await (await rest(`gaat_naar?id=eq.${rij.id}&select=rol,team`)).json(), [{ rol: 'helpt', team: 'Kids' }]);
  // R2: B verwijdert A's rij → 0 rijen geraakt
  const del = await rest(`gaat_naar?id=eq.${rij.id}`, { method: 'DELETE' }, b.token);
  assert.deepEqual(await del.json(), []);
  const nog = await (await rest(`gaat_naar?id=eq.${rij.id}&select=id`)).json(); assert.equal(nog.length, 1);
  // R6: gebedspunten — eigen punt toevoegen, ander kan het niet verwijderen, iedereen leest
  // (tabel is bewust niet leesbaar: toevoegen zonder teruggave, id daarna via de weergave)
  const gp = await rest('gebedspunten', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ auteur_lid_id: a.lid.id, soort: 'prayer', tekst: 'rls-test punt', week_eind: '2026-09-27' }) }, a.token);
  assert.equal(gp.status, 201, await gp.text());
  const punt = (await (await rest('gebedspunten_zicht?tekst=eq.rls-test%20punt&select=id,van_mij', {}, a.token)).json())[0]; assert.equal(punt.van_mij, true);
  const gpB = await rest('gebedspunten', { method: 'POST', body: JSON.stringify({ auteur_lid_id: a.lid.id, soort: 'praise', tekst: 'namens A', week_eind: '2026-09-27' }) }, b.token);
  assert.ok([401, 403].includes(gpB.status), 'R6: B mag niet namens A een punt toevoegen');
  const delB = await rest(`gebedspunten?id=eq.${punt.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, b.token);
  assert.ok([204, 401, 403].includes(delB.status), `delete door B: ${delB.status}`);
  assert.equal((await (await rest(`gebedspunten_zicht?id=eq.${punt.id}&select=tekst`)).json()).length, 1, 'R6: punt van A moet er nog staan');
  // R6b (P1 uit de review, 25-09): A verwijdert het eigen punt precies zoals de app het doet → 204 en weg uit de weergave
  const delA = await a.sb.from('gebedspunten').delete().eq('id', punt.id);
  assert.equal(delA.error, null, `R6b: eigen punt verwijderen faalt: ${delA.error?.message}`);
  assert.equal(delA.status, 204, `R6b: verwacht 204, kreeg ${delA.status}`);
  assert.deepEqual(await (await rest(`gebedspunten_zicht?id=eq.${punt.id}&select=tekst`)).json(), [], 'R6b: punt moet weg zijn');
  // R6c: leesrecht op alleen id mag geen achterdeur zijn: filteren op auteur_lid_id blijft geweigerd
  const achterdeur = await rest(`gebedspunten?auteur_lid_id=eq.${a.lid.id}&select=id`, {}, b.token);
  assert.ok([401, 403].includes(achterdeur.status), `R6c: filter op auteur_lid_id moet geweigerd zijn, kreeg ${achterdeur.status}`);
  // R7: anoniem punt — tabel niet direct leesbaar; weergave toont geen naam; van_mij alleen voor A
  const an = await rest('gebedspunten', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ auteur_lid_id: a.lid.id, soort: 'prayer', tekst: 'anoniem rls', week_eind: '2026-09-27', anoniem: true }) }, a.token);
  assert.equal(an.status, 201, await an.text());
  const anId = (await (await rest('gebedspunten_zicht?tekst=eq.anoniem%20rls&select=id', {}, a.token)).json())[0].id;
  const direct = await rest(`gebedspunten?id=eq.${anId}&select=auteur_lid_id`, {}, b.token); assert.ok([401, 403].includes(direct.status), `R7: tabel direct lezen moet geweigerd zijn, kreeg ${direct.status}`);
  const zichtB = await (await rest(`gebedspunten_zicht?id=eq.${anId}&select=naam,van_mij`, {}, b.token)).json(); assert.deepEqual(zichtB, [{ naam: null, van_mij: false }]);
  const zichtA = await (await rest(`gebedspunten_zicht?id=eq.${anId}&select=naam,van_mij`, {}, a.token)).json(); assert.deepEqual(zichtA, [{ naam: null, van_mij: true }]);
  const zichtAnon = await (await rest(`gebedspunten_zicht?id=eq.${anId}&select=naam,van_mij`)).json(); assert.deepEqual(zichtAnon, [{ naam: null, van_mij: false }]);
  } finally {
    // opruimen, ook als een assert faalde (cascade wist ook gebedspunten): A en B verwijderen zichzelf (cascade wist hun gaat_naar-rijen)
    await rest(`leden?id=eq.${a.lid.id}`, { method: 'DELETE' }, a.token); await rest(`leden?id=eq.${b.lid.id}`, { method: 'DELETE' }, b.token);
  }
});
