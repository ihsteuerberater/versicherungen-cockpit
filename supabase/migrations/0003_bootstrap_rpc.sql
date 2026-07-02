-- Self-service Onboarding: Ein neu registrierter Nutzer ohne staff_users-Zeile
-- kann einmalig seine eigene Organisation anlegen und wird deren Owner.
-- security definer, weil ein Nutzer ohne bestehende Organisation sonst per RLS
-- weder organizations noch staff_users beschreiben dürfte (Henne-Ei-Problem).

create or replace function bootstrap_organization(org_name text, owner_full_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_org_id uuid;
begin
  if exists (select 1 from staff_users where id = auth.uid()) then
    raise exception 'Dieser Account gehört bereits zu einer Organisation.';
  end if;

  insert into organizations (name) values (org_name) returning id into new_org_id;

  insert into staff_users (id, organization_id, full_name, email, role, access_level)
  values (
    auth.uid(),
    new_org_id,
    owner_full_name,
    (select email from auth.users where id = auth.uid()),
    'owner',
    'full'
  );

  return new_org_id;
end;
$$;
