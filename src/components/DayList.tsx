import type React from 'react';
import { useState } from 'react';
import {
  Session, Operator, dateIT, weekday, fmtH, isConc, isAssenza, fascia, attivitaLabel, round2, sortSessions, weekStart, addDays, dayKind,
} from '../model';
import { describeExtra } from '../reports';
import { C, S } from '../ui';

const sumH = (l: Session[]) => round2(l.reduce((a, s) => a + s.hours, 0));

export interface DayGroup { date: string; list: Session[]; total: number; }
export interface WeekGroup { start: string; total: number; days: DayGroup[] }

/** Raggruppa le sessioni in settimane (lun-dom) → giorni, in ordine cronologico. */
export function buildWeeks(sessions: Session[], onlyDate?: string): WeekGroup[] {
  const dates = Array.from(new Set(sessions.map((s) => s.date))).sort();
  const list = onlyDate ? [onlyDate] : dates;
  const weeks: WeekGroup[] = [];
  list.forEach((date) => {
    const day: DayGroup = { date, list: sortSessions(sessions.filter((s) => s.date === date)), total: sumH(sessions.filter((s) => s.date === date)) };
    const ws = weekStart(date);
    const last = weeks[weeks.length - 1];
    if (last && last.start === ws) last.days.push(day);
    else weeks.push({ start: ws, total: 0, days: [day] });
  });
  weeks.forEach((w) => (w.total = round2(w.days.reduce((a, d) => a + d.total, 0))));
  return weeks;
}

/** Divide le sessioni di un giorno per fascia oraria. */
function byFascia(list: Session[]) {
  const groups: { label: string; items: Session[] }[] = [];
  sortSessions(list).forEach((s) => {
    const label = s.start ? fascia(s) : 'Senza fascia oraria';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(s);
    else groups.push({ label, items: [s] });
  });
  return groups;
}

/** Riga-sessione semplice (non card annidata): Tipo · Nominativo · Terapia, ore a destra.
 * Le righe in contemporanea sono evidenziate in arancione (senza etichetta "Contemp."). */
