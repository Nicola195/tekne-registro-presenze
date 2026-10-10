import type React from 'react';
import { Operator, Nominativo, Period, addDays, addMonths, dateIT, dayLabelLong, daysOfMonth, monthKey, monthLabel, todayISO, dayKind, motivoNonLavorativo, isNonLavorativo } from '../model';
import { C, S } from '../ui';

export type PeriodMode = 'giorno' | 'mese' | 'periodo';
export interface PeriodState {
  mode: PeriodMode;
  day: string;
  month: string;
  from: string;
  to: string;
}

export const initialPeriod = (): PeriodState => {
  const t = todayISO();
  return { mode: 'mese', day: t, month: monthKey(t), from: monthKey(t) + '-01', to: t };
};

export function toPeriod(p: PeriodState): Period {
  if (p.mode === 'giorno')
    return { from: p.day, to: p.day, label: dayLabelLong(p.day), fileLabel: p.day, mese: dateIT(p.day) };
  if (p.mode === 'periodo' && p.from && p.to && p.from <= p.to) {
    const same = monthKey(p.from) === monthKey(p.to);
    const ddmm = (iso: string) => dateIT(iso).slice(0, 5);
    return {
      from: p.from, to: p.to, label: `dal ${dateIT(p.from)} al ${dateIT(p.to)}`, fileLabel: `${p.from} - ${p.to}`,
      mese: same ? monthLabel(monthKey(p.from)) : `${monthLabel(monthKey(p.to))} (dal ${ddmm(p.from)} al ${ddmm(p.to)})`,
    };
  }
  const d = daysOfMonth(p.month);
  return { from: d[0], to: d[d.length - 1], label: monthLabel(p.month), fileLabel: monthLabel(p.month), mese: monthLabel(p.month) };
}

export const seg = (active: boolean, accent = C.primary): React.CSSProperties => ({
  flex: 1, border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  background: active ? '#fff' : 'transparent', color: active ? accent : C.muted, boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
});

const MODES: [PeriodMode, string][] = [['giorno', 'Giorno'], ['mese', 'Mese'], ['periodo', 'Periodo']];

/** Selettore del periodo: Giorno / Mese / Periodo personalizzato, con navigazione rapida. */
export function PeriodPicker({ value, onChange, unlocked = [], isAdmin, onToggleUnlock }: {
  value: PeriodState;
  onChange: (p: PeriodState) => void;
  unlocked?: string[];
  isAdmin?: boolean;
  onToggleUnlock?: (iso: string) => void;
}) {
  const set = (patch: Partial<PeriodState>) => onChange({ ...value, ...patch });
  const switchMode = (mode: PeriodMode) => {
    // passando da un livello all'altro si resta sullo stesso mese/giorno
    if (mode === 'mese' && value.mode === 'giorno') return set({ mode, month: monthKey(value.day) });
    if (mode === 'giorno' && value.mode === 'mese' && monthKey(value.day) !== value.month) return set({ mode, day: `${value.month}-01` });
    set({ mode });
  };
  const today = todayISO();
  const nonLav = value.mode === 'giorno' && dayKind(value.day) !== 'feriale';
  const sbloccato = unlocked.includes(value.day);

  return (
    <div>
      <div style={{ display: 'flex', background: '#ebede4', borderRadius: 10, padding: 3 }}>
        {MODES.map(([m, l]) => (
          <button key={m} style={seg(value.mode === m)} onClick={() => switchMode(m)}>{l}</button>
        ))}
      </div>

      {value.mode !== 'periodo' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <button style={S.iconBtn} aria-label="Precedente"
            onClick={() => (value.mode === 'giorno' ? set({ day: addDays(value.day, -1) }) : set({ month: addMonths(value.month, -1) }))}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: nonLav && !sbloccato ? C.danger : C.text }}>
              {value.mode === 'giorno' ? dayLabelLong(value.day) : monthLabel(value.month)}
            </div>
            {value.mode === 'giorno' ? (
              <input type="date" value={value.day} onChange={(e) => e.target.value && set({ day: e.target.value })}
                style={{ border: 'none', background: 'transparent', color: C.primary, fontSize: 14, textAlign: 'center' }} />
            ) : (
              <input type="month" value={value.month} onChange={(e) => e.target.value && set({ month: e.target.value })}
                style={{ border: 'none', background: 'transparent', color: C.primary, fontSize: 14, textAlign: 'center' }} />
            )}
          </div>
          <button style={S.iconBtn} aria-label="Successivo"
            onClick={() => (value.mode === 'giorno' ? set({ day: addDays(value.day, 1) }) : set({ month: addMonths(value.month, 1) }))}>›</button>
        </div>
      )}
      {value.mode === 'giorno' && value.day !== today && (
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <button style={{ ...S.btnGhost, padding: '5px 12px', fontSize: 13 }} onClick={() => set({ day: today })}>Oggi</button>
        </div>
      )}

      {value.mode === 'periodo' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.label, marginTop: 0 }}>Dal</span>
              <input type="date" style={S.input} value={value.from} onChange={(e) => set({ from: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.label, marginTop: 0 }}>Al</span>
              <input type="date" style={S.input} value={value.to} onChange={(e) => set({ to: e.target.value })} />
            </div>
          </div>
          {value.from > value.to && <div style={{ color: C.danger, fontSize: 13, marginTop: 6 }}>La data iniziale è successiva a quella finale: viene usato il mese selezionato.</div>}
        </>
      )}
    </div>
  );
}

