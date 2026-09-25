-- Bas, 25-09: "inloggen met stad moet worden connectgroep — connectgroep Apeldoorn invoeren". Het veld blijft een plaats,
-- maar betekent nu: de plaats van je connectgroep. Kolom hernoemd; de check-constraint gaat automatisch mee.
alter table public.leden rename column woonplaats to connectgroep;
