-- Strukturiertes Datum statt nur Freitext, damit sich Fristen berechnen lassen.
-- Pro Police einzeln aktivierbar, da der Berater selbst entscheidet, wo eine
-- Erinnerung sinnvoll ist (nicht jede Police braucht das).
alter table policies add column cancellation_deadline date;
alter table policies add column cancellation_alert_enabled boolean not null default false;

-- Verknüpfung, damit eine Kündigungsfrist-Chance direkt auf ihre Police zeigt.
alter table opportunities add column policy_id uuid references policies(id) on delete cascade;

-- Verhindert doppelte Chancen-Einträge pro Police, selbst bei mehrfachem Aufruf
-- der Sync-Funktion (gleiches Muster wie bei den Deckungslücken).
create unique index opportunities_kuendigungsfrist_unique
  on opportunities (policy_id)
  where kind = 'kuendigungsfrist';

-- Legt für jede Police mit aktiver Erinnerung, deren Kündigungsfrist innert 60
-- Tagen liegt, eine Chance an. RLS greift wie gewohnt über can_access_customer,
-- Mitarbeitende mit "assigned_only" sehen dadurch nur ihre eigenen Kunden.
create or replace function sync_cancellation_opportunities()
returns void
language plpgsql as $$
begin
  insert into opportunities (organization_id, customer_id, policy_id, kind, note)
  select
    p.organization_id,
    p.customer_id,
    p.id,
    'kuendigungsfrist',
    p.sparte || ' bei ' || p.insurer_name || ': Kündigungsfrist läuft am ' || to_char(p.cancellation_deadline, 'DD.MM.YYYY') || ' ab'
  from policies p
  where p.cancellation_alert_enabled
    and p.cancellation_deadline is not null
    and p.cancellation_deadline between current_date and current_date + 60
    and can_access_customer(p.customer_id)
  on conflict (policy_id) where kind = 'kuendigungsfrist' do nothing;
end;
$$;
