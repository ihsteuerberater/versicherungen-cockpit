-- Core schema for the Versicherungs-Cockpit (Berater-Cockpit first module).
-- Every tenant-scoped table carries organization_id and is protected by RLS
-- so isolation is enforced by Postgres itself, not just application code.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenants & Vermittler identity
-- ---------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text unique,
  logo_url text,
  primary_color text,
  created_at timestamptz not null default now()
);

-- Versioned Vermittler-Identität pro Organisation (z.B. BVS -> eigene FINMA-Nr.).
-- valid_until = null bedeutet "aktuell gültig".
create table vermittler_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  display_name text not null,
  finma_nr text,
  liability_insurance_info text,
  commission_notes text,
  valid_from date not null,
  valid_until date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Staff (Berater / Mitarbeitende)
-- ---------------------------------------------------------------------------

create type staff_role as enum ('owner', 'mitarbeiter');
create type staff_access_level as enum ('assigned_only', 'full');

-- id == auth.users.id (1:1 mit Supabase Auth)
create table staff_users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  role staff_role not null default 'mitarbeiter',
  access_level staff_access_level not null default 'assigned_only',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Customers, persons, policies
-- ---------------------------------------------------------------------------

create type customer_kind as enum ('person', 'haushalt', 'firma');

create table customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  kind customer_kind not null default 'person',
  display_name text not null,
  assigned_staff_id uuid references staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table persons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_date date,
  household_role text, -- z.B. 'hauptperson', 'partner', 'kind'
  created_at timestamptz not null default now()
);

create type policy_status as enum ('active', 'cancelled', 'expired');

create table policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  sparte text not null, -- Sach, KV, MFZ, Vorsorge, 3a, 3b, PK, ...
  insurer_name text not null,
  insurer_logo_url text,
  policy_number text,
  start_date date,
  end_date date,
  cancellation_period text, -- Freitext, z.B. "3 Monate zum Ablauf"
  cancellation_right_annual boolean not null default false,
  status policy_status not null default 'active',
  created_at timestamptz not null default now()
);

create table premiums (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  policy_id uuid not null references policies(id) on delete cascade,
  amount numeric(12, 2) not null,
  due_date date not null,
  paid boolean not null default false,
  effective_from date not null default current_date,
  created_at timestamptz not null default now()
);

create type claim_status as enum ('gemeldet', 'in_bearbeitung', 'reguliert', 'abgelehnt');

create table claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  policy_id uuid not null references policies(id) on delete cascade,
  status claim_status not null default 'gemeldet',
  description text,
  reported_at date not null default current_date,
  created_at timestamptz not null default now()
);

create type document_source as enum ('manual', 'uploaded', 'ai_extracted');

create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  policy_id uuid references policies(id) on delete cascade,
  claim_id uuid references claims(id) on delete cascade,
  file_path text not null, -- Pfad im Supabase Storage Bucket
  source document_source not null default 'manual',
  created_at timestamptz not null default now()
);

create type request_status as enum ('open', 'answered');

create table requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  kind text not null, -- 'schaden', 'frage', 'lebensereignis', 'dokument'
  message text,
  status request_status not null default 'open',
  created_at timestamptz not null default now()
);

create type opportunity_status as enum ('open', 'contacted', 'closed');

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  kind text not null, -- 'deckungsluecke', 'lebensereignis'
  note text,
  status opportunity_status not null default 'open',
  created_at timestamptz not null default now()
);

create table courtage_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  policy_id uuid not null references policies(id) on delete cascade,
  premium_id uuid references premiums(id) on delete set null,
  amount numeric(12, 2),
  rate numeric(6, 3),
  period text,
  created_at timestamptz not null default now()
);
