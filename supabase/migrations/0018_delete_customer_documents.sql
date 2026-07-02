-- Damit beim endgültigen Löschen eines Kunden auch die hochgeladenen Dateien
-- (nicht nur die Datenbank-Zeilen) aus dem privaten 'documents'-Bucket entfernt
-- werden können. Nur der Owner darf das, analog zur bestehenden Regel
-- "owner deletes customers" auf der customers-Tabelle.
create policy "owner deletes accessible documents" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and exists (
      select 1 from customers c
      where c.id::text = (storage.foldername(name))[1]
        and c.organization_id = current_staff_org()
        and current_staff_role() = 'owner'
    )
  );
