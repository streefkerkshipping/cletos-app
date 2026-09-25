-- Anoniem gebedspunt (Bas, 24-09). Lezen gaat via een weergave die de naam alleen toont als het punt niet anoniem is,
-- en "van mij" alleen voor de eigenaar. De tabel zelf is niet meer direct leesbaar, zodat de auteur van een anoniem punt
-- ook via een directe aanvraag niet te achterhalen is. Verwijderen van eigen punten blijft op de tabel werken (RLS).
alter table public.gebedspunten add column if not exists anoniem boolean not null default false;
revoke select on public.gebedspunten from anon, authenticated;
create or replace view public.gebedspunten_zicht with (security_invoker = false) as
  select g.id, g.soort, g.tekst, g.week_eind, g.gemaakt_op, g.anoniem,
         case when g.anoniem then null else l.naam end as naam,
         (g.auteur_lid_id = public.mijn_lid_id()) as van_mij
  from public.gebedspunten g join public.leden l on l.id = g.auteur_lid_id;
grant select on public.gebedspunten_zicht to anon, authenticated;
