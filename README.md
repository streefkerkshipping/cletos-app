# Cletos — Connect App v1

Wat is er binnenkort, wanneer, waar, hoe kom je er, en wie gaat er ook. Statische PWA + Supabase. Spec: `BOUWSPEC.md`, plan: `../PLAN-connect-app-v1.md`.

## Wat er staat (fase 1)

| Map | Wat |
|---|---|
| `web/` | de app: `index.html`, `app.js` (schermen), `logica.js` (pure logica, getest), `opslag.js` (Supabase of testopslag), `sw.js` (offline), manifest |
| `data/evenementen.json` | gebouwd door `../bin/haal_evenementen.py` uit de openbare ChurchSuite-feed (geen AI) |
| `data/agenda-regels.json` | namen die uit de kerkagenda wegblijven (wekelijkse standaarddingen); Bas bewerkt dit |
| `data/eigen-evenementen.json` | eigen items zoals de connectgroep-avond; Bas vult dit in op aanwijzing van de leiders, daarna `npm run haal-evenementen` |
| `supabase/schema.sql`, `policies.sql` | tabellen `leden` en `gaat_naar` + rechten (RLS) |
| `tests/` | `logica.test.mjs` (node), `e2e/home.spec.mjs` (Playwright), `rls/rls.test.mjs` (echte database), `dev-server.mjs` (testopslag), `fixtures/` |
| `../bin/test_haal_evenementen.py` | tests van het feed-script op een vaste feed-kopie |

## Eén keer inrichten (Bas)

1. **Supabase-project.** Op supabase.com → New project (regio EU, Frankfurt). Wacht tot het klaar is.
2. **Sleutels.** Project Settings → *API keys* (oudere projecten: *API*). Je hebt nodig: de **Project URL** en de **anon / publishable** sleutel (mag in de app). De **service_role / secret** sleutel is alleen voor de RLS-test en gaat nooit in `web/`.
3. **Anonieme login aan.** Authentication → Sign In / Providers → *Allow anonymous sign-ins* → aan. Zet bij Attack protection eventueel een captcha uit (niet nodig voor de connectgroep).
4. **Database.** SQL Editor → plak `supabase/schema.sql`, Run. Daarna `supabase/policies.sql`, Run.
5. **Sleutels lokaal.** Kopieer `.env.example` → `.env` en vul in. Kopieer `web/config.example.js` → `web/config.js` en vul URL + anon-sleutel in. Beide staan in `.gitignore`.
6. **Testgereedschap.** In deze map: `npm install` en daarna `npx playwright install chromium`.

## Draaien

```bash
npm run haal-evenementen     # agenda verversen → data/evenementen.json
npm run test:unit            # logica (node --test)
npm run test:py              # feed-script
npm run test:e2e             # browsertests op 390×844 tegen de testopslag (na stap 6)
npm run test:rls             # rechten in de echte database (na stap 1–5)
npm run dev                  # http://127.0.0.1:4173 met testopslag; voor echt: serveer web/ + data/ statisch met config.js
```

Een statische host (Cloudflare Pages, Netlify) serveert `web/` als root met `data/` ernaast; `app.js` haalt `data/evenementen.json` relatief op. De agenda ververst via launchd (⬜ nog in te richten, zie BOUWSPEC §2).

## Status

Zie `../PROJECT_LOG.md` (laatste regel) voor het eerlijke statuslabel per onderdeel. Niets hier is PASS voordat een onafhankelijke reviewer de tests heeft gedraaid.
