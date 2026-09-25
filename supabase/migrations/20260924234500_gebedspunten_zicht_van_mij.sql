-- van_mij is false (niet null) voor bezoekers zonder lid-rij.
create or replace view public.gebedspunten_zicht with (security_invoker = false) as
  select g.id, g.soort, g.tekst, g.week_eind, g.gemaakt_op, g.anoniem,
         case when g.anoniem then null else l.naam end as naam,
         coalesce(g.auteur_lid_id = public.mijn_lid_id(), false) as van_mij
  from public.gebedspunten g join public.leden l on l.id = g.auteur_lid_id;
