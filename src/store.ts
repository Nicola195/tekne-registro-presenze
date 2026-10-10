// Archiviazione dati — VERSIONE SUPABASE (Postgres + Row-Level Security).
// Unico modulo che parla col database: il resto dell'app resta invariato.
// L'interfaccia pubblica è identica alla versione statica
// (AppData, loadAll, saveBlock, saveOperators, saveNominativi, saveUnlocked,
//  saveTariffe, blockOf, errMsg, DEFAULT_OP), così App.tsx non cambia nella logica dati.
import { Session, Operator, Nominativo, TariffaVoce, AssenzaTipo, DEFAULT_TARIFFE, monthKey, addMonths, newId, extraFor, minutesBetween, round2, normOperators } from './model';
import { SEED_ENTRIES, SEED_NAMES } from './seed';
import { PRESENZE, PRESENZE_FROM, PRESENZE_TO } from './presenze';
import { supabase } from './supabase';

export const DEFAULT_OP: Operator = { id: 'op-tatulli', name: 'TATULLI Ilaria', ruolo: 'Educatrice' };

export interface AppData {
  operators: Operator[];
  nominativi: Nominativo[];
  sessions: Session[];
  unlocked: string[]; // giorni non lavorativi sbloccati dall'amministrazione (YYYY-MM-DD)
  tariffe: TariffaVoce[]; // voci di terapia e tariffe orarie (gestite dall'amministrazione)
}

/** Messaggio di errore leggibile da Error nativi o da errori Supabase (oggetti con .message). */
export const errMsg = (e: unknown): string => {
  if (!e) return 'Errore sconosciuto';
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
};

/** Normalizza le tariffe salvate: array valido di {nome, tariffa}, default se mancante/vuoto. */
export function normTariffe(raw: unknown): TariffaVoce[] {
  const arr = (Array.isArray(raw) ? raw : [])
    .filter((t): t is { nome: string; tariffa?: unknown } => !!t && typeof (t as { nome?: unknown }).nome === 'string')
    .map((t) => ({ nome: (t.nome as string).trim(), tariffa: Number(t.tariffa) || 0 }))
    .filter((t) => t.nome);
  return arr.length ? arr : DEFAULT_TARIFFE.map((t) => ({ ...t }));
}

export const blockKey = (opId: string, mk: string) => `${mk}#${opId}`;
export const blockOf = (s: Session) => blockKey(s.operatorId || DEFAULT_OP.id, monthKey(s.date));

// La versione Supabase è la fonte di verità: nessuna cache locale dei dati
// (eviterebbe anche possibili fughe di dati tra utenti diversi sullo stesso browser).
// Le due funzioni restano esportate per compatibilità, ma sono inerti.
export function cacheLocal(_data: AppData) {
  /* no-op nella versione Supabase */
}
export function readLocal(): AppData | null {
  return null;
}

// ---------- Mappatura righe DB (snake_case) <-> modello app (camelCase) ----------

type Row = Record<string, unknown>;

const sessionToRow = (s: Session): Row => ({
  id: s.id,
  date: s.date,
  hours: s.hours,
  names: s.names,
  operator_id: s.operatorId || DEFAULT_OP.id,
  extra_names: s.extraNames ?? null,
  cover_of: s.coverOf ?? null,
  start_time: s.start ?? null,
  attivita: s.attivita ?? null,
  note: s.note ?? null,
  assenza: s.assenza ?? null,
});

const rowToSession = (r: Row): Session => ({
  id: String(r.id),
  date: String(r.date),
  hours: Number(r.hours),
  names: (r.names as string[]) || [],
  operatorId: (r.operator_id as string) || undefined,
  extraNames: (r.extra_names as string[]) || undefined,
  coverOf: (r.cover_of as string) || undefined,
  start: (r.start_time as string) || undefined,
  attivita: (r.attivita as string[]) || undefined,
  note: (r.note as string) || undefined,
  assenza: (r.assenza as AssenzaTipo) || undefined,
});

const nominativoToRow = (n: Nominativo): Row => ({
  name: n.name,
  operators: n.operators || [],
  nome: n.nome ?? null,
  data_nascita: n.dataNascita || null,
  luogo_nascita: n.luogoNascita ?? null,
  codice_fiscale: n.codiceFiscale ?? null,
  indirizzo: n.indirizzo ?? null,
  terapia: n.terapia ?? null,
  genitore1: n.genitore1 ?? null,
  genitore2: n.genitore2 ?? null,
  telefono: n.telefono ?? null,
  note: n.note ?? null,
});

const rowToNominativo = (r: Row): Nominativo => ({
  name: String(r.name),
  operators: (r.operators as string[]) || [],
  nome: (r.nome as string) || undefined,
  dataNascita: (r.data_nascita as string) || undefined,
  luogoNascita: (r.luogo_nascita as string) || undefined,
  codiceFiscale: (r.codice_fiscale as string) || undefined,
  indirizzo: (r.indirizzo as string) || undefined,
  terapia: (r.terapia as string) || undefined,
  genitore1: (r.genitore1 as string) || undefined,
  genitore2: (r.genitore2 as string) || undefined,
  telefono: (r.telefono as string) || undefined,
  note: (r.note as string) || undefined,
});

