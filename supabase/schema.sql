-- =====================================================================
-- Registro Ore TEKNE — Schema Supabase (Postgres) + Row-Level Security
-- ---------------------------------------------------------------------
-- Eseguire UNA SOLA VOLTA nel SQL Editor di Supabase.
-- Region consigliata del progetto: EU — Frankfurt (dati di minori, GDPR).
-- Lo script è idempotente: puo' essere rieseguito senza errori.
-- =====================================================================

-- ---------- Tabelle ----------

-- Operatori: il "roster" gestito dall'amministrazione.
create table if not exists public.operators (
  id    text primary key,              -- id stabile (es. 'op-tatulli'), usato in sessions.operator_id
  name  text not null,
  ruolo text not null default 'Educatrice',
  giorni int[]                          -- giorni lavorati (0=Dom..6=Sab); null = default Lun–Ven
);

-- Se la tabella operators esisteva già da una versione precedente, aggiunge la colonna.
alter table public.operators add column if not exists giorni int[];

-- Profili: collega un utente autenticato (auth.users) a un operatore + ruolo.
-- Un profilo con is_admin = true e' Amministrazione (vede tutto, gestisce le anagrafiche).
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  operator_id text references public.operators(id) on delete set null,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Utenze seguite (anagrafica dei minori).
create table if not exists public.nominativi (
  name           text primary key,     -- COGNOME: identificativo usato nelle registrazioni
  operators      text[] not null default '{}',
  nome           text,
  data_nascita   date,
  luogo_nascita  text,
  codice_fiscale text,
  indirizzo      text,
  terapia        text,
  genitore1      text,
  genitore2      text,
  telefono       text,
  note           text
);

-- Registrazioni: ore lavorate oppure assenze (permesso/ferie).
create table if not exists public.sessions (
  id          text primary key,
  date        date not null,
  hours       numeric not null,
  names       text[] not null default '{}',
  operator_id text not null references public.operators(id) on delete cascade,
  extra_names text[],
  cover_of    text,
  start_time  text,                     -- HH:MM (facoltativo: fascia oraria)
  attivita    text[],
  note        text,
  assenza     text                      -- 'Permesso' | 'Ferie' | null
);
create index if not exists sessions_operator_idx on public.sessions(operator_id);
create index if not exists sessions_date_idx     on public.sessions(date);

-- Configurazione (giorni sbloccati, tariffe): coppie chiave/valore JSON.
create table if not exists public.config (
  key   text primary key,
  value jsonb not null
);

-- ---------- Funzioni di supporto (SECURITY DEFINER: evitano la ricorsione RLS) ----------

-- L'utente corrente e' amministrazione?
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where user_id = auth.uid()), false);
$$;

-- id dell'operatore collegato all'utente corrente (null per l'amministrazione).
create or replace function public.my_operator_id()
returns text
language sql stable security definer
set search_path = public
as $$
  select operator_id from public.profiles where user_id = auth.uid();
$$;

-- ---------- Row-Level Security ----------

alter table public.operators  enable row level security;
alter table public.profiles   enable row level security;
alter table public.nominativi enable row level security;
alter table public.sessions   enable row level security;
alter table public.config     enable row level security;

-- profiles: ognuno vede il proprio profilo; l'amministrazione li vede e gestisce tutti.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- operators: lettura a tutti gli autenticati; scrittura solo amministrazione.
drop policy if exists operators_select on public.operators;
create policy operators_select on public.operators for select
  to authenticated using (true);
drop policy if exists operators_admin_write on public.operators;
create policy operators_admin_write on public.operators for all
  using (public.is_admin()) with check (public.is_admin());

-- nominativi: lettura a tutti gli autenticati; scrittura solo amministrazione.
drop policy if exists nominativi_select on public.nominativi;
create policy nominativi_select on public.nominativi for select
  to authenticated using (true);
drop policy if exists nominativi_admin_write on public.nominativi;
create policy nominativi_admin_write on public.nominativi for all
  using (public.is_admin()) with check (public.is_admin());

-- sessions: l'operatore vede/scrive SOLO le proprie; l'amministrazione tutto.
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select
  using (public.is_admin() or operator_id = public.my_operator_id());
drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions for insert
  with check (public.is_admin() or operator_id = public.my_operator_id());
drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions for update
  using (public.is_admin() or operator_id = public.my_operator_id())
  with check (public.is_admin() or operator_id = public.my_operator_id());
drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions for delete
  using (public.is_admin() or operator_id = public.my_operator_id());

-- config: lettura a tutti gli autenticati; scrittura solo amministrazione.
drop policy if exists config_select on public.config;
create policy config_select on public.config for select
  to authenticated using (true);
drop policy if exists config_admin_write on public.config;
create policy config_admin_write on public.config for all
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- NOTE
-- - Un nuovo utente senza riga in "profiles" puo' leggere operatori,
--   nominativi e config, ma NON vede alcuna sessione e non puo' scrivere.
--   L'amministrazione deve creargli il profilo (vedi SETUP.md).
-- - I dati iniziali verificati (settembre 2026) vengono inseriti dall'app
--   al primo accesso dell'amministrazione su database vuoto.
-- =====================================================================
