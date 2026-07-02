-- Neuer Policenstatus für pausierte Verträge (z.B. Auslandaufenthalt,
-- Militärdienst), unterscheidbar von einer echten Kündigung.
alter type policy_status add value 'sistiert';
