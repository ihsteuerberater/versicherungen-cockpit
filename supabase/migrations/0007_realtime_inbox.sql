-- Live-Benachrichtigungen im Cockpit: neue Anfragen/Chancen sollen sofort
-- sichtbar sein, ohne dass der Berater manuell neu laden muss.
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table opportunities;
