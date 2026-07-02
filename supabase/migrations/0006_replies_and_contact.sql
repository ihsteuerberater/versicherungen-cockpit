-- Antwortmöglichkeit auf Kunden-Anfragen + vollständige Firmen-Kontaktdaten
-- (fürs Kunden-Portal, analog zur "Kontakt"-Seite bei myAXA).

alter table requests add column reply text;

alter table organizations add column phone text;
alter table organizations add column email text;
alter table organizations add column address text;
