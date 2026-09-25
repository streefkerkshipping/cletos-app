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

-- 2026-09-24: eigen rij wijzigen (rol/team).
drop policy if exists gaat_eigen_wijzigen on public.gaat_naar;
create policy gaat_eigen_wijzigen on public.gaat_naar for update to authenticated
  using (lid_id = public.mijn_lid_id()) with check (lid_id = public.mijn_lid_id());
