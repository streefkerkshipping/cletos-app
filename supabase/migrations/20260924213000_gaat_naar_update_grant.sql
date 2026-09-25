-- Herstel (24-09): de app schrijft "ik ga"/"team" als upsert; die raakt de hele rij. Kolombeperkt update-recht
-- (alleen rol, team) gaf "permission denied". RLS (eigen rij) blijft de echte grens; tabelbreed update-recht is dus veilig.
grant update on public.gaat_naar to authenticated;
