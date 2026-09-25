-- Kring — fase 1 schema. Uitvoeren in de Supabase SQL-editor. Zie README.md.
-- Vereist: Authentication → Sign In / Providers → "Allow anonymous sign-ins" AAN.

create extension if not exists pgcrypto;

create table if not exists public.leden (
  id          uuid primary key default gen_random_uuid(),
  auth_uid    uuid not null unique default auth.uid(),
  naam        text not null check (char_length(btrim(naam)) between 2 and 60),
  woonplaats  text not null check (char_length(btrim(woonplaats)) between 2 and 60),
  rol         text not null default 'lid' check (rol in ('beheerder', 'lid')),
  gemaakt_op  timestamptz not null default now()
);

create table if not exists public.gaat_naar (
  id                uuid primary key default gen_random_uuid(),
  lid_id            uuid not null references public.leden(id) on delete cascade,
  event_identifier  text not null check (char_length(event_identifier) between 1 and 40),
  event_start       timestamptz not null,
  gemaakt_op        timestamptz not null default now(),
  unique (lid_id, event_identifier)
);
create index if not exists gaat_naar_event on public.gaat_naar (event_identifier);

-- Wie ben ik (als lid)? security definer zodat de policy geen recursieve select op leden nodig heeft.
create or replace function public.mijn_lid_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.leden where auth_uid = auth.uid()
$$;
revoke all on function public.mijn_lid_id() from public;
grant execute on function public.mijn_lid_id() to authenticated, anon;

-- Toegang voor de API-rollen. Nodig als "Automatically expose new tables" bij het aanmaken UIT staat (aanbevolen):
-- dan krijgt een tabel pas toegang als we dat hier expliciet zeggen. RLS (policies.sql) bepaalt daarna welke rijen.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.leden to anon, authenticated;
grant select, insert, delete on public.gaat_naar to anon, authenticated;

-- 2026-09-24 (migratie 20260924200000): rol 'gaat' | 'helpt' en team per aanmelding.
alter table public.gaat_naar
  add column if not exists rol  text not null default 'gaat' check (rol in ('gaat', 'helpt')),
  add column if not exists team text check (team is null or char_length(btrim(team)) between 1 and 40);
grant update on public.gaat_naar to authenticated;  -- tabelbreed (upsert raakt de hele rij); RLS beperkt tot eigen rij
-- Praise & prayers op de Connectgroep-pagina (Bas, 24-09). Een punt blijft staan tot en met de zondag van die week (week_eind).
create table if not exists public.gebedspunten (
  id             uuid primary key default gen_random_uuid(),
  auteur_lid_id  uuid not null references public.leden(id) on delete cascade,
  soort          text not null check (soort in ('prayer', 'praise')),
  tekst          text not null check (char_length(btrim(tekst)) between 1 and 400),
  week_eind      date not null,
  gemaakt_op     timestamptz not null default now()
);
create index if not exists gebedspunten_week on public.gebedspunten (week_eind);
grant select, insert, update, delete on public.gebedspunten to anon, authenticated;
alter table public.gebedspunten enable row level security;
drop policy if exists gebed_lezen on public.gebedspunten;
create policy gebed_lezen on public.gebedspunten for select to anon, authenticated using (true);
drop policy if exists gebed_eigen_toevoegen on public.gebedspunten;
create policy gebed_eigen_toevoegen on public.gebedspunten for insert to authenticated with check (auteur_lid_id = public.mijn_lid_id());
drop policy if exists gebed_eigen_wijzigen on public.gebedspunten;
create policy gebed_eigen_wijzigen on public.gebedspunten for update to authenticated using (auteur_lid_id = public.mijn_lid_id()) with check (auteur_lid_id = public.mijn_lid_id());
drop policy if exists gebed_eigen_verwijderen on public.gebedspunten;
create policy gebed_eigen_verwijderen on public.gebedspunten for delete to authenticated using (auteur_lid_id = public.mijn_lid_id());
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