const operatorToRow = (o: Operator): Row => ({ id: o.id, name: o.name, ruolo: o.ruolo });

// ---------- Salvataggi ----------

/** Rimpiazza l'intero contenuto di una tabella piccola (operators/nominativi):
 *  aggiorna i presenti e cancella SOLO quelli non più nell'elenco. */
async function replaceAll(table: string, idCol: string, rows: Row[]): Promise<void> {
  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows);
    if (error) throw error;
  }
  const ids = rows.map((r) => String(r[idCol]).replace(/"/g, ''));
  let del = supabase.from(table).delete();
  del = ids.length ? del.not(idCol, 'in', `(${ids.map((v) => `"${v}"`).join(',')})`) : del.not(idCol, 'is', null);
  const { error } = await del;
  if (error) throw error;
}

export const saveOperators = (ops: Operator[]) => replaceAll('operators', 'id', ops.map(operatorToRow));
export const saveNominativi = (n: Nominativo[]) => replaceAll('nominativi', 'name', n.map(nominativoToRow));

export const saveUnlocked = async (days: string[]) => {
  const { error } = await supabase.from('config').upsert({ key: 'giorni-sbloccati', value: days });
  if (error) throw error;
};
export const saveTariffe = async (t: TariffaVoce[]) => {
  const { error } = await supabase.from('config').upsert({ key: 'tariffe-voci', value: t });
  if (error) throw error;
};

/** Sostituisce il blocco (mese + operatrice): aggiorna le registrazioni presenti
 *  e cancella quelle dello stesso mese/operatrice non più nell'elenco. */
export const saveBlock = async (key: string, list: Session[]) => {
  const hash = key.indexOf('#');
  const mk = key.slice(0, hash);
  const opId = key.slice(hash + 1);
  const rows = list.map(sessionToRow);
  if (rows.length) {
    const { error } = await supabase.from('sessions').upsert(rows);
    if (error) throw error;
  }
  const nextMonth = `${addMonths(mk, 1)}-01`;
  const ids = list.map((s) => s.id);
  let del = supabase.from('sessions').delete().eq('operator_id', opId).gte('date', `${mk}-01`).lt('date', nextMonth);
  if (ids.length) del = del.not('id', 'in', `(${ids.map((id) => `"${id}"`).join(',')})`);
  const { error } = await del;
  if (error) throw error;
};

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
  const keep = sessions.filter((s) => !(s.operatorId === DEFAULT_OP.id && s.date >= PRESENZE_FROM && s.date <= PRESENZE_TO));
  sessions = [...keep, ...presenzeSessions(DEFAULT_OP.id, nominativi)];
  return { operators: [DEFAULT_OP], nominativi, sessions, unlocked: [], tariffe: DEFAULT_TARIFFE.map((t) => ({ ...t })) };
}

/** Se il database è vuoto, inserisce i dati verificati di settembre 2026.
 *  Eseguito solo dall'amministrazione (le policy RLS consentono la scrittura). */
async function seedIfEmpty(): Promise<void> {
  const { data, error } = await supabase.from('operators').select('id').limit(1);
  if (error) throw error;
  if (data && data.length) return; // già popolato
  const init = buildInitial();
  const r1 = await supabase.from('operators').upsert(init.operators.map(operatorToRow));
  if (r1.error) throw r1.error;
  const r2 = await supabase.from('nominativi').upsert(init.nominativi.map(nominativoToRow));
  if (r2.error) throw r2.error;
  const rows = init.sessions.map(sessionToRow);
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const r = await supabase.from('sessions').insert(chunk);
    if (r.error) throw r.error;
  }
  const r3 = await supabase.from('config').upsert([
    { key: 'tariffe-voci', value: init.tariffe },
    { key: 'giorni-sbloccati', value: init.unlocked },
  ]);
  if (r3.error) throw r3.error;
}

/** Carica tutti i dati visibili all'utente corrente (le policy RLS filtrano le sessioni). */
export async function loadAll(ctx: { isAdmin: boolean }): Promise<AppData> {
  if (ctx.isAdmin) await seedIfEmpty();
  const [opsRes, nomRes, sesRes, cfgRes] = await Promise.all([
    supabase.from('operators').select('*'),
    supabase.from('nominativi').select('*'),
    supabase.from('sessions').select('*'),
    supabase.from('config').select('*'),
  ]);
  const err = opsRes.error || nomRes.error || sesRes.error || cfgRes.error;
  if (err) throw err;
  const operators = normOperators((opsRes.data || []).map((o) => ({ id: o.id, name: o.name, ruolo: o.ruolo })));
  const nominativi = (nomRes.data || []).map(rowToNominativo);
  const sessions = (sesRes.data || []).map(rowToSession);
  const cfg = Object.fromEntries((cfgRes.data || []).map((r) => [r.key as string, r.value]));
  const unlocked = Array.isArray(cfg['giorni-sbloccati']) ? (cfg['giorni-sbloccati'] as string[]) : [];
  const tariffe = normTariffe(cfg['tariffe-voci']);
  return { operators, nominativi, sessions, unlocked, tariffe };
}
