-- Fix: 'open'/'answered' waren als text statt request_status typisiert,
-- was beim Einfügen einer Nachricht einen Fehler auslöste.
create or replace function sync_request_status_on_message()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update requests
  set status = case when new.sender_role = 'kunde' then 'open'::request_status else 'answered'::request_status end
  where id = new.request_id;
  return new;
end;
$$;
