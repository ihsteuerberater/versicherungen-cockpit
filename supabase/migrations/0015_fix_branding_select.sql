-- Fix: Es gab nie eine SELECT-Policy für den "branding"-Bucket. Der Upload mit
-- upsert:true prüft intern per SELECT, ob die Datei schon existiert – ohne
-- Leserecht schlägt das mit einem irreführenden "row-level security"-Fehler
-- fehl, obwohl die eigentliche INSERT-Regel korrekt war. Bucket ist ohnehin
-- öffentlich (Logos/Fotos), daher hier eine offene Leseregel dafür.
create policy "anyone reads branding bucket" on storage.objects
  for select using (bucket_id = 'branding');
