import { useMemo } from 'react';
import { Session, Operator, Nominativo, TariffaVoce, fmtH, fmtEuro, importoSessione, round2, inPeriod, isConc, isLavoro, opName } from '../model';
import { C, S } from '../ui';
import { PeriodCard, PeriodState, toPeriod } from './PeriodPicker';
import { StatsSection, Separator } from './Stats';

interface Props {
  period: PeriodState;
  setPeriod: (p: PeriodState) => void;
  sessions: Session[];
  operators: Operator[];
  nominativo: Nominativo;
  tariffe: TariffaVoce[];
  unlocked: string[];
  onGoExport: () => void;
}

const sumH = (l: Session[]) => round2(l.reduce((a, s) => a + s.hours, 0));

/** Riepilogo centrato su una singola utenza: ore su TUTTI gli operatori nel periodo. */
export function UtenzaView({ period, setPeriod, sessions, operators, nominativo, tariffe, unlocked, onGoExport }: Props) {
  const p = toPeriod(period);
  const list = useMemo(
    () => sessions.filter((s) => s.names.includes(nominativo.name) && inPeriod(s, p) && isLavoro(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, p.from, p.to, nominativo.name],
  );
  const importoTot = round2(list.reduce((a, s) => a + importoSessione(s, tariffe), 0));

  const kpi: [string, number, string][] = [
    ['Ore totali', sumH(list), C.primary],
    ['di cui individuali', sumH(list.filter((s) => !isConc(s))), C.primaryDark],
    ['di cui in microgruppo', sumH(list.filter(isConc)), C.conc],
  ];

  const byOp = useMemo(() => {
    const m = new Map<string, { hours: number; days: Set<string> }>();
    for (const s of list) {
      const k = s.operatorId || '';
      const e = m.get(k) || { hours: 0, days: new Set<string>() };
      e.hours = round2(e.hours + s.hours);
      e.days.add(s.date);
      m.set(k, e);
    }
    return [...m.entries()]
      .map(([id, v]) => ({ id, name: opName(operators, id), hours: v.hours, days: v.days.size }))
      .sort((a, b) => b.hours - a.hours);
  }, [list, operators]);

  return (
    <div>
      <PeriodCard value={period} onChange={setPeriod} unlocked={unlocked} />

      {list.length === 0 ? (
        <div style={{ ...S.card, ...S.muted, textAlign: 'center' }}>Nessuna ora registrata per questa utenza nel periodo selezionato.</div>
      ) : (
        <>
          <StatsSection
            kpi={kpi}
            actions={<button style={{ ...S.btn, background: C.yellow, color: C.primaryDark }} onClick={onGoExport}>Vai al report per la famiglia →</button>}
          />
          <div style={{ ...S.card, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderLeft: `5px solid ${C.yellow}`, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Importo del periodo</div>
              <div style={S.muted}>Ore × tariffa della voce di terapia</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.primaryDark }}>{fmtEuro(importoTot)}</div>
          </div>

          <Separator label="Ore per operatore" />
          <div style={S.card}>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Operatore</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Ore</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Giorni</th>
                  </tr>
                </thead>
                <tbody>
                  {byOp.map((r) => (
                    <tr key={r.id}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{r.name}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmtH(r.hours)}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>{r.days}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...S.td, fontWeight: 700 }}>TOTALE</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmtH(sumH(list))}</td>
                    <td style={S.td} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
