# Reviewopdracht — Cletos fase 1 ("wat, wanneer, waar")

Voor een onafhankelijke reviewer (Codex of een verse Claude-sessie). Lees eerst `BOUWSPEC.md` (§1–§4, §7, §8) en `../DECISIONS.md` van 2026-09-24. De bouwer (Claude, sessie 24-09) geeft nooit zijn eigen PASS; jij wel of niet.

## Wat je beoordeelt

1. **Werkt het echt?** Draai zelf, niet op het woord van de bouwer:
   ```bash
   cd projects/werf/preken-platform/app
   npm run test:unit && npm run test:py && npm run test:rls && npm run test:e2e
   ```
   `test:rls` en de app zelf praten met de echte Supabase (sleutels in `.env` en `web/config.js`, git-ignored). De testleden ruimen zichzelf op.
2. **Rechten liggen in de database, niet in de schermen.** Lees `supabase/policies.sql` en probeer het te breken met directe REST-calls: schrijven zonder lid, schrijven namens een ander, andermans rij wissen, jezelf beheerder maken.
3. **Bronregels.** Evenementen komen uit de openbare ChurchSuite-feed via `../bin/haal_evenementen.py` (geen AI). Controleer dat er niets wordt verzonnen of stil "verbeterd".
4. **Privacy.** Open app (besluit Bas): naam + woonplaats + "ik ga" zichtbaar voor iedereen met de link. Controleer dat er niet méér lekt (geen auth_uid, geen e-mail, geen analytics) en dat "Verwijder mij" alles van die persoon wist.
5. **Leesbaarheid voor een engineer.** `web/app.js`, `web/opslag.js`, `web/logica.js`: is het te volgen, zijn de lagen gescheiden, geen sleutel in de code?

## Classificeer

P0 = kernketen werkt niet, data kan beschadigen, rechten lek, misleidend resultaat · P1 = acceptatie-eis uit BOUWSPEC §7 faalt, lokaal repareerbaar · P2 = verbetering. Eindoordeel: PASS / PARTIAL / BLOCKED / FAIL, met per bevinding bestand + regel + hoe te reproduceren. Schrijf je oordeel in `../PROJECT_LOG.md` onder een eigen kop "Review fase 1".

## Scope-uitbreiding op 24-09 (avond), ook te reviewen

- Home: zondagblok met drie dienst-tegels, "Deze week", "Belangrijk" (vlag in `data/agenda-regels.json` / `data/eigen-evenementen.json`), "Later" ingeklapt.
- Per dienst "Ik ga" of "Ik help" met team (`gaat_naar.rol`, `gaat_naar.team`, migratie `20260924200000`), teamchips uit `data/teams.json` (voorlopige lijst).
- Namenlijsten gemaximeerd op 2 met "nog N"; regels tonen een teller.
- Tests: E2b, E3, R4 erbij. `tests/dev-server.mjs` heeft `/mock/seed` voor testdata.

## Bekende beperkingen (door de bouwer gemeld, geen verrassingen)

- Aankondigingen uit het diensttranscript (BOUWSPEC §2 bron B) zijn fase 2, nog niet gebouwd.
- De agenda ververst nog niet automatisch (launchd-job ⬜); nu handmatig `npm run haal-evenementen`.
- Anonieme testgebruikers blijven als lege accounts in `auth.users` staan na tests.
- Nog geen deploy; alleen lokaal getest (390×844, Chromium) en één handmatige run tegen de echte Supabase.
- `supabase/schema.sql` + `policies.sql` en de migratie in `supabase/migrations/` zijn dezelfde inhoud; de migratie is wat er is uitgevoerd.
