import { useMemo, useState } from 'react';
import { Session, Operator, TariffaVoce, fmtH, fmtEuro, importoSessione, perName, round2, inPeriod, isConc, isAssenza, isLavoro } from '../model';
import { C, S } from '../ui';
import { PeriodCard, PeriodState, seg, toPeriod } from './PeriodPicker';
import { DayList } from './DayList';
import { StatsSection, Separator } from './Stats';

interface Props {
  period: PeriodState;
  setPeriod: (p: PeriodState) => void;
  sessions: Session[];
  operators: Operator[];
  viewOp: Operator;      // operatore del contesto (sempre presente)
  isAdmin?: boolean;
  tariffe: TariffaVoce[];
  onOpenDay: (d: string) => void;
  onGoExport: () => void;
  unlocked: string[];
}

const sumH = (l: Session[]) => round2(l.reduce((a, s) => a + s.hours, 0));

export function SummaryView({ period, setPeriod, sessions, operators, viewOp, isAdmin, tariffe, onOpenDay, onGoExport, unlocked }: Props) {
  const [tab, setTab] = useState<'giorni' | 'nomi'>('giorni');
  const p = toPeriod(period);

  const ms = useMemo(() => sessions.filter((s) => inPeriod(s, p) && s.operatorId === viewOp.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, p.from, p.to, viewOp.id]);
  const lavoro = ms.filter(isLavoro);
  const byName = useMemo(() => perName(lavoro, []).sort((a, b) => a.name.localeCompare(b.name)), [lavoro]);
  const billed = round2(byName.reduce((a, r) => a + r.hours, 0));
  const importoTot = round2(lavoro.reduce((a, s) => a + importoSessione(s, tariffe), 0));

  const kpi: [string, number, string][] = [
    ['Ore lavorate', sumH(lavoro), C.primary],
    ['di cui in contemporanea', sumH(lavoro.filter(isConc)), C.conc],
    ['di cui extra / coperture', sumH(lavoro.filter((s) => s.extraNames?.length)), C.extra],
    ['Assenze', sumH(ms.filter(isAssenza)), C.muted],
  ];

  return (
    <div>
      <PeriodCard value={period} onChange={setPeriod} unlocked={unlocked} />

      <StatsSection
        kpi={kpi}
        actions={<button style={{ ...S.btn, background: C.yellow, color: C.primaryDark }} onClick={onGoExport}>Vai alle estrazioni →</button>}
      />
      {isAdmin && (
        <div style={{ ...S.card, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderLeft: `5px solid ${C.yellow}`, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700 }}>Importo del periodo</div>
            <div style={S.muted}>Ore lavorate × tariffa della voce di terapia · solo amministrazione</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.primaryDark }}>{fmtEuro(importoTot)}</div>
        </div>
      )}

      <Separator label="Dettaglio" />
      <div style={{ display: 'flex', background: '#ebede4', borderRadius: 10, padding: 3, marginBottom: 12, maxWidth: 420 }}>
        <button style={seg(tab === 'giorni')} onClick={() => setTab('giorni')}>Per giorno</button>
        <button style={seg(tab === 'nomi')} onClick={() => setTab('nomi')}>Per nominativo</button>
      </div>

      {tab === 'giorni' && (
        <DayList sessions={ms} operators={operators} onJumpDay={onOpenDay} collapsible emptyText="Nessuna registrazione nel periodo." />
      )}

      {tab === 'nomi' && (
        <div style={S.card}>
          {byName.length === 0 ? (
            <div style={S.muted}>Nessuna ora nel periodo.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Nominativo</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Totale</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Individuali</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Contemp.</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Extra</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Giorni</th>
                  </tr>
                </thead>
                <tbody>
                  {byName.map((r) => (
                    <tr key={r.name}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{r.name}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmtH(r.hours)}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>{r.indivHours ? fmtH(r.indivHours) : '—'}</td>
                      <td style={{ ...S.td, textAlign: 'right', color: r.concHours ? C.conc : C.muted }}>{r.concHours ? fmtH(r.concHours) : '—'}</td>
                      <td style={{ ...S.td, textAlign: 'right', color: r.extraHours ? C.extra : C.muted }}>{r.extraHours ? fmtH(r.extraHours) : '—'}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>{r.days}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...S.td, fontWeight: 700 }}>TOTALE</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmtH(billed)}</td>
                    <td style={S.td} colSpan={4} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
