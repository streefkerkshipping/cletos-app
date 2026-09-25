-- Migratie fase 1: schema + rechten (samengesteld uit schema.sql en policies.sql, 2026-09-24)
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

-- Kring — rechten (row level security). Uitvoeren ná schema.sql.
-- Besluit Bas 2026-09-24: open app, namen direct zichtbaar. Lezen mag iedereen met de anon-sleutel;
-- schrijven alleen als aangemeld lid en alleen je eigen rijen. Bij een latere telefoon-inlog wordt
-- alleen de select-policy strenger.

alter table public.leden enable row level security;
alter table public.gaat_naar enable row level security;

drop policy if exists leden_lezen on public.leden;
create policy leden_lezen on public.leden for select to anon, authenticated using (true);

drop policy if exists leden_aanmelden on public.leden;
create policy leden_aanmelden on public.leden for insert to authenticated with check (auth_uid = auth.uid() and rol = 'lid');

drop policy if exists leden_eigen_wijzigen on public.leden;
create policy leden_eigen_wijzigen on public.leden for update to authenticated using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());

drop policy if exists leden_eigen_verwijderen on public.leden;
create policy leden_eigen_verwijderen on public.leden for delete to authenticated using (auth_uid = auth.uid());

drop policy if exists gaat_lezen on public.gaat_naar;
create policy gaat_lezen on public.gaat_naar for select to anon, authenticated using (true);

drop policy if exists gaat_eigen_toevoegen on public.gaat_naar;
create policy gaat_eigen_toevoegen on public.gaat_naar for insert to authenticated with check (lid_id = public.mijn_lid_id());

drop policy if exists gaat_eigen_verwijderen on public.gaat_naar;
create policy gaat_eigen_verwijderen on public.gaat_naar for delete to authenticated using (lid_id = public.mijn_lid_id());

-- Geen update-policy op gaat_naar: een rij bestaat of bestaat niet.
-- rol kan een lid niet zelf op 'beheerder' zetten (insert eist 'lid'); een update van rol door een lid wordt
-- voorkomen met de trigger hieronder. Beheerder wordt gezet via de SQL-editor.
create or replace function public.rol_bevriezen() returns trigger language plpgsql as $$
begin
  if new.rol <> old.rol and auth.uid() is not null then
    raise exception 'rol kan niet door een lid worden gewijzigd';
  end if;
  return new;
end $$;
drop trigger if exists leden_rol_bevriezen on public.leden;
create trigger leden_rol_bevriezen before update on public.leden for each row execute function public.rol_bevriezen();
