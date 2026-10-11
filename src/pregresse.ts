// Promemoria giornate pregresse non registrate.
// Una giornata è "mancante" se: rientra nei giorni lavorati dall'operatore (orario
// settimanale, default Lun–Ven), è nel passato (fino a ieri), non è una festività,
// e non ha ALCUNA registrazione (né ore né assenza). Il controllo parte dalla prima
// registrazione dell'operatore: chi non ha mai registrato non viene segnalato.
import { Session, Operator, parseISO, addDays, todayISO, festaNome, giorniLavorati } from './model';

export function giorniMancanti(sessions: Session[], op: Operator): string[] {
  const own = sessions.filter((s) => s.operatorId === op.id);
  if (!own.length) return [];
  const first = own.reduce((m, s) => (s.date < m ? s.date : m), own[0].date);
  const ieri = addDays(todayISO(), -1);
  if (first > ieri) return [];
  const registrati = new Set(own.map((s) => s.date));
  const giorni = giorniLavorati(op);
  const out: string[] = [];
  for (let d = first; d <= ieri && out.length < 400; d = addDays(d, 1)) {
    if (!giorni.includes(parseISO(d).getDay())) continue;
    if (festaNome(d)) continue;
    if (!registrati.has(d)) out.push(d);
  }
  return out;
}

export interface OpMancanti {
  op: Operator;
  giorni: string[];
}

/** Per ogni operatore, le sue giornate mancanti (solo quelli che ne hanno almeno una). */
export function operatoriConMancanti(sessions: Session[], operators: Operator[]): OpMancanti[] {
  return operators
    .map((op) => ({ op, giorni: giorniMancanti(sessions, op) }))
    .filter((x) => x.giorni.length > 0);
}
