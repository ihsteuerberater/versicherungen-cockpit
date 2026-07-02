-- Zahlungsrhythmus pro Police, damit das Cockpit beim Erfassen einer neuen
-- Prämie automatisch Betrag und nächstes Fälligkeitsdatum vorschlagen kann
-- (z.B. monatliche 3a-Einzahlungen), statt jedes Mal manuell einzutippen.
alter table policies add column payment_frequency text
  check (payment_frequency in ('monatlich', 'vierteljaehrlich', 'halbjaehrlich', 'jaehrlich'));
