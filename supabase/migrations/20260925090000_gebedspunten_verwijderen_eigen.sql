-- Reparatie P1 uit de review van fase 1 (25-09): eigen gebedspunt verwijderen faalde met "permission denied".
-- Postgres eist leesrecht op de kolommen in de where van een delete. Migratie 20260924233000 trok select op de
-- hele tabel in (anonimiteit). Hier krijgt de app leesrecht op alleen de kolom id: genoeg om "delete where id = ..."
-- te doen, en nog steeds geen weg naar auteur_lid_id of tekst buiten de weergave gebedspunten_zicht om.
grant select (id) on public.gebedspunten to authenticated;
