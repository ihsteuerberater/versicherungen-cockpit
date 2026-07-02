-- Kunden-Portal: ein Kunde bekommt erst Zugang, wenn ein Mitarbeiter das für
-- ihn aktiv einrichtet (Einladungslink), nicht automatisch bei Datensatz-Anlage.

alter table customers add column customer_user_id uuid references auth.users(id) on delete set null;
alter table customers add column invite_token uuid;

create unique index customers_customer_user_id_idx on customers(customer_user_id) where customer_user_id is not null;

-- Sieht der eingeloggte Kunde (nicht Mitarbeiter) diesen Datensatz als "seinen eigenen"?
create or replace function is_own_customer(cust_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from customers c where c.id = cust_id and c.customer_user_id = auth.uid()
  )
$$;

-- Löst den Einladungslink ein: verknüpft den frisch angemeldeten Auth-User
-- mit dem Kunden-Datensatz, für den der Token ausgestellt wurde, und
-- entwertet den Token danach (Einmal-Nutzung).
create or replace function claim_customer_invite(token uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  target_customer_id uuid;
begin
  select id into target_customer_id from customers where invite_token = token;

  if target_customer_id is null then
    raise exception 'Einladungslink ist ungültig oder wurde bereits verwendet.';
  end if;

  update customers
  set customer_user_id = auth.uid(), invite_token = null
  where id = target_customer_id;

  return target_customer_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Zusätzliche RLS-Policies für Kunden (additiv, ODER-verknüpft mit den
-- bestehenden Mitarbeiter-Policies auf denselben Tabellen)
-- ---------------------------------------------------------------------------

create policy "customer sees own customer record" on customers
  for select using (customer_user_id = auth.uid());

create policy "customer sees own persons" on persons
  for select using (is_own_customer(customer_id));

create policy "customer sees own policies" on policies
  for select using (is_own_customer(customer_id));

create policy "customer sees own premiums" on premiums
  for select using (
    exists (select 1 from policies p where p.id = premiums.policy_id and is_own_customer(p.customer_id))
  );

create policy "customer sees own claims" on claims
  for select using (
    exists (select 1 from policies p where p.id = claims.policy_id and is_own_customer(p.customer_id))
  );

create policy "customer sees own documents" on documents
  for select using (customer_id is not null and is_own_customer(customer_id));

create policy "customer sees own requests" on requests
  for select using (is_own_customer(customer_id));

create policy "customer creates own requests" on requests
  for insert with check (is_own_customer(customer_id));