/** Card condivisa del selettore periodo: stessa in Inserisci, Riepilogo, Estrazioni e Giornate. */
export function PeriodCard(props: {
  value: PeriodState;
  onChange: (p: PeriodState) => void;
  unlocked?: string[];
  isAdmin?: boolean;
  onToggleUnlock?: (iso: string) => void;
}) {
  return (
    <div style={{ ...S.card }}>
      <PeriodPicker {...props} />
    </div>
  );
}

/** Combolist pulita per la scelta dell'operatore (amministrazione). */
export function OperatorSelect({ operators, value, onChange, label = 'Operatore' }: {
  operators: Operator[];
  value?: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 700, color: C.primaryDark, whiteSpace: 'nowrap' }}>{label}</span>
      {operators.length ? (
        <select style={{ ...S.input, flex: 1, minWidth: 220 }} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Seleziona —</option>
          {operators.map((o) => (
            <option key={o.id} value={o.id}>{o.name} · {o.ruolo}</option>
          ))}
        </select>
      ) : (
        <span style={S.muted}>Nessun operatore: aggiungilo da Impostazioni.</span>
      )}
    </div>
  );
}

/** Card condivisa dell'operatore: selezione a sinistra (combolist per l'amministrazione,
 * nome fisso per l'operatore), ruolo e utenze associate a destra. Usata in Inserisci, Riepilogo ed Estrazioni. */
export function OperatorCard({ operators, viewOp, nominativi, isAdmin, setViewOp }: {
  operators: Operator[];
  viewOp?: Operator;
  nominativi: Nominativo[];
  isAdmin?: boolean;
  setViewOp?: (id: string) => void;
}) {
  const nUtenze = viewOp ? nominativi.filter((n) => n.operators.includes(viewOp.id)).length : 0;
  return (
    <div style={{ ...S.card, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', borderLeft: `5px solid ${C.primary}` }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <span style={{ ...S.label, marginTop: 0 }}>Operatore</span>
        {isAdmin && setViewOp ? (
          <select style={S.input} value={viewOp?.id || ''} onChange={(e) => setViewOp(e.target.value)}>
            <option value="">— Seleziona —</option>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        ) : (
          <div style={{ fontWeight: 700, fontSize: 18 }}>{viewOp?.name}</div>
        )}
      </div>
      {viewOp && (
        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: C.primaryDark }}>{viewOp.ruolo}</div>
          <div style={S.muted}>{nUtenze} utenze associate</div>
        </div>
      )}
    </div>
  );
}
