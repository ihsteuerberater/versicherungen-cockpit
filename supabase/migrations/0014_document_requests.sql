-- Verknüpft hochgeladene Dokumente optional mit einer Anfrage, damit der
-- Berater ein hochgeladenes Foto/PDF direkt im passenden Chat-Verlauf sieht
-- (z.B. wenn der Kunde eine bei ihm noch nicht erfasste Police hochlädt).
alter table documents add column request_id uuid references requests(id) on delete set null;
