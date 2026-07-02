-- Row-Level-Security: erzwingt die Mandanten-Trennung auf Datenbankebene,
-- unabhängig von der Anwendungslogik im Frontend.

-- ---------------------------------------------------------------------------
-- Helper functions (security definer: bypass RLS internally, avoid recursion)
-- ---------------------------------------------------------------------------

create or replace function current_staff_org()
returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from staff_users where id = auth.uid()
$$;

create or replace function current_staff_role()
returns staff_role
language sql stable security definer set search_path = public as $$
  select role from staff_users where id = auth.uid()
$$;

create or replace function current_staff_access_level()
returns staff_access_level
language sql stable security definer set search_path = public as $$
  select access_level from staff_users where id = auth.uid()
$$;

-- Kann der eingeloggte Mitarbeiter diesen Kunden sehen/bearbeiten?
create or replace function can_access_customer(cust_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from customers c
    where c.id = cust_id
      and c.organization_id = current_staff_org()
      and (
        current_staff_role() = 'owner'
        or current_staff_access_level() = 'full'
        or c.assigned_staff_id = auth.uid()
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

alter table organizations enable row level security;
alter table vermittler_profiles enable row level security;
alter table staff_users enable row level security;
alter table customers enable row level security;
alter table persons enable row level security;
alter table policies enable row level security;
alter table premiums enable row level security;
alter table claims enable row level security;
alter table documents enable row level security;
alter table requests enable row level security;
alter table opportunities enable row level security;
alter table courtage_entries enable row level security;

-- ---------------------------------------------------------------------------
-- organizations: nur die eigene Organisation sichtbar
-- ---------------------------------------------------------------------------

create policy "staff sees own organization" on organizations
  for select using (id = current_staff_org());

-- ---------------------------------------------------------------------------
-- vermittler_profiles: org-scoped, nur Owner ändert
-- ---------------------------------------------------------------------------

create policy "staff sees own org vermittler profiles" on vermittler_profiles
  for select using (organization_id = current_staff_org());

create policy "owner manages vermittler profiles" on vermittler_profiles
  for all using (
    organization_id = current_staff_org() and current_staff_role() = 'owner'
  );

-- ---------------------------------------------------------------------------
-- staff_users: org-scoped Sichtbarkeit, nur Owner verwaltet andere Accounts
-- ---------------------------------------------------------------------------

create policy "staff sees colleagues in own organization" on staff_users
  for select using (organization_id = current_staff_org());

create policy "owner manages staff accounts" on staff_users
  for insert with check (
    organization_id = current_staff_org() and current_staff_role() = 'owner'
  );

create policy "owner updates staff accounts" on staff_users
  for update using (
    organization_id = current_staff_org() and current_staff_role() = 'owner'
  );

create policy "owner deletes staff accounts" on staff_users
  for delete using (
    organization_id = current_staff_org() and current_staff_role() = 'owner'
  );

-- ---------------------------------------------------------------------------
-- customers: org-scoped + assigned-only vs. full access
-- ---------------------------------------------------------------------------

create policy "staff sees accessible customers" on customers
  for select using (can_access_customer(id));

create policy "staff creates customers in own organization" on customers
  for insert with check (organization_id = current_staff_org());

create policy "staff updates accessible customers" on customers
  for update using (can_access_customer(id));

create policy "owner deletes customers" on customers
  for delete using (
    organization_id = current_staff_org() and current_staff_role() = 'owner'
  );

-- ---------------------------------------------------------------------------
-- Customer-linked tables: gleiche Sichtbarkeitsregel wie der zugehörige Kunde
-- ---------------------------------------------------------------------------

create policy "staff sees accessible persons" on persons
  for select using (can_access_customer(customer_id));
create policy "staff manages accessible persons" on persons
  for all using (can_access_customer(customer_id))
  with check (can_access_customer(customer_id));

create policy "staff sees accessible policies" on policies
  for select using (can_access_customer(customer_id));
create policy "staff manages accessible policies" on policies
  for all using (can_access_customer(customer_id))
  with check (can_access_customer(customer_id));

create policy "staff sees accessible premiums" on premiums
  for select using (
    exists (select 1 from policies p where p.id = premiums.policy_id and can_access_customer(p.customer_id))
  );
create policy "staff manages accessible premiums" on premiums
  for all using (
    exists (select 1 from policies p where p.id = premiums.policy_id and can_access_customer(p.customer_id))
  ) with check (
    exists (select 1 from policies p where p.id = premiums.policy_id and can_access_customer(p.customer_id))
  );

create policy "staff sees accessible claims" on claims
  for select using (
    exists (select 1 from policies p where p.id = claims.policy_id and can_access_customer(p.customer_id))
  );
create policy "staff manages accessible claims" on claims
  for all using (
    exists (select 1 from policies p where p.id = claims.policy_id and can_access_customer(p.customer_id))
  ) with check (
    exists (select 1 from policies p where p.id = claims.policy_id and can_access_customer(p.customer_id))
  );

create policy "staff sees accessible documents" on documents
  for select using (
    organization_id = current_staff_org()
    and (customer_id is null or can_access_customer(customer_id))
  );
create policy "staff manages accessible documents" on documents
  for all using (
    organization_id = current_staff_org()
    and (customer_id is null or can_access_customer(customer_id))
  ) with check (
    organization_id = current_staff_org()
    and (customer_id is null or can_access_customer(customer_id))
  );

create policy "staff sees accessible requests" on requests
  for select using (can_access_customer(customer_id));
create policy "staff manages accessible requests" on requests
  for all using (can_access_customer(customer_id))
  with check (can_access_customer(customer_id));

create policy "staff sees accessible opportunities" on opportunities
  for select using (can_access_customer(customer_id));
create policy "staff manages accessible opportunities" on opportunities
  for all using (can_access_customer(customer_id))
  with check (can_access_customer(customer_id));

create policy "staff sees accessible courtage entries" on courtage_entries
  for select using (
    exists (select 1 from policies p where p.id = courtage_entries.policy_id and can_access_customer(p.customer_id))
  );
create policy "staff manages accessible courtage entries" on courtage_entries
  for all using (
    exists (select 1 from policies p where p.id = courtage_entries.policy_id and can_access_customer(p.customer_id))
  ) with check (
    exists (select 1 from policies p where p.id = courtage_entries.policy_id and can_access_customer(p.customer_id))
  );
