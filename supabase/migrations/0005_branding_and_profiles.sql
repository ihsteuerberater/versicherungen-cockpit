-- Erweiterungen für Berater-Sichtbarkeit im Kunden-Portal: Foto/Telefon pro
-- Mitarbeiter, plus ein Storage-Bucket für Logos/Fotos.

alter table staff_users add column phone text;
alter table staff_users add column photo_url text;

-- Öffentlich lesbarer Bucket (Logos/Fotos müssen auch im Kunden-Portal ohne
-- Umwege anzeigbar sein), Schreibzugriff bleibt per Pfad-Konvention geschützt.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Pfad-Konvention: org-logos/{organization_id}/... und staff-photos/{staff_user_id}/...
create policy "staff uploads own org logo" on storage.objects
  for insert with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = 'org-logos'
    and (storage.foldername(name))[2] = current_staff_org()::text
  );

create policy "staff updates own org logo" on storage.objects
  for update using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = 'org-logos'
    and (storage.foldername(name))[2] = current_staff_org()::text
  );

create policy "staff uploads own photo" on storage.objects
  for insert with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = 'staff-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "staff updates own photo" on storage.objects
  for update using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = 'staff-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Owner darf Organisationsdaten (Name, Logo, Farbe) bearbeiten.
create policy "owner updates organization" on organizations
  for update using (
    id = current_staff_org() and current_staff_role() = 'owner'
  );

-- Mitarbeiter dürfen ihr eigenes Profil (Foto, Telefon) bearbeiten – als RPC,
-- damit ein normaler Mitarbeiter nicht per direktem UPDATE auch role/access_level
-- der eigenen Zeile hochstufen kann (kein blankes UPDATE-Recht auf staff_users).
create or replace function update_own_staff_profile(new_phone text, new_photo_url text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update staff_users
  set phone = new_phone, photo_url = new_photo_url
  where id = auth.uid();
end;
$$;

-- Kunde darf die Organisation sehen, zu der er gehört (Branding im Portal).
create policy "customer sees own organization" on organizations
  for select using (
    exists (select 1 from customers c where c.organization_id = organizations.id and c.customer_user_id = auth.uid())
  );

-- Kunde darf das Profil seines zugewiesenen Beraters sehen (Name/Foto/Telefon).
create policy "customer sees assigned staff" on staff_users
  for select using (
    exists (
      select 1 from customers c
      where c.assigned_staff_id = staff_users.id and c.customer_user_id = auth.uid()
    )
  );
