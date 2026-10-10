// Modello dati e funzioni di calcolo

/**
 * Una "sessione" è un blocco di ore lavorate in un giorno.
 * - 1 nominativo  => ora individuale
 * - 2+ nominativi => ore svolte IN CONTEMPORANEA: ogni nominativo matura le ore intere
 *   (fatturazione), ma per il registro della lavoratrice le ore contano una sola volta.
 */
export type Ruolo = 'Educatrice' | 'Educatore' | 'Psicologa' | 'Psicologo';
export const RUOLI: Ruolo[] = ['Educatrice', 'Educatore', 'Psicologa', 'Psicologo'];

export interface Operator {
  id: string;
  name: string;
  ruolo: Ruolo;
}

/** Normalizza le operatrici salvate da versioni precedenti (che non avevano il ruolo). */
export const normOperators = (raw: unknown): Operator[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((o): o is { id: string; name: string; ruolo?: string } => !!o && typeof o.id === 'string' && typeof o.name === 'string')
    .map((o) => ({ id: o.id, name: o.name, ruolo: (RUOLI as string[]).includes(o.ruolo || '') ? (o.ruolo as Ruolo) : 'Educatrice' }));

/** Utenza (bambino/ragazzo seguito) con anagrafica estesa e operatrici associate. */
export interface Nominativo {
  name: string; // COGNOME - identificativo usato nelle registrazioni
  operators: string[];
  nome?: string; // nome di battesimo
  dataNascita?: string; // YYYY-MM-DD
  luogoNascita?: string;
  codiceFiscale?: string;
  indirizzo?: string;
  terapia?: string; // tipologia di terapia / motivazione della presa in carico
  genitore1?: string; // nominativo genitore/tutor (compare sul riepilogo famiglia)
  genitore2?: string;
  telefono?: string;
  note?: string;
}

export const nomeCompleto = (n?: Nominativo) => (n ? [n.name, n.nome].filter(Boolean).join(' ') : '');
export const genitoriLabel = (n?: Nominativo) => (n ? [n.genitore1, n.genitore2].filter(Boolean).join(' · ') : '');

export type AssenzaTipo = 'Permesso' | 'Ferie';
export const ASSENZE: AssenzaTipo[] = ['Permesso', 'Ferie'];

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  names: string[];
  operatorId?: string; // operatrice che ha svolto le ore
  extraNames?: string[]; // nominativi NON assegnati all'operatrice => ore extra / copertura
  coverOf?: string; // id dell'operatrice sostituita (copertura assenza)
  start?: string; // HH:MM (facoltativo - fascia oraria)
  attivita?: string[]; // NOTE/terapia: voci predefinite o inserite a mano
  note?: string;
  assenza?: AssenzaTipo; // se presente, è un'assenza (permesso/ferie): nessun nominativo
}

/** true per le ore effettivamente lavorate con le utenze (non assenze). */
export const isLavoro = (s: Session) => !s.assenza;
export const isAssenza = (s: Session) => !!s.assenza;

/** Voci predefinite della colonna NOTE/terapia (usate come default iniziale delle tariffe). */
export const ATTIVITA = ['Microgruppo', 'Terapia', 'Apprendimento', 'Consolidamento', 'Autonomia'];
/** Normalizza voci di versioni precedenti (es. "Autonomia - AUT" -> "Autonomia"). */
export const normVoce = (v: string) => (v.trim().toLowerCase() === 'autonomia - aut' ? 'Autonomia' : v);
export const attivitaLabel = (s: Session) => (s.attivita || []).join(' / ');

/** Voce di terapia con la relativa tariffa oraria (definita dall'amministrazione). */
export interface TariffaVoce {
  nome: string;
  tariffa: number; // €/ora
}

export const DEFAULT_TARIFFE: TariffaVoce[] = ATTIVITA.map((nome) => ({ nome, tariffa: 0 }));

export const fmtEuro = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Tariffa oraria di una voce (0 se non definita). */
export const tariffaDi = (voce: string, tariffe: TariffaVoce[]) => tariffe.find((t) => t.nome === voce)?.tariffa || 0;

/** Importo di una sessione: ore × tariffa della sua voce di terapia (la prima, se più di una). */
export function importoSessione(s: Session, tariffe: TariffaVoce[]): number {
  if (isAssenza(s)) return 0;
  const voce = (s.attivita || [])[0];
  return voce ? round2(s.hours * tariffaDi(voce, tariffe)) : 0;
}

