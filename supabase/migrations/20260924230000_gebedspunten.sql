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
