import { useMemo, useState } from 'react';
import {
  Session, Operator, Nominativo, fmtH, isConc, isAssenza, isLavoro, mergeSessions, round2, splitName, dayKind,
} from '../model';
import { C, S } from '../ui';
import { SessionEditor } from './SessionEditor';
import { AbsenceEditor } from './AbsenceEditor';
import { DayList } from './DayList';
import { StatsSection, Separator } from './Stats';
import { PeriodCard, PeriodState, toPeriod } from './PeriodPicker';

interface Props {
  period: PeriodState;
  setPeriod: (p: PeriodState) => void;
  sessions: Session[]; // già filtrate all'operatore
  opId: string;
  nominativi: Nominativo[];
  operators: Operator[];
  onReplace: (removeIds: string[], add: Session[]) => void;
  voci: string[]; // voci di terapia definite dall'amministrazione
  readOnly?: boolean; // amministrazione: sola consultazione
  unlocked: string[];
  isAdmin?: boolean;
  onToggleUnlock?: (iso: string) => void;
}

const sumH = (l: Session[]) => round2(l.reduce((a, s) => a + s.hours, 0));

export function DayView({ period, setPeriod, sessions, opId, nominativi, operators, voci, onReplace, readOnly, unlocked, isAdmin, onToggleUnlock }: Props) {
  const [editing, setEditing] = useState<Session | 'new' | null>(null);
  const [absEditing, setAbsEditing] = useState<Session | 'new' | null>(null);
  const [linkFrom, setLinkFrom] = useState<Session | null>(null);

  const p = toPeriod(period);
  const giorno = period.mode === 'giorno';
  const date = period.day;
  const kind = dayKind(date);
  const nonLav = kind !== 'feriale';
  const sbloccato = unlocked.includes(date);
  const puoInserire = giorno && !readOnly && (!nonLav || sbloccato);

  const inRange = useMemo(() => sessions.filter((s) => s.date >= p.from && s.date <= p.to), [sessions, p.from, p.to]);
  const dayList = useMemo(() => inRange.filter((s) => s.date === date), [inRange, date]);
  const scope = giorno ? dayList : inRange;
  const worked = sumH(scope.filter(isLavoro));
  const concH = sumH(scope.filter((s) => isConc(s)));
  const assH = sumH(scope.filter(isAssenza));

  const doLink = (target: Session) => {
    if (!linkFrom || target.id === linkFrom.id || isAssenza(target)) return;
    const common = Math.min(linkFrom.hours, target.hours);
    const msg =
      linkFrom.hours === target.hours
        ? `Unire in un'unica registrazione contemporanea di ${fmtH(common)}?`
        : `Le ore sono diverse: ${fmtH(common)} diventano contemporanee, l'eccedenza di ${fmtH(Math.abs(linkFrom.hours - target.hours))} resta individuale. Procedere?`;
    if (window.confirm(msg)) onReplace([linkFrom.id, target.id], mergeSessions(linkFrom, target));
    setLinkFrom(null);
  };

  const rowActions = (s: Session) => {
    if (!puoInserire || isAssenza(s) || linkFrom) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {dayList.filter(isLavoro).length > 1 && (
          <button title="Rendi contemporanea a un'altra registrazione" onClick={(e) => { e.stopPropagation(); setLinkFrom(s); }}
            style={{ ...S.btnGhost, padding: '4px 8px', fontSize: 12, color: C.conc }}>⇄</button>
        )}
        {isConc(s) && (
          <button title="Separa un nominativo" onClick={(e) => { e.stopPropagation(); const n = window.prompt(`Separare quale nominativo? (${s.names.join(', ')})`)?.trim().toUpperCase(); if (n && s.names.includes(n)) onReplace([s.id], splitName(s, n)); }}
            style={{ ...S.btnGhost, padding: '4px 8px', fontSize: 12 }}>⤲</button>
        )}
      </div>
    );
  };

  const onRowClick = (s: Session) => {
    if (!giorno || readOnly) return;
    if (linkFrom) return doLink(s);
    if (isAssenza(s)) { if (puoInserire) setAbsEditing(s); return; }
    if (puoInserire) setEditing(s);
  };

  return (
    <div>
      <PeriodCard value={period} onChange={setPeriod} unlocked={unlocked} isAdmin={isAdmin} onToggleUnlock={onToggleUnlock} />

      {giorno && nonLav && (
        <div style={{ ...S.card, marginTop: 12, background: sbloccato ? C.primarySoft : C.dangerSoft, borderColor: sbloccato ? C.primary : '#f1b0ab', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: sbloccato ? C.primaryDark : C.danger }}>
            {sbloccato ? '✓ Giornata sbloccata per lavoro straordinario' : '● Giorno non lavorativo'}
          </span>
          {isAdmin && onToggleUnlock && (
            <button style={{ ...S.btnGhost, padding: '6px 10px', fontSize: 13 }} onClick={() => onToggleUnlock(date)}>{sbloccato ? 'Blocca di nuovo' : 'Sblocca giornata'}</button>
          )}
        </div>
      )}

      {linkFrom && (
        <div style={{ ...S.card, marginTop: 12, background: C.concSoft, borderColor: C.conc, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 14 }}>Tocca la registrazione da rendere <b>contemporanea</b> a <b>{linkFrom.names.join(' + ')}</b> ({fmtH(linkFrom.hours)}).</div>
          <button style={S.btnGhost} onClick={() => setLinkFrom(null)}>Annulla</button>
        </div>
      )}

      {/* Indicatori + pulsanti (sezione condivisa con il Riepilogo) */}
      <StatsSection
        kpi={[['Ore lavorate', worked, C.primary], ['di cui contemporanee', concH, C.conc], ['Assenze', assH, C.muted]]}
        actions={
          puoInserire ? (
            <>
              <button style={{ ...S.btnGhost, fontWeight: 600 }} onClick={() => { setLinkFrom(null); setAbsEditing('new'); }}>Registra assenze</button>
              <button style={S.btn} onClick={() => { setLinkFrom(null); setEditing('new'); }}>Registra ore</button>
            </>
          ) : !giorno ? (
            <div style={{ ...S.muted, fontSize: 13 }}>Per inserire o modificare le ore seleziona <b>Giorno</b> qui sopra, oppure apri il dettaglio di una giornata.</div>
          ) : null
        }
      />

      <Separator label="Dettaglio" />
      <DayList
        sessions={inRange}
        operators={operators}
        singleDate={giorno ? date : undefined}
        onJumpDay={giorno ? undefined : (d) => setPeriod({ ...period, mode: 'giorno', day: d })}
        onEditSession={giorno && !readOnly ? onRowClick : undefined}
        renderActions={giorno ? rowActions : undefined}
        collapsible={!giorno}
        emptyText={giorno ? 'Nessuna registrazione in questo giorno.' : 'Nessuna registrazione nel periodo.'}
      />
      <div style={{ height: 8 }} />

      {editing && puoInserire && (
        <SessionEditor
          date={date}
          initial={editing === 'new' ? undefined : editing}
          opId={opId}
          nominativi={nominativi}
          colleagues={operators.filter((o) => o.id !== opId)}
          voci={voci}
          onClose={() => setEditing(null)}
          onSave={(s) => { onReplace(editing === 'new' ? [] : [editing.id], [s]); setEditing(null); }}
          onDelete={editing === 'new' ? undefined : () => { if (window.confirm('Eliminare questa registrazione?')) { onReplace([editing.id], []); setEditing(null); } }}
        />
      )}
      {absEditing && puoInserire && (
        <AbsenceEditor
          date={date}
          initial={absEditing === 'new' ? undefined : absEditing}
          onClose={() => setAbsEditing(null)}
          onSave={(s) => { onReplace(absEditing === 'new' ? [] : [absEditing.id], [s]); setAbsEditing(null); }}
          onDelete={absEditing === 'new' ? undefined : () => { if (window.confirm('Eliminare questa assenza?')) { onReplace([absEditing.id], []); setAbsEditing(null); } }}
        />
      )}
    </div>
  );
}
