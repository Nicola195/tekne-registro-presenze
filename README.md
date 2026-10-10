# Registro Ore — Centro Pedagogico TEKNE

Applicazione web per la gestione delle **ore e delle presenze** degli operatori del
Centro Pedagogico TEKNE (Società Cooperativa Sociale). Consente di registrare le ore
lavorate per ciascuna utenza (anche **in contemporanea** / microgruppo), gestire
**assenze** (permessi/ferie), consultare **riepiloghi** mensili e generare **report PDF**
(registro ore, ore per nominativo, riepilogo per famiglia).

> **Versione attuale: STATICA (di test).**
> I dati sono salvati nel **localStorage del browser**: restano sul singolo
> dispositivo/browser e **non sono condivisi** tra più persone. All'avvio sono già
> precaricati i dati **verificati di settembre 2026**. La condivisione tra colleghe,
> con login individuale e database, arriverà con l'integrazione **Supabase** (vedi sotto).

---

## Stack tecnico

- **React 18** + **TypeScript**
- **Vite** (dev server e build)
- **jsPDF** per la generazione dei report PDF
- Nessun backend: persistenza su `localStorage`

---

## Requisiti

- [Node.js](https://nodejs.org/) 18 o superiore (consigliato 20 LTS)
- npm (incluso con Node.js)

---

## Avvio in locale

```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia il server di sviluppo
npm run dev
```

Vite stampa l'indirizzo locale (di norma `http://localhost:5173`). Aprilo nel browser.

### Build di produzione

```bash
npm run build      # genera la cartella dist/
npm run preview    # anteprima locale della build
```

Il contenuto di `dist/` è l'app statica pronta da pubblicare.

---

## Profili di accesso (versione statica)

Nella schermata iniziale si sceglie **"Accedi come"**:

- **Operatore** — registra le proprie ore, consulta Riepilogo ed Estrazioni dei propri dati.
- **Amministrazione** — anagrafiche utenze, operatori e ruoli, associazioni, tariffe;
  consultazione di tutti gli operatori; report per famiglia; sblocco dei giorni non lavorativi.

> In questa versione non esiste una vera autenticazione: la scelta del profilo è solo
> un filtro di comodo. Il login reale per ogni collega arriverà con Supabase.

---

## Deploy su Netlify

Il repository è già pronto per Netlify (vedi `netlify.toml`).

### Opzione A — da GitHub (deploy automatico, consigliata)

1. Esegui il push di questo progetto su un repository GitHub.
2. Su [Netlify](https://app.netlify.com/): **Add new site → Import an existing project**.
3. Collega il repository GitHub.
4. Netlify legge `netlify.toml` e imposta già:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. **Deploy site.** Ad ogni `git push` sul branch principale, Netlify ricompila e pubblica.

### Opzione B — manuale (drag & drop)

1. `npm run build`
2. Trascina la cartella `dist/` nella dashboard di Netlify (**Deploys**).

---

## Versionamento con Git / GitHub

```bash
git init
git add .
git commit -m "Primo commit: Registro Ore TEKNE (versione statica)"
git branch -M main
git remote add origin https://github.com/<utente>/tekne-registro-presenze.git
git push -u origin main
```

> Il file `.gitignore` esclude già `node_modules/`, `dist/` e i file `.env` con le chiavi.

---

## Struttura del progetto

```
tekne-registro-presenze/
├── index.html              # entry HTML
├── package.json
├── vite.config.ts
├── tsconfig.json
├── netlify.toml            # configurazione deploy Netlify
├── .env.example            # modello variabili (per il futuro Supabase)
└── src/
    ├── main.tsx            # mount React
    ├── App.tsx             # shell, profili, routing delle sezioni
    ├── model.ts            # tipi e funzioni di calcolo (ore, festività, riepiloghi)
    ├── store.ts            # PERSISTENZA (localStorage) — unico modulo da sostituire per Supabase
    ├── seed.ts             # anagrafiche iniziali (foglio Excel)
    ├── presenze.ts         # presenze verificate 31/08–30/09/2026
    ├── reports.ts          # costruzione dei tre report PDF
    ├── report-pdf.ts       # motore PDF (jsPDF) + download
    ├── branding.ts         # logo e dati dell'ente
    ├── logo-flat.ts        # logo appiattito per i PDF
    ├── ui.ts               # stili e componenti di base
    └── components/         # viste e dialog (DayView, SummaryView, ReportsView, AdminSettings, …)
```

---

## Migrazione futura a Supabase (login + database condiviso)

La persistenza è **isolata in un solo file**: `src/store.ts`. Per passare dal
localStorage a un database condiviso con autenticazione:

1. Creare un progetto su [Supabase](https://supabase.com/) scegliendo una **region UE**
   (es. *Frankfurt*): i dati riguardano **minori**, devono restare in Europa (GDPR).
2. Impostare le variabili in `.env` (vedi `.env.example`): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` (e le stesse su Netlify).
3. Riscrivere **solo** `src/store.ts` mantenendo la stessa interfaccia pubblica
   (`loadAll`, `readLocal`, `cacheLocal`, `saveBlock`, `saveOperators`, `saveNominativi`,
   `saveUnlocked`, `saveTariffe`, `blockOf`, `errMsg`, `AppData`): il resto dell'app
   non va toccato.
4. Attivare l'autenticazione (login per ogni collega) e le **Row-Level Security policy**
   per limitare l'accesso ai dati.

---

## Privacy

L'applicazione tratta dati di **minori**. In produzione:

- Database in **region UE** (Supabase Frankfurt o equivalente).
- Accesso riservato tramite login individuale e policy di sicurezza.
- I **report per famiglia** non riportano i nomi degli altri bambini né le annotazioni libere.

---

*Centro Pedagogico TEKNE — Società Cooperativa Sociale*
