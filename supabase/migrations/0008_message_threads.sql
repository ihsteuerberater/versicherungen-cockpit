-- Nachrichten-Threads statt einzelnem message/reply-Feld: mehrere Nachrichten
-- pro Anfrage, mit Zeitstempel. Bleiben beim Berater für immer sichtbar
-- (Nachvollziehbarkeit). Beim Kunden verschwinden archivierte Threads aus der
-- aktiven Ansicht, sobald der Berater sie manuell archiviert.

create type message_sender_role as enum ('kunde', 'berater');

create table request_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  request_id uuid not null references requests(id) on delete cascade,
  sender_role message_sender_role not null,
  sender_id uuid not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table requests add column archived_at timestamptz;

-- Einmalige Übernahme bestehender message/reply-Werte als erste Nachrichten
-- des jeweiligen Threads (kein Datenverlust bei bereits erfassten Anfragen).
insert into request_messages (organization_id, request_id, sender_role, sender_id, message, created_at)
select organization_id, id, 'kunde', customer_id, message, created_at
from requests
where message is not null;

insert into request_messages (organization_id, request_id, sender_role, sender_id, message, created_at)
select organization_id, id, 'berater', customer_id, reply, created_at
from requests
where reply is not null;

alter table request_messages enable row level security;

create policy "staff sees messages of accessible requests" on request_messages
  for select using (
    exists (select 1 from requests r where r.id = request_messages.request_id and can_access_customer(r.customer_id))
  );

create policy "staff sends messages on accessible requests" on request_messages
  for insert with check (
    exists (select 1 from requests r where r.id = request_messages.request_id and can_access_customer(r.customer_id))
  );

create policy "customer sees messages of own requests" on request_messages
  for select using (
    exists (select 1 from requests r where r.id = request_messages.request_id and is_own_customer(r.customer_id))
  );

create policy "customer sends messages on own requests" on request_messages
  for insert with check (
    exists (select 1 from requests r where r.id = request_messages.request_id and is_own_customer(r.customer_id))
  );

-- Status automatisch umschalten: Kunde schreibt -> offen (Berater muss ran),
-- Berater schreibt -> beantwortet (Kunde ist wieder am Zug).
create or replace function sync_request_status_on_message()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update requests
  set status = case when new.sender_role = 'kunde' then 'open' else 'answered' end
  where id = new.request_id;
  return new;
end;
$$;

create trigger request_messages_sync_status
  after insert on request_messages
  for each row execute function sync_request_status_on_message();

alter publication supabase_realtime add table request_messages;
