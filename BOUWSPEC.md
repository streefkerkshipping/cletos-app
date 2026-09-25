# BOUWSPEC — Connect App v1 (naam: Cletos, ✅ Bas 24-09)

> Status: **concept fase 0**, geschreven door Claude op 2026-09-24 uit `../PLAN-connect-app-v1.md` (goedgekeurd door Bas), het prototype en het onderzoek van vandaag. ⬜ = voorstel van de AI, ✅ = besluit van Bas. Er wordt niet gebouwd voordat Bas de ⬜'s heeft bevestigd of gecorrigeerd en de bouwbrief van fase 1 heeft gezien.

## 1. Gebruikers en kernhandelingen

**Wie:** iedereen van Hillsong Amsterdam die de link heeft. ✅ Bas, 24-09: *"het is open. dus je kan je aanmelden met je voornaam. dat's it."* Je meldt je aan met je naam en woonplaats (Bas' voorbeeld: "Bas Streefkerk, Apeldoorn") en kiest per dienst of je gaat; per dienst staat wie er gaat, met woonplaats. Geen groepscode, geen accounts, geen wachtwoord. De woonplaats is meteen het zaadje voor meerijden later. Bas' connectgroep (geleid door Steven en Victoria, Bas is lid) is de eerste groep gebruikers, maar de app is niet aan die groep gebonden. ✅ Bas maakt fase 1 sowieso af, onafhankelijk van een ja van de leiders.

**Vijf kernhandelingen, in volgorde van belang:**

| # | Handeling | Waar | Bas' woorden |
|---|---|---|---|
| 1 | Zien wat er binnenkort is, wanneer, waar, en hoe je er komt | Home "Binnenkort voor jou" | "dat ik niet kan zien wat wanneer is.. en hoe ik daar kan komen" |
| 2 | Zeggen "ik ga" en zien wie er ook gaat | Home, per dienst/evenement | prototype 24-09 |
| 3 | De devotion van vandaag lezen | Home, bovenaan | "de daily devotion uit de zondagpreek" |
| 4 | Gebedspunten delen en afvinken | Gebed | prototype |
| 5 | Een vraag stellen aan een jaar preken, met klik naar de seconde in de video | Ask the service | DECISIONS 23-09 |

**Meetbaar gebruikssucces (⬜):** na 4 weken gebruik in de eigen groep (klein: leiders + een paar leden): meer dan de helft van de leden opent de app wekelijks; ≥1 "ik ga" per week door iemand anders dan Bas; ≥1 gebedspunt per week door een ander; Bas zelf zoekt niets meer op in ChurchSuite voor "wat, wanneer, waar".

## 2. Bronnen van evenementen (onderzocht 2026-09-24)

**Bron A — ChurchSuite openbare feed.** `https://hillsongnl.churchsuite.com/embed/calendar/json` is zonder login bereikbaar en geeft (gemeten 24-09) 70 evenementen van 2026-09-24 t/m 2026-10-25: diensten (bv. "12:30 Service AMS", Circa, Seineweg 2, 1043 BG Amsterdam, met coördinaten), Connect Group (wo 19:00–21:30, zonder locatie), Sisterhood One Day, Youth Night, enzovoort. Velden: `identifier`, `name`, `datetime_start/_end`, `description`, `category`, `location{name,address,latitude,longitude}`, `signup_options{signup_enabled, tickets.url}`, `site{name,initials}` (AMS/RTM of null), `public_visible`. De aanmeldlink is `https://hillsongnl.churchsuite.com/events/<identifier>`.
Gevolg: geen handmatige `evenementen.json`. Een script (`bin/haal-evenementen.py`, geen AI) haalt de feed op, filtert op site AMS of site null, houdt 5 weken vooruit, en schrijft `app/data/evenementen.json` met `opgehaald_op`. ⬜ Draait dagelijks via launchd naast de zondagautomaat; de app toont "bijgewerkt op …".

**Bron B — aankondigingen in de dienst (Bas, 24-09: "je hebt toch ook de events die omgeroepen worden in de dienst").** `projects/hillsong/<datum>/transcript.md` is de hele livestream; de aankondigingen staan erin met tijdstempel (20-09: Sisterhood One Day 34:34–37:54, Youth Night 37:54, Hillsong Conference 39:45, 10 jaar Rotterdam 50:30). Een stap in de zondagketen (`bin/haal-aankondigingen.py`: Sonnet haalt {naam, datum zoals genoemd, tijdstempel, letterlijk citaat} eruit; een scriptcontrole eist dat het citaat letterlijk in het transcript staat, zoals `citaatcheck.py`) schrijft `app/data/aankondigingen/<datum>.json`. De app koppelt B aan A op naam+datum. Gekoppeld: de kaart krijgt "in de dienst gezegd: …" met een klik naar die seconde. Niet gekoppeld: de kaart toont alleen wat de dienst zei, zonder adres, met het label "genoemd in de dienst van <datum>". Regel B geldt: niets toevoegen.

**Hoe je er komt.** Per kaart een knop "Route" (Apple Maps / Google Maps met adres of coördinaten). Voor Circa daarnaast de shuttle-informatie van de kerk (P+R Sloterdijk, Piarcoplein 1, één uur voor en na elke dienst, € 1,50) als vaste tekst in de groepsinstellingen ⬜. Meerijden komt later (✅ Bas 24-09).

## 3. Toegang, identiteit en eigenaarschap

- ✅ Open aanmelden (Bas, 24-09): naam + woonplaats invullen, klaar. Technisch: Supabase anonieme login per toestel + één rij in `leden`. Geen code, geen e-mail.
- ✅ Namen direct zichtbaar (Bas, 24-09: *"gelijk"*): wie de link opent ziet de diensten, evenementen én wie er gaat, zonder eerst aan te melden. De link wordt eerst alleen in Bas' connectgroep gedeeld. ✅ Wordt het aantrekkelijk, dan komt er een inlog met telefoonnummer (Supabase phone OTP: sms-code, bestaande functie, geen eigen bouwwerk). Dat is dus v2, niet nu.
- Namen worden getoond zoals ingevuld (Bas' voorbeeld: "Bas Streefkerk, Apeldoorn"); afkorten is niet nodig ⬜.
- Elke gedeelde rij heeft `auteur_lid_id`. RLS: lezen mag iedereen met de anon-sleutel (de link is de drempel); schrijven alleen met een lid-rij, wijzigen en verwijderen alleen je eigen rijen. Afvinken van een gebedspunt mag ieder lid.
- Persoonlijke notities bij een devotion: alleen op het toestel (localStorage), label "alleen op dit toestel" ⬜.
- Verwijderen kan altijd zelf: eigen "ik ga", eigen gebedspunt, eigen aanmelding (wist alle eigen rijen).
- Nieuw toestel = nieuwe anonieme gebruiker: opnieuw naam invullen. Overzetten komt niet in v1 ⬜.
- AVG-vlag (één keer, daarna volg ik Bas' keuze): naam + woonplaats + dienstbezoek zegt iets over geloof en is een bijzonder persoonsgegeven. Maatregelen ⬜: link niet vindbaar (geen index, geen publieke demo met echte namen), één zin bij het aanmelden wat er zichtbaar is voor anderen, altijd zelf te verwijderen, geen export, geen analytics. ⬜ Toestemming van de kerk vóór iets publiek staat (charter, ongewijzigd).
- Rollen: **beheerder** (Bas; techniek, mag rijen verwijderen bij misbruik) en **lid**. Een aparte leider-rol is in v1 niet nodig ⬜.

## 4. Datamodel (Supabase, Postgres)

```
leden          id, auth_uid (unique), naam, woonplaats, rol beheerder|lid, gemaakt_op
gaat_naar      id, lid_id, event_identifier, event_start, gemaakt_op          unique(lid_id, event_identifier)
gebedspunten   id, auteur_lid_id, tekst, versie int, gemaakt_op, bijgewerkt_op
afgevinkt      gebedspunt_id, lid_id, op                                       pk(gebedspunt_id, lid_id)
```
RLS-functie `is_lid()`: bestaat er een lid met `auth_uid = auth.uid()`. Policies per tabel: select voor iedereen met de anon-sleutel (✅ Bas: namen direct zichtbaar); insert als `is_lid()` en `lid_id = eigen lid`; update/delete als eigenaar. Bij de latere telefoon-inlog wordt select beperkt tot ingelogde leden; dat is één policy-regel. Geen groepen-tabel in v1; komt die later, dan krijgt elke tabel een `groep_id` erbij. `versie` beschermt tegen stil verlies: een update stuurt de gelezen versie mee; klopt die niet, dan een botsingsmelding.

Data in de repo (`app/data/`, gebouwd door scripts, alleen lezen voor de app): `evenementen.json`, `aankondigingen/<datum>.json`, `devoties/<datum>.json` (6 delen ma–za + zondag-terugblik, ✅ Bas 24-09, zie fase 2), `preken.json` (52, met thema's uit de kaarten), `samenvattingen/<datum>.md`. Bouwer: `bin/publiceer-pakket.py`, dat een kapot pakket weigert (ontbrekende dag, ontbrekend tijdstempel, geen review-PASS) met exit ≠ 0.

## 5. Ask the service — contract

`POST /ask` body `{vraag, taal: "nl"|"en", groep_token}` → `{antwoord, bronnen: [{datum, tijd, tijd_sec, youtube_url, citaat}], weigering: bool, model, kosten_usd}`.
Route zoals `projects/hillsong/CLAUDE.md`: kompas → index → kaart → transcript. Elk citaat wordt door de functie zelf letterlijk in `transcript-segmenten.json` van de genoemde preek opgezocht; niet gevonden → citaat weg, en zonder citaten → `weigering: true` met de vaste zin "dat zit niet in de preken die ik heb" plus wat er wél in de buurt komt. Geen theologisch oordeel, geen persoonsnamen. Sleutel alleen server-side; rate limit per groep (⬜ 30 vragen/dag) en kostenplafond (⬜ $2/dag). Model instelbaar, standaard Opus (Bas' voorkeur). Logboek van app-vragen gescheiden van Bas' privé-vragen (DECISIONS 23-09).

## 6. Scheiding van lagen

schermen (statische PWA, vanilla HTML/CSS/JS, geen bouwstap) → leest `app/data/*.json` en Supabase via de anon-sleutel → rechten liggen in RLS, niet in de schermen → `ask` is een aparte serverfunctie (Supabase Edge Function of Cloudflare Worker ⬜) die de Claude API aanroept. Prototype `../prototype/connectgroep-app.dc.html` is de spec voor vorm en flow; huisstijl zwart/wit/grijs/crème, Montserrat.

## 7. Acceptatietests per fase (uitvoerbaar)

**Fase 1**
- U1 `node --test`: evenementen gesorteerd op start, gegroepeerd per dag, tijdzone Europe/Amsterdam; route-link bevat adres of coördinaten; feed-item zonder site komt wél mee, item met site RTM niet.
- U2 script: `haal-evenementen.py` op de echte feed → JSON met ≥1 dienst op de komende zondag met adres Seineweg 2.
- E1 Playwright 390×844: naam + woonplaats invullen → Home toont "Binnenkort voor jou" met de eerstvolgende zondagdienst.
- E2 Playwright: "ik ga" bij de 10:00-dienst → herladen → staat er nog; tweede browsercontext met andere naam en woonplaats ziet "Bas S. · Apeldoorn" bij die dienst binnen 5 s; intrekken → weg in beide.
- R1 directe REST-call zonder lid-rij: lezen mag, maar insert in `gaat_naar` en `gebedspunten` wordt geweigerd. R2 aangemeld lid probeert andermans `gaat_naar`-rij te verwijderen of te wijzigen: geweigerd. R3 insert met andermans `lid_id`: geweigerd.
- S1 Supabase-URL onbereikbaar (gemockt): Home toont de laatst geladen evenementen + melding; "ik ga" geeft een duidelijke fout, invoer blijft staan.
- Handmatig Bas: installeren als PWA op zijn telefoon; route-knop opent de kaart-app op Circa.

**Fase 2** — P1 `publiceer-pakket.py` op `projects/hillsong/2026-09-20/` → exit 0, 6 devoties én een zondag-terugblik; P2 op een opzettelijk kapot pakket → exit ≠ 0 met reden. E3 klok gemockt op dinsdag → devotion dag 2; op zondag → de terugblik bovenaan, met daaronder de dienst-kaart. E4 preek openen → embed-URL bevat `?start=<sec>` uit de segmenten. T1 elke hoofdtekst in de terugblik komt letterlijk uit `devotions.json` (`citaat`), en het slotstuk komt letterlijk of als vindplaats-gecontroleerde parafrase uit het transcript (scriptcontrole zoals `citaatcheck.py`). Handmatig Bas: 5 tijdstempel-links + één terugblik lezen en "dit niveau" zeggen.

**Zondag-terugblik (✅ Bas, 24-09):** *"op de laatste dag wil ik een korte samenvatting van de devotions: de hoofdtekst met 1 of 2 zinnen eronder, en dan nog een stukje met de oplossing waar de spreker zelf ook naartoe werkt."* Opbouw: zes blokjes (hoofdtekst = `citaat` van die dag, met tijdstempel, plus 1–2 zinnen uit `zinnen[].tekst`), gevolgd door "Waar hij naartoe werkt": de conclusie van de spreker uit de preek. ⬜ Bron voor dat slotstuk: eerst proberen uit de bestaande weeksamenvatting (`*-summary-EN-bron.md`, sectie over het ene punt dat hij wil maken), anders één modelstap (Sonnet) over `transcript-preek.md` met citaatcontrole. De terugblik wordt in `publiceer-pakket.py` gebouwd, dus **zonder** de zondagautomaat of `hillsong-devotions.sh` aan te raken (charter).

**Fase 3** — E5 twee contexts bewerken hetzelfde gebedspunt: tweede krijgt botsingsmelding, geen tekst verloren. R3 lid verwijdert andermans gebedspunt via REST → geweigerd.

**Fase 4** — A1 20 evalvragen (14 groen, 1 dun, 4 zonder uit `vragen-dekking.md` + 1 privé-strikvraag): ≥16 goed, de 4 "zonder" weigeren, de strikvraag weigert. A2 elk teruggegeven citaat komt letterlijk voor in de segmenten (script). A3 sleutel niet in de client-bundle (grep). A4 rate limit slaat aan bij vraag 31.

**Fase 5** — `/code-review`, `/security-review`, onafhankelijke herhaling van E1–E5/R1–R3/A1 op de testdeploy, CI groen.

## 8. Bouwbrief fase 1 — "Wat, wanneer, waar"

```text
Rol/naam:            Bouwer fase 1 (Claude Code-sessie met deze spec); reviewer = Codex of verse Claude-sessie
Gebruikersprobleem:  Bas en zijn groep kunnen niet in één oogopslag zien wat er is, wanneer, waar en hoe ze er komen
Gewenste ervaring:   link openen → naam + woonplaats → Home toont de komende diensten en evenementen met tijd, adres, route, aanmelden, wie gaat
Taak en scope:       haal-evenementen.py · Supabase-schema + RLS + word_lid · PWA-skelet (index, app.js, styles, manifest, sw) ·
                     aanmeldflow naam+woonplaats · Home "Binnenkort voor jou" · "ik ga"/intrekken · offline laatst geladen data
Niet in scope:       devoties, preken, gebed, Ask the service, aankondigingen uit het transcript, Alpha, meerijden, deploy
Toegestane input:    de ChurchSuite-feed, het prototype, deze spec, .env (door Bas aangeleverd), frontend-design-plugin
Verplichte output:   app/web/**, app/supabase/schema.sql + policies.sql, bin/haal-evenementen.py, app/tests/** (U1,U2,E1,E2,R1,R2,S1),
                     package.json, testuitvoer in PROJECT_LOG.md, eerlijk statuslabel
Bevoegdheden:        schrijven in projects/werf/preken-platform/app/ en bin/; npm-devdependencies (Playwright) na melding;
                     verboden: deploy, push, credentials aanmaken, schrijven in raw/ of de zondagautomaat, sleutel in clientcode
Afhankelijkheden:    Supabase-project (Bas), Node 24 (aanwezig), Playwright (installeren), feed bereikbaar
Acceptatietests:     U1 U2 E1 E2 R1 R2 S1 + handmatig Bas (zie §7)
Stopconditie:        alle tests groen op echte feed-data, of 3 sessies, of ~20% dagbudget per sessie, of 2× dezelfde blokkade
Reviewer:            leest read-only, draait de tests zelf, geeft P0/P1/P2 en PASS/PARTIAL/BLOCKED/FAIL
Herstelroute:        0 P0 + ≤2 P1 → korte reparatie; ≥1 P0 of 3–5 P1 → aparte herstelfase; extern besluit nodig → BLOCKED
```

## 9. Tokenraming en volgorde

Zie `../PLAN-connect-app-v1.md`: fase 0 ~10%, fase 1 2–3 sessies à ~20%, fase 2 ~20%, fase 3 ~15%, fase 4 ~20% (+ ~$2–4 API voor de eval), fase 5 ~10%. Nooit twee fasen op één dag; volgende fase pas na PASS van de reviewer.

## 10. Open beslispunten voor Bas (⬜)

1. ✅ Open aanmelden met naam + woonplaats; namen direct zichtbaar; telefoon-inlog later als het aanslaat (Bas, 24-09).
2. ✅ Zes devotions ma–za + zondag-terugblik (hoofdteksten met 1–2 zinnen, slot: waar de spreker naartoe werkt). ⬜ Slotstuk uit de weeksamenvatting, anders modelstap met citaatcontrole.
3. Evenementen dagelijks uit de ChurchSuite-feed, aankondigingen uit het transcript als tweede bron (§2). Filter: site AMS + site-loos.
4. Persoonlijke notities alleen op het toestel in v1.
5. ✅ Naam: **Cletos** (Bas, 24-09). ⬜ Adres: app.cletos.nl of cletos.nl/app (Cloudflare Pages of Netlify); `ask` als Supabase Edge Function.
6. Rate limit 30 vragen/dag per groep, kostenplafond $2/dag.
7. Alpha-modus buiten v1; audio-knop weg.
8. Beantwoord 24-09: Steven en Victoria leiden de connectgroep, Bas is lid; Bas maakt fase 1 sowieso af; de app is open. Namen direct zichtbaar, telefoon-inlog later (✅). 6+terugblik beslist (✅). Rest: welke avond/locatie de connectgroep heeft (feed zegt wo 19:00 zonder locatie) — komt vanzelf uit de feed, geen blokkade.
