# Setup Supabase — Registro Ore TEKNE

Guida per attivare **login per collega** e **database condiviso** con accesso
riservato (Row-Level Security). Dati di **minori**: scegliere la region **UE**.

---

## 1. Creare il progetto Supabase

1. Vai su [supabase.com](https://supabase.com/) → **New project**.
2. **Region: Central EU (Frankfurt)** — i dati restano in Europa (GDPR). *Non modificabile dopo.*
3. Imposta una **password del database** robusta e conservala.
4. Attendi il provisioning (1–2 minuti).

---

## 2. Recuperare le chiavi

1. **Project Settings → API**.
2. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. Incolla i due valori:
   - nel file `.env` locale (vedi `.env.example`),
   - su Netlify: **Site settings → Environment variables** (stessi due nomi).

> La chiave **anon public** è pubblica per natura: è sicura nel browser perché i dati
> sono protetti dalle policy RLS. **NON** usare mai la chiave `service_role` nell'app.

---

## 3. Creare le tabelle

1. **SQL Editor → New query**.
2. Incolla il contenuto di [`schema.sql`](./schema.sql) ed esegui (**Run**).
3. Verifica in **Table Editor**: `operators`, `profiles`, `nominativi`, `sessions`, `config`.

---

## 4. Accesso solo su invito (consigliato)

Per dati di minori, niente registrazione libera.

1. **Authentication → Providers → Email**: lascia attivo.
2. **Authentication → Settings**: disattiva **"Allow new users to sign up"**.
3. Gli account si creano per **invito**: **Authentication → Users → Invite user** (email).

---

## 5. Creare la prima Amministrazione

1. Invita la tua email (**Authentication → Users → Invite user**) e completa l'accesso dal link.
2. Copia l'**UUID** del tuo utente da **Authentication → Users**.
3. In **SQL Editor**, promuovi l'account ad amministrazione:

   ```sql
   insert into public.profiles (user_id, is_admin)
   values ('INCOLLA-QUI-UUID', true)
   on conflict (user_id) do update set is_admin = true;
   ```

Al primo accesso dell'Amministrazione, l'app inserirà automaticamente i **dati
verificati di settembre 2026** (operatrice, nominativi, presenze 31/08–30/09).

---

## 6. Aggiungere una collega (operatrice)

1. **Invita** la sua email (passo 4).
2. Copia l'**UUID** del nuovo utente.
3. Collegala all'operatrice già presente nel roster (es. `op-tatulli`):

   ```sql
   insert into public.profiles (user_id, operator_id, is_admin)
   values ('UUID-COLLEGA', 'op-tatulli', false)
   on conflict (user_id) do update set operator_id = excluded.operator_id;
   ```

   L'elenco degli `operator_id` è nella tabella `operators` (Table Editor).

> In seguito possiamo aggiungere all'app una schermata di Amministrazione per gestire
> inviti e collegamenti senza passare dall'SQL.

---

## 7. Collaudo

1. In locale: `npm run dev`, accedi con l'account Amministrazione → compaiono i dati di settembre.
2. Accedi con un account operatrice → vede **solo** le proprie ore.
3. Deploy: `git push` → Netlify ricompila (ricorda le due variabili d'ambiente al passo 2).

---

## Promemoria sicurezza

- Region **UE (Frankfurt)**.
- Accesso **solo su invito**.
- Solo chiave **anon public** nell'app (mai `service_role`).
- Le policy RLS garantiscono: operatrice = solo i propri dati; amministrazione = tutto.
