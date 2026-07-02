-- Bestehende Duplikate aufräumen (nur bei Deckungslücken-Chancen, je Kunde +
-- Notiz bleibt die älteste Zeile stehen).
delete from opportunities o
using opportunities newer
where o.kind = 'deckungsluecke'
  and newer.kind = 'deckungsluecke'
  and o.customer_id = newer.customer_id
  and o.note = newer.note
  and o.created_at > newer.created_at;

-- Erzwingt Eindeutigkeit auf Datenbank-Ebene, damit ein Wettlauf zwischen
-- "prüfen ob schon vorhanden" und "einfügen" (z.B. durch React StrictMode,
-- doppeltes Laden) nie mehr zu Duplikaten führen kann.
create unique index opportunities_deckungsluecke_unique
  on opportunities (customer_id, note)
  where kind = 'deckungsluecke';

-- Atomarer Check-and-Insert statt "erst select, dann insert" im Frontend.
-- Kein security definer nötig – die bestehende RLS-Policy für Kunden greift
-- ganz normal, das hier ist nur eine sichere Kapselung der Konflikt-Logik.
create or replace function sync_coverage_gap_opportunity(p_organization_id uuid, p_customer_id uuid, p_note text)
returns void
language plpgsql as $$
begin
  insert into opportunities (organization_id, customer_id, kind, note)
  values (p_organization_id, p_customer_id, 'deckungsluecke', p_note)
  on conflict (customer_id, note) where kind = 'deckungsluecke' do nothing;
end;
$$;
