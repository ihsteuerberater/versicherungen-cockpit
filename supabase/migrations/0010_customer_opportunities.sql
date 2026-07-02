-- Fix: Kunden durften bislang keine eigenen Opportunities anlegen (weder für
-- Deckungslücken-Sync noch für Lebensereignis-Meldungen) – Policy fehlte.
create policy "customer creates own opportunities" on opportunities
  for insert with check (is_own_customer(customer_id));
