// Tweetalig: Engels is de hoofdtaal (Bas, 24-09), Nederlands ernaast. Sleutels zijn Nederlands, teksten per taal.
export const TEKST = {
  en: {
    tab_home: 'Home', tab_agenda: 'Agenda', tab_connect: 'Connect group', taal_wissel: 'NL',
    welkom: 'Welcome', aanmeld_uitleg: 'Enter your name and town. That’s it. Others in the group will see your name and town next to the services you’re going to. You can remove yourself at any time.',
    naam: 'Name', woonplaats: 'Town', aanmelden: 'Join', verwijder_mij: 'Remove me', verwijder_bevestig: 'Your name and all your choices will be removed. Continue?',
    binnenkort: 'Coming up for you', deze_week: 'Next 7 days', belangrijk: 'Important', later: 'Later', toon_meer: 'Show {n} more', verberg: 'Hide', leeg_agenda: 'Nothing in the calendar for the coming weeks.',
    service_label: 'Service', team_aan: 'Serve in a team', team_uit: 'Stop serving (just going)', route: 'Directions', locatie_volgt: 'Location to follow', ik_ga: 'I’m going', toch_niet: 'Not going', team: 'Team', gaan_kop: 'Going', team_kop: 'Team', nog_niemand: 'no one yet', nog_n: '{n} more', minder: 'less',
    agenda_knop: 'Add to calendar', snel_aan: 'Quick sign-up', snel_af: 'Quick sign-off', team_wijzig: 'Change team (now {t})', geen_team: 'no team', in_welk_team: 'Which team?', ander_team: 'other team…', ok: 'OK', tot: 'until {t}', hele_dag: 'all day',
    gaat_1: '1 going', gaan_n: '{n} going', jij_gaat: 'you’re going', jij_plus: 'you + {n}', aanmelden_badge: 'sign up', aanmeld_link: 'Sign up with the church', locatie_onbekend: 'Location to be announced',
    status_storing: 'Storage is unavailable right now. You can see the agenda, but “who’s going” may be out of date.',
    fout_ikga: 'Saving “I’m going” failed: storage is unavailable. Try again in a moment.', fout_intrekken: 'Signing off failed: storage is unavailable. Try again in a moment.', fout_opslaan: 'Saving failed: storage is unavailable. Try again in a moment.',
    fout_verwijderen: 'Removing failed. Try again later.', fout_toevoegen: 'Adding failed: storage is unavailable. Your text is still here.', fout_punt_weg: 'Removing failed: storage is unavailable.',
    aanmeld_fout_storing: 'Joining failed: storage is unavailable right now. Your input is still here; try again in a moment.', aanmeld_fout: 'Joining failed: {m}', niet_gelukt: 'That didn’t work: {m}',
    bijgewerkt: 'Calendar updated {d}', voet: 'The calendar comes from the public calendar of Hillsong Church Netherlands. Something wrong? Check ', voet_link: 'hillsong.com/netherlands',
    hoi: 'Hi {n}', welkom_thuis: 'Welcome home', delen: 'Share', gekopieerd: 'Copied. Paste it wherever you like.', week_kies: 'Week', eerdere_weken: 'Earlier weeks', dag_kort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], samenvatting: 'Summary', zondag_kop: 'Sunday', connect_kop: 'Connect group', devotion_leeg: 'No devotion for this week yet.', zondag_geen: 'No service in the calendar.', zondag_gekozen: '{dag}: you’re going at {t}.', zondag_niet: '{dag}: you haven’t picked a service yet. Pick one in the agenda.', connect_geen: 'No next meeting planned yet.',
    dag_van: '{dag}, day {n} of 6', van_zondag: 'from Sunday {d}', terugblik_titel: 'This week in six lines', slot_kop: 'Where he’s taking us',
    ask_titel: 'Ask the service', ask_uitleg: 'Ask anything about what was said in the services this year, in English or Dutch. You get an answer from the sermons themselves, with the date and a link to the exact second in the video. If it’s not in the sermons, Ask the service simply says so. It gives no opinion of its own and doesn’t judge the speaker.',
    ask_label: 'Your question', ask_placeholder: 'What was said about forgiveness?', ask_knop: 'Ask the service', ask_wacht: 'One moment…', ask_niet: 'Ask the service isn’t connected yet. Your question was not sent or stored. This part is coming in the next phase.',
    connect_titel: 'Connect group', connect_intro: 'Led by Steven and Victoria. The date and place appear here as soon as the leaders pass them on.', geen_avond: 'No next evening planned yet.',
    prayers: 'Prayers', prayers_uitleg: 'What can the group pray for this week? Whatever you post stays here through Sunday.', praise: 'Praise', praise_uitleg: 'What are you thankful for, what has God done? This also stays through Sunday.',
    toevoegen: 'Add', prayer_placeholder: 'Pray with me for…', praise_placeholder: 'Thankful for…', nieuw_prayer: 'New prayer point', nieuw_praise: 'New praise point',
    anoniem_label: 'Post anonymously (your name is left out, also for the leaders; only you can remove it)', anoniem: 'Anonymous', geen_prayers: 'No prayer points this week yet.', geen_praise: 'No praise this week yet.', verwijder_punt: 'Remove this item',
    dagen: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], kort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  nl: {
    tab_home: 'Home', tab_agenda: 'Agenda', tab_connect: 'Connectgroep', taal_wissel: 'EN',
    welkom: 'Welkom', aanmeld_uitleg: 'Vul je naam en woonplaats in. Dat is alles. Anderen in de groep zien je naam en woonplaats bij de diensten waar je naartoe gaat. Je kunt jezelf altijd weer verwijderen.',
    naam: 'Naam', woonplaats: 'Woonplaats', aanmelden: 'Aanmelden', verwijder_mij: 'Verwijder mij', verwijder_bevestig: 'Je naam en al je keuzes worden verwijderd. Doorgaan?',
    binnenkort: 'Binnenkort voor jou', deze_week: 'Komende 7 dagen', belangrijk: 'Belangrijk', later: 'Later', toon_meer: 'Toon {n} volgende', verberg: 'Verberg', leeg_agenda: 'Er staat niets in de agenda voor de komende weken.',
    service_label: 'Dienst', team_aan: 'Helpen in een team', team_uit: 'Niet meer helpen (alleen gaan)', route: 'Route', locatie_volgt: 'Locatie volgt', ik_ga: 'Ik ga', toch_niet: 'Toch niet', team: 'Team', gaan_kop: 'Gaan', team_kop: 'Team', nog_niemand: 'nog niemand', nog_n: 'nog {n}', minder: 'minder',
    agenda_knop: 'Zet in agenda', snel_aan: 'Snel aanmelden', snel_af: 'Snel afmelden', team_wijzig: 'Team wijzigen (nu {t})', geen_team: 'zonder team', in_welk_team: 'In welk team?', ander_team: 'ander team…', ok: 'Ok', tot: 'tot {t}', hele_dag: 'hele dag',
    gaat_1: '1 gaat', gaan_n: '{n} gaan', jij_gaat: 'jij gaat', jij_plus: 'jij + {n}', aanmelden_badge: 'aanmelden', aanmeld_link: 'Aanmelden bij de kerk', locatie_onbekend: 'Locatie nog niet bekend',
    status_storing: 'De opslag is nu niet bereikbaar. Je ziet de agenda, maar "wie gaat" is mogelijk niet actueel.',
    fout_ikga: 'Opslaan van "ik ga" is niet gelukt: de opslag is niet bereikbaar. Probeer het zo opnieuw.', fout_intrekken: 'Intrekken is niet gelukt: de opslag is niet bereikbaar. Probeer het zo opnieuw.', fout_opslaan: 'Opslaan is niet gelukt: de opslag is niet bereikbaar. Probeer het zo opnieuw.',
    fout_verwijderen: 'Verwijderen is niet gelukt. Probeer het later opnieuw.', fout_toevoegen: 'Toevoegen is niet gelukt: de opslag is niet bereikbaar. Je tekst staat er nog.', fout_punt_weg: 'Verwijderen is niet gelukt: de opslag is niet bereikbaar.',
    aanmeld_fout_storing: 'Aanmelden is niet gelukt: de opslag is nu niet bereikbaar. Je invoer staat er nog; probeer het zo opnieuw.', aanmeld_fout: 'Aanmelden is niet gelukt: {m}', niet_gelukt: 'Dat is niet gelukt: {m}',
    bijgewerkt: 'Agenda bijgewerkt op {d}', voet: 'De agenda komt uit de openbare kalender van Hillsong Church Netherlands. Klopt er iets niet? Kijk op ', voet_link: 'hillsong.com/netherlands',
    hoi: 'Hoi {n}', welkom_thuis: 'Welkom thuis', delen: 'Delen', gekopieerd: 'Gekopieerd. Plak het waar je wilt.', week_kies: 'Week', eerdere_weken: 'Eerdere weken', dag_kort: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'], samenvatting: 'Samenvatting', zondag_kop: 'Zondag', connect_kop: 'Connectgroep', devotion_leeg: 'Er is nog geen devotion voor deze week.', zondag_geen: 'Geen dienst in de agenda.', zondag_gekozen: '{dag}: jij gaat om {t}.', zondag_niet: '{dag}: je hebt nog geen dienst gekozen. Kies er een in de agenda.', connect_geen: 'Nog geen volgende avond gepland.',
    dag_van: '{dag}, dag {n} van 6', van_zondag: 'uit de dienst van zondag {d}', terugblik_titel: 'Deze week in zes regels', slot_kop: 'Waar hij naartoe werkt',
    ask_titel: 'Ask the service', ask_uitleg: 'Stel een vraag over wat er dit jaar in de diensten is gezegd, in het Nederlands of Engels. Je krijgt een antwoord uit de preken zelf, met de datum en een link naar de seconde in de video waar het gezegd wordt. Staat het niet in de preken, dan zegt Ask the service dat gewoon. Het geeft geen eigen mening en beoordeelt de spreker niet.',
    ask_label: 'Jouw vraag', ask_placeholder: 'Wat is er gezegd over vergeving?', ask_knop: 'Vraag het de dienst', ask_wacht: 'Even geduld…', ask_niet: 'Ask the service is nog niet aangesloten. Je vraag is niet verstuurd en niet opgeslagen. Dit onderdeel komt in de volgende fase.',
    connect_titel: 'Connectgroep', connect_intro: 'Onder leiding van Steven en Victoria. De datum en plek staan hier zodra de leiders ze doorgeven.', geen_avond: 'Nog geen volgende avond gepland.',
    prayers: 'Prayers', prayers_uitleg: 'Waar mag de groep deze week voor bidden? Wat je hier zet blijft staan tot en met zondag.', praise: 'Praise', praise_uitleg: 'Waar ben je dankbaar voor, wat heeft God gedaan? Ook dit blijft staan tot en met zondag.',
    toevoegen: 'Toevoegen', prayer_placeholder: 'Bid je mee voor…', praise_placeholder: 'Dankbaar voor…', nieuw_prayer: 'Nieuw gebedspunt', nieuw_praise: 'Nieuw praise-punt',
    anoniem_label: 'Anoniem plaatsen (je naam blijft weg, ook voor de leiders; alleen jij kunt het punt weghalen)', anoniem: 'Anoniem', geen_prayers: 'Nog geen gebedspunten deze week.', geen_praise: 'Nog geen praise deze week.', verwijder_punt: 'Verwijder dit punt',
    dagen: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'], kort: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
  },
};
export let taal = 'en';
try { const b = localStorage.getItem('kring.taal'); if (b === 'nl' || b === 'en') taal = b; } catch {}
export function zetTaal(code) { taal = code === 'nl' ? 'nl' : 'en'; try { localStorage.setItem('kring.taal', taal); } catch {} document.documentElement.lang = taal; }
export const t = (k, vars = {}) => { const w = TEKST[taal][k] ?? TEKST.en[k] ?? k; return Array.isArray(w) ? w : String(w).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? ''); };
export function vertaalDom(root = document) {
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of root.querySelectorAll('[data-t-placeholder]')) el.placeholder = t(el.dataset.tPlaceholder);
  for (const el of root.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', t(el.dataset.tAria));
  for (const tpl of root.querySelectorAll('template')) vertaalDom(tpl.content);
}
