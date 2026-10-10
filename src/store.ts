// Archiviazione dati — VERSIONE STATICA (localStorage del browser).
// È l'UNICO modulo da sostituire per la migrazione a Supabase (auth + Postgres).
// I dati restano sul singolo dispositivo/browser e sopravvivono ai ricaricamenti.
import { Session, Operator, Nominativo, TariffaVoce, DEFAULT_TARIFFE, monthKey, newId, extraFor, minutesBetween, round2, normOperators } from './model';
import { SEED_ENTRIES, SEED_NAMES } from './seed';
import { PRESENZE, PRESENZE_FROM, PRESENZE_TO } from './presenze';

const LS_KEY = 'registro-ore-cache-v2';

export const DEFAULT_OP: Operator = { id: 'op-tatulli', name: 'TATULLI Ilaria', ruolo: 'Educatrice' };

export interface AppData {
  operators: Operator[];
  nominativi: Nominativo[];
  sessions: Session[];
  unlocked: string[]; // giorni non lavorativi sbloccati dall'amministrazione (YYYY-MM-DD)
  tariffe: TariffaVoce[]; // voci di terapia e tariffe orarie (gestite dall'amministrazione)
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Normalizza le tariffe salvate: array valido di {nome, tariffa}, default se mancante/vuoto. */
export function normTariffe(raw: unknown): TariffaVoce[] {
  const arr = (Array.isArray(raw) ? raw : [])
    .filter((t): t is { nome: string; tariffa?: unknown } => !!t && typeof (t as { nome?: unknown }).nome === 'string')
    .map((t) => ({ nome: (t.nome as string).trim(), tariffa: Number(t.tariffa) || 0 }))
    .filter((t) => t.nome);
  return arr.length ? arr : DEFAULT_TARIFFE.map((t) => ({ ...t }));
}

export function cacheLocal(data: AppData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* ignora (es. quota piena o storage non disponibile) */
  }
}

export function readLocal(): AppData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as AppData;
    return Array.isArray(d.operators) && Array.isArray(d.nominativi) && Array.isArray(d.sessions)
      ? { ...d, operators: normOperators(d.operators), unlocked: Array.isArray(d.unlocked) ? d.unlocked : [], tariffe: normTariffe(d.tariffe) }
      : null;
  } catch {
    return null;
  }
}

export const blockKey = (opId: string, mk: string) => `${mk}#${opId}`;
export const blockOf = (s: Session) => blockKey(s.operatorId || DEFAULT_OP.id, monthKey(s.date));

// ---------- Salvataggi ----------
// cacheLocal (chiamato da App.update) è la fonte primaria: scrive l'intero snapshot.
// Le funzioni save* aggiornano lo stesso snapshot, così ogni modifica resta persistita
// anche se arrivasse senza un cacheLocal esplicito. Restano asincrone per compatibilità.
const patch = (fn: (d: AppData) => AppData): Promise<void> => {
  const cur = readLocal();
  if (cur) cacheLocal(fn(cur));
  return Promise.resolve();
};

export const saveOperators = (ops: Operator[]) => patch((d) => ({ ...d, operators: ops }));
export const saveNominativi = (n: Nominativo[]) => patch((d) => ({ ...d, nominativi: n }));
export const saveUnlocked = (days: string[]) => patch((d) => ({ ...d, unlocked: days }));
export const saveTariffe = (t: TariffaVoce[]) => patch((d) => ({ ...d, tariffe: t }));
export const saveBlock = (key: string, list: Session[]) =>
  patch((d) => ({ ...d, sessions: [...d.sessions.filter((s) => blockOf(s) !== key), ...list] }));

// ---------- Dati iniziali (settembre 2026 verificato) ----------

const stamp = (s: Session, opId: string, noms: Nominativo[]): Session => {
  const extra = extraFor(s.names, opId, noms);
  return { ...s, operatorId: opId, extraNames: extra.length ? extra : undefined };
};

/** Registrazioni del foglio presenze (con fasce orarie, contemporaneità e note/terapia). */
export function presenzeSessions(opId: string, noms: Nominativo[]): Session[] {
  const out: Session[] = [];
  Object.entries(PRESENZE).forEach(([date, rows]) =>
    rows.forEach(([start, end, names, att]) =>
      out.push(stamp({ id: newId(), date, start, hours: round2(minutesBetween(start, end) / 60), names: [...names], attivita: att.length ? [...att] : undefined }, opId, noms)),
    ),
  );
  return out;
}

/** Costruisce il dataset iniziale: anagrafiche + presenze verificate 31/08–30/09/2026. */
function buildInitial(): AppData {
  const names = [...SEED_NAMES];
  let sessions: Session[] = [];
  Object.entries(SEED_ENTRIES).forEach(([date, list]) =>
    list.forEach(([name, hours]) => sessions.push({ id: newId(), date, hours, names: [name] })),
  );
  // FALCO è di un'altra collega: non assegnato, le sue ore risultano "extra".
  const nominativi: Nominativo[] = names.map((name) => ({ name, operators: name === 'FALCO' ? [] : [DEFAULT_OP.id] }));
  sessions = sessions.map((s) => stamp(s, DEFAULT_OP.id, nominativi));
  // Sostituisce 31/08–30/09 con le registrazioni dettagliate del foglio presenze (70h verificate).
  const keep = sessions.filter((s) => !(s.operatorId === DEFAULT_OP.id && s.date >= PRESENZE_FROM && s.date <= PRESENZE_TO));
  sessions = [...keep, ...presenzeSessions(DEFAULT_OP.id, nominativi)];
  return { operators: [DEFAULT_OP], nominativi, sessions, unlocked: [], tariffe: DEFAULT_TARIFFE.map((t) => ({ ...t })) };
}

/** Carica i dati: snapshot locale se presente, altrimenti costruisce i dati iniziali verificati. */
export async function loadAll(): Promise<AppData> {
  const cached = readLocal();
  if (cached && cached.operators.length) return cached;
  const data = buildInitial();
  cacheLocal(data);
  return data;
}