/** Periodo di estrazione: un mese o un intervallo personalizzato (es. 31/08-30/09). */
export interface Period {
  from: string;
  to: string;
  label: string; // per i titoli
  fileLabel: string; // per i nomi file
  mese: string; // per l'intestazione dei report (es. "Settembre 2026")
}
export const inPeriod = (s: Session, p: Period) => s.date >= p.from && s.date <= p.to;
export const daysBetween = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
};
/** Lunedì della settimana a cui appartiene la data. */
export const weekStart = (iso: string) => addDays(iso, -((parseISO(iso).getDay() + 6) % 7));

// ---------- Festività e giorni non lavorativi ----------

/** Domenica di Pasqua (algoritmo di Meeus/Butcher) per l'anno dato. */
function easter(y: number): string {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${pad(month)}-${pad(day)}`;
}

/** Festività nazionali italiane fisse (mese-giorno). */
const FESTE_FISSE = ['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26'];
const festeCache: Record<number, Set<string>> = {};
function festeAnno(y: number): Set<string> {
  if (!festeCache[y]) {
    const s = new Set(FESTE_FISSE.map((f) => `${y}-${f}`));
    s.add(easter(y)); // Pasqua
    s.add(addDays(easter(y), 1)); // Lunedì dell'Angelo
    festeCache[y] = s;
  }
  return festeCache[y];
}

/** Nome della festività, se la data è festiva (esclusi sabati/domeniche). */
export function festaNome(iso: string): string | null {
  const y = Number(iso.slice(0, 4));
  if (!festeAnno(y).has(iso)) return null;
  const NAMES: Record<string, string> = {
    '01-01': 'Capodanno', '01-06': 'Epifania', '04-25': 'Festa della Liberazione', '05-01': 'Festa del Lavoro',
    '06-02': 'Festa della Repubblica', '08-15': 'Ferragosto', '11-01': 'Ognissanti', '12-08': 'Immacolata',
    '12-25': 'Natale', '12-26': 'Santo Stefano',
  };
  const md = iso.slice(5);
  if (NAMES[md]) return NAMES[md];
  if (iso === easter(y)) return 'Pasqua';
  if (iso === addDays(easter(y), 1)) return "Lunedì dell'Angelo";
  return 'Festività';
}

export type DayKind = 'feriale' | 'sabato' | 'domenica' | 'festivo';
export function dayKind(iso: string): DayKind {
  if (festaNome(iso)) return 'festivo';
  const g = parseISO(iso).getDay();
  return g === 0 ? 'domenica' : g === 6 ? 'sabato' : 'feriale';
}
/** Giorno non lavorativo di default (weekend o festivo), salvo sblocco dell'amministrazione. */
export const isNonLavorativo = (iso: string, unlocked: string[] = []) => dayKind(iso) !== 'feriale' && !unlocked.includes(iso);
export const motivoNonLavorativo = (iso: string): string => {
  const f = festaNome(iso);
  if (f) return f;
  const g = parseISO(iso).getDay();
  return g === 0 ? 'Domenica' : g === 6 ? 'Sabato' : '';
};
export const minutesBetween = (a: string, b: string) => {
  const f = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return f(b) - f(a);
};

export const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
export const GIORNI_LUNGHI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
export const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const todayISO = () => toISO(new Date());
export const monthKey = (date: string) => date.slice(0, 7);
export const addDays = (iso: string, n: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const addMonths = (mk: string, n: number) => {
  const [y, m] = mk.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const daysOfMonth = (mk: string): string[] => {
  const [y, m] = mk.split('-').map(Number);
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${mk}-${pad(i + 1)}`);
};
export const monthLabel = (mk: string) => {
  const [y, m] = mk.split('-').map(Number);
  return `${MESI[m - 1]} ${y}`;
};
export const weekday = (iso: string) => GIORNI[parseISO(iso).getDay()];
export const isWeekend = (iso: string) => {
  const g = parseISO(iso).getDay();
  return g === 0 || g === 6;
};
export const dayLabelLong = (iso: string) => {
  const d = parseISO(iso);
  return `${GIORNI_LUNGHI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
};
export const dateIT = (iso: string) => {
  const d = parseISO(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const fmtH = (h: number) => `${h.toLocaleString('it-IT', { maximumFractionDigits: 2 })} h`;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export const endTime = (start: string, hours: number) => {
  const [hh, mm] = start.split(':').map(Number);
  const tot = hh * 60 + mm + Math.round(hours * 60);
  return `${pad(Math.floor(tot / 60) % 24)}:${pad(tot % 60)}`;
};
export const fascia = (s: Session) => (s.start ? `${s.start}-${endTime(s.start, s.hours)}` : '');

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const isConc = (s: Session) => s.names.length > 1;

export const sortSessions = (list: Session[]) =>
  [...list].sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99') || a.names.join().localeCompare(b.names.join()));

// ---------- Riepiloghi ----------

export interface NameSummary {
  name: string;
  hours: number;
  indivHours: number;
  concHours: number;
  extraHours: number;
  days: number;
  byDay: Record<string, number>;
}

export function perName(sessions: Session[], allNames: string[]): NameSummary[] {
  const map = new Map<string, NameSummary>();
  const get = (name: string) => {
    let s = map.get(name);
    if (!s) {
      s = { name, hours: 0, indivHours: 0, concHours: 0, extraHours: 0, days: 0, byDay: {} };
      map.set(name, s);
    }
    return s;
  };
  allNames.forEach(get);
  for (const s of sessions) {
    for (const n of s.names) {
      const r = get(n);
      r.hours = round2(r.hours + s.hours);
      if (isConc(s)) r.concHours = round2(r.concHours + s.hours);
      else r.indivHours = round2(r.indivHours + s.hours);
      if (s.extraNames?.includes(n)) r.extraHours = round2(r.extraHours + s.hours);
      r.byDay[s.date] = round2((r.byDay[s.date] || 0) + s.hours);
    }
  }
  for (const r of map.values()) r.days = Object.keys(r.byDay).length;
  return [...map.values()];
}

export interface DaySummary {
  date: string;
  total: number; // ore effettivamente lavorate (contemporanee contate una volta)
  indivHours: number;
  concHours: number;
  billed: number; // somma ore attribuite ai nominativi
  indiv: Session[];
  conc: Session[];
}

export function perDay(sessions: Session[], days: string[]): DaySummary[] {
  return days.map((date) => {
    const day = sortSessions(sessions.filter((s) => s.date === date));
    const indiv = day.filter((s) => !isConc(s));
    const conc = day.filter(isConc);
    const indivHours = round2(indiv.reduce((a, s) => a + s.hours, 0));
    const concHours = round2(conc.reduce((a, s) => a + s.hours, 0));
    const billed = round2(day.reduce((a, s) => a + s.hours * s.names.length, 0));
    return { date, total: round2(indivHours + concHours), indivHours, concHours, billed, indiv, conc };
  });
}

/**
 * Rende contemporanee due sessioni dello stesso giorno.
 * La parte comune (ore minime) diventa una sessione con tutti i nominativi;
 * l'eventuale eccedenza della sessione più lunga resta individuale.
 */
export function mergeSessions(a: Session, b: Session): Session[] {
  const h = Math.min(a.hours, b.hours);
  const names = Array.from(new Set([...a.names, ...b.names]));
  const start = a.start || b.start;
  const note = [a.note, b.note].filter(Boolean).join(' · ') || undefined;
  const att = Array.from(new Set([...(a.attivita || []), ...(b.attivita || [])]));
  const attivita = att.length ? att : undefined;
  const merged: Session = { id: newId(), date: a.date, hours: h, names, start, note, attivita, operatorId: a.operatorId, coverOf: a.coverOf || b.coverOf };
  const out = [merged];
  const longer = a.hours > b.hours ? a : b.hours > a.hours ? b : null;
  if (longer) {
    out.push({
      id: newId(),
      date: a.date,
      hours: round2(longer.hours - h),
      names: [...longer.names],
      operatorId: longer.operatorId,
      coverOf: longer.coverOf,
      attivita: longer.attivita,
      start: start ? endTime(start, h) : undefined,
    });
  }
  return out;
}

/** Stacca un nominativo da una sessione contemporanea, lasciandolo come ora individuale. */
export function splitName(s: Session, name: string): Session[] {
  const rest = s.names.filter((n) => n !== name);
  if (rest.length === 0) return [s];
  return [
    { ...s, names: rest },
    { id: newId(), date: s.date, hours: s.hours, names: [name], start: s.start, note: s.note, attivita: s.attivita, operatorId: s.operatorId, coverOf: s.coverOf },
  ];
}

// ---------- Multi-operatrice ----------

export const opName = (ops: Operator[], id?: string) =>
  ops.find((o) => o.id === id)?.name || (id ? '(operatrice non più presente)' : '');

/** Nominativi della sessione che NON sono assegnati all'operatrice (ore extra / copertura). */
export const extraFor = (names: string[], opId: string, noms: Nominativo[]) =>
  names.filter((n) => !noms.find((x) => x.name === n)?.operators.includes(opId));
