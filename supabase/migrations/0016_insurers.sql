-- Kleine Referenzliste "welche Gesellschaft hat welches Logo" pro Organisation,
-- damit man das Logo nicht bei jeder einzelnen Police neu hochladen muss.
create table insurers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

alter table insurers enable row level security;

create policy "staff sees own org insurers" on insurers
  for select using (organization_id = current_staff_org());

create policy "staff manages own org insurers" on insurers
  for all using (organization_id = current_staff_org())
  with check (organization_id = current_staff_org());

-- Kunde darf Logos der Gesellschaften sehen, bei denen er eine Police hat
-- (fürs Kunden-Portal).
create policy "customer sees insurers of own policies" on insurers
  for select using (
    exists (
      select 1 from policies p
      where p.insurer_name = insurers.name
        and p.organization_id = insurers.organization_id
        and is_own_customer(p.customer_id)
    )
  );

-- Logos der Gesellschaften dürfen im gleichen "branding"-Bucket liegen
-- (öffentlich, wie Organisations-Logo/Beraterfoto).
create policy "staff uploads insurer logo" on storage.objects
  for insert with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = 'insurer-logos'
    and (storage.foldername(name))[2] = current_staff_org()::text
  );

create policy "staff updates insurer logo" on storage.objects
  for update using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = 'insurer-logos'
    and (storage.foldername(name))[2] = current_staff_org()::text
  );
