-- Fase 1b (Bas, 24-09): per dienst "Ik ga" of "Ik help" (serve), met team. Eén rij per persoon per dienst; rol wisselt.
alter table public.gaat_naar
  add column if not exists rol  text not null default 'gaat' check (rol in ('gaat', 'helpt')),
  add column if not exists team text check (team is null or char_length(btrim(team)) between 1 and 40);

-- Eigen rij mogen wijzigen (rol/team), niemand anders.
drop policy if exists gaat_eigen_wijzigen on public.gaat_naar;
create policy gaat_eigen_wijzigen on public.gaat_naar for update to authenticated
  using (lid_id = public.mijn_lid_id()) with check (lid_id = public.mijn_lid_id());
grant update on public.gaat_naar to authenticated;  -- tabelbreed (upsert raakt de hele rij); RLS beperkt tot eigen rij
