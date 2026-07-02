-- Dokumenten-Upload für Kunden (z.B. Fotos/PDFs zu einem Schaden). Anders als
-- der "branding"-Bucket ist dieser NICHT öffentlich – Zugriff nur über
-- signierte, zeitlich begrenzte Links, da die Inhalte sensibel sein können.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Pfad-Konvention: documents/{customer_id}/{policy_id}/...
create policy "customer uploads own documents" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and exists (
      select 1 from customers c
      where c.id::text = (storage.foldername(name))[1]
        and c.customer_user_id = auth.uid()
    )
  );

create policy "customer reads own documents" on storage.objects
  for select using (
    bucket_id = 'documents'
    and exists (
      select 1 from customers c
      where c.id::text = (storage.foldername(name))[1]
        and c.customer_user_id = auth.uid()
    )
  );

create policy "staff reads accessible documents" on storage.objects
  for select using (
    bucket_id = 'documents'
    and exists (
      select 1 from customers c
      where c.id::text = (storage.foldername(name))[1]
        and can_access_customer(c.id)
    )
  );

create policy "staff uploads accessible documents" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and exists (
      select 1 from customers c
      where c.id::text = (storage.foldername(name))[1]
        and can_access_customer(c.id)
    )
  );

-- Kunde darf eigene Dokument-Einträge (Datenbank-Zeile, nicht nur Storage-Datei) anlegen.
create policy "customer creates own documents" on documents
  for insert with check (is_own_customer(customer_id));
