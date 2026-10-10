import type React from 'react';
import { fmtH } from '../model';
import { C, S, grid } from '../ui';

/** Separatore di sezione con etichetta (condiviso tra Inserisci e Riepilogo). */
export function Separator({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px' }}>
      <div style={{ height: 2, width: 20, background: C.yellow, borderRadius: 2 }} />
      <div style={{ fontWeight: 700, color: C.primary, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

/**
 * Sezione condivisa Indicatori: separatore + riquadri KPI + (sotto) i pulsanti d'azione.
 * Usata da Inserisci (Aggiungi ore / Assenza) e da Riepilogo (Vai alle estrazioni).
 */
export function StatsSection({ kpi, actions }: { kpi: [string, number, string][]; actions?: React.ReactNode }) {
  return (
    <>
      <Separator label="Indicatori del periodo" />
      <div style={grid(160, 8)}>
        {kpi.map(([l, v, col]) => (
          <div key={l} style={{ ...S.card, marginBottom: 0, padding: 12, textAlign: 'center', borderTop: `4px solid ${col}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: col }}>{fmtH(v)}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{l}</div>
          </div>
        ))}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, justifyContent: 'flex-end' }}>{actions}</div>}
    </>
  );
}
