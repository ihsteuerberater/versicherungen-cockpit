-- Löscht beim endgültigen Entfernen eines Kunden auch dessen Login-Zugang
-- (falls er sich über den Einladungslink registriert hat), nicht nur seine
-- Daten. security definer, weil das Löschen aus auth.users erhöhte Rechte
-- braucht, die der Client (anon-Key) nicht hat.
create or replace function delete_customer_with_login(p_customer_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if current_staff_role() <> 'owner' then
    raise exception 'Nur der Owner darf Kunden löschen';
  end if;

  select customer_user_id into v_user_id
  from customers
  where id = p_customer_id
    and organization_id = current_staff_org();

  if not found then
    raise exception 'Kunde nicht gefunden oder kein Zugriff';
  end if;

  delete from customers where id = p_customer_id;

  if v_user_id is not null then
    delete from auth.users where id = v_user_id;
  end if;
end;
$$;
