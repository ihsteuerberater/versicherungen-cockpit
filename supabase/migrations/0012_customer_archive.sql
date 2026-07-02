-- Kunde darf eigene Anfragen selbst archivieren (nur diese eine Spalte,
-- kein blankes UPDATE-Recht auf requests, gleiche Vorsicht wie bei
-- update_own_staff_profile).
create or replace function archive_own_request(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update requests
  set archived_at = now()
  where id = p_request_id and is_own_customer(customer_id);
end;
$$;