function SessionRow({ s, operators, onClick, actions }: {
  s: Session;
  operators: Operator[];
  onClick?: () => void;
  actions?: React.ReactNode;
}) {
  const conc = isConc(s);
  const ass = isAssenza(s);
  // Etichetta a sinistra: per il lavoro mostra il tipo di intervento (Terapia, Microgruppo, …); per l'assenza "Assenza".
  const left = ass ? 'Assenza' : attivitaLabel(s);
  const leftColor = ass ? C.muted : conc ? C.conc : C.primary;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
        background: ass ? '#eef1f4' : conc ? C.concSoft : 'transparent',
        borderLeft: `4px solid ${conc ? C.conc : 'transparent'}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ flex: '0 0 108px', fontSize: 11, fontWeight: 700, color: leftColor, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.2 }}>{left}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {ass ? (
          <span style={{ fontWeight: 700 }}>{s.assenza}</span>
        ) : (
          <>
            <span style={{ fontWeight: 700 }}>{s.names.join(' + ')}</span>
            {s.extraNames?.length ? <div style={{ fontSize: 12, color: C.extra }}>↺ {describeExtra(s, operators)}</div> : null}
          </>
        )}
        {s.note && <div style={{ ...S.muted, fontSize: 12 }}>📝 {s.note}</div>}
      </div>
      {actions}
      {actions && <span style={{ color: C.border }}>|</span>}
      <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{fmtH(s.hours)}</span>
    </div>
  );
}

interface Props {
  sessions: Session[]; // già filtrate all'operatore e al periodo
  operators: Operator[];
  singleDate?: string; // se presente mostra solo questo giorno (anche vuoto)
  onJumpDay?: (date: string) => void; // apri il dettaglio del singolo giorno
  onEditSession?: (s: Session) => void;
  renderActions?: (s: Session) => React.ReactNode;
  collapsible?: boolean; // giorni/settimane collassabili (viste mese/periodo)
  emptyText?: string;
}

/** Elenco condiviso giorni/sessioni usato da Inserisci e Riepilogo. */
export function DayList({ sessions, operators, singleDate, onJumpDay, onEditSession, renderActions, collapsible, emptyText }: Props) {
  const weeks = buildWeeks(sessions, singleDate);
  const multiWeek = !singleDate && weeks.length > 1;
  const canCollapse = !!collapsible && !singleDate;
  // Accordion: una sola settimana aperta per volta; dentro la settimana più giorni aperti. Tutto chiuso di default.
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const toggleWeek = (k: string) => {
    setOpenWeek((cur) => (cur === k ? null : k));
    setOpenDays({}); // aprendo un'altra settimana, i giorni ripartono chiusi
  };
  const toggleDay = (k: string) => setOpenDays((m) => ({ ...m, [k]: !m[k] }));

  if (!weeks.length || (singleDate && weeks[0].days[0].list.length === 0)) {
    return <div style={{ ...S.card, textAlign: 'center', color: C.muted, padding: 24 }}>{emptyText || 'Nessuna registrazione.'}</div>;
  }

  const dayCard = (d: DayGroup) => {
    const festivo = dayKind(d.date) !== 'feriale';
    const dOpen = canCollapse ? !!openDays[d.date] : true;
    return (
      <div key={d.date} style={{ ...S.card, marginBottom: 0, padding: 0, overflow: 'hidden', borderLeft: `5px solid ${festivo ? C.danger : C.primary}` }}>
        <div
          onClick={canCollapse ? () => toggleDay(d.date) : undefined}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: festivo ? '#fdf3f2' : '#f6f8f3', cursor: canCollapse ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {canCollapse && <span style={{ color: festivo ? C.danger : C.primary, fontSize: 12, width: 12 }}>{dOpen ? '▾' : '▸'}</span>}
            <span style={{ fontWeight: 700, color: festivo ? C.danger : C.text, textTransform: 'capitalize' }}>{weekday(d.date)} {dateIT(d.date)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onJumpDay && (!canCollapse || dOpen) && (
              <button onClick={(e) => { e.stopPropagation(); onJumpDay(d.date); }} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 12, color: C.primary }}>Dettaglio giorno ›</button>
            )}
            <span style={{ fontWeight: 700, fontSize: 17, color: C.primary }}>{fmtH(d.total)}</span>
          </div>
        </div>
        {dOpen && (
          <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.list.length === 0 && <div style={{ ...S.muted, textAlign: 'center', padding: 6 }}>Nessuna registrazione in questo giorno.</div>}
            {byFascia(d.list).map((g) => (
              <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingBottom: 2, borderBottom: `1px dashed ${C.border}` }}>
                  <span>🕒</span>{g.label}
                </div>
                {g.items.map((s) => (
                  <SessionRow key={s.id} s={s} operators={operators} onClick={onEditSession ? () => onEditSession(s) : undefined} actions={renderActions?.(s)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {weeks.map((w) => {
        const wOpen = !multiWeek || !canCollapse || openWeek === w.start;
        return (
          <div key={w.start} style={{ marginBottom: multiWeek ? 10 : 0 }}>
            {multiWeek && (
              <div
                onClick={canCollapse ? () => toggleWeek(w.start) : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.primarySoft, borderRadius: 10, padding: '8px 12px', margin: '6px 0 10px', cursor: canCollapse ? 'pointer' : 'default' }}
              >
                {canCollapse && <span style={{ color: C.primary, fontSize: 12, width: 12 }}>{wOpen ? '▾' : '▸'}</span>}
                <span style={{ fontWeight: 800, color: C.primaryDark, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Settimana {dateIT(w.start).slice(0, 5)} – {dateIT(addDays(w.start, 6)).slice(0, 5)}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: C.muted }}>{w.days.length} gg</span>
                <span style={{ fontWeight: 800, color: C.primary }}>{fmtH(w.total)}</span>
              </div>
            )}
            {wOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{w.days.map(dayCard)}</div>}
          </div>
        );
      })}
    </div>
  );
}
