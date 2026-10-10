import { fmtH, round2 } from '../model';
import { C, S } from '../ui';

/** Contatore ore centrato, a passi di 0,5 h. */
export function HourCounter({ hours, setHours, min = 0.5 }: { hours: number; setHours: (updater: (h: number) => number) => void; min?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <button style={{ ...S.iconBtn, width: 44, height: 44, fontSize: 22 }} onClick={() => setHours((h) => Math.max(min, round2(h - 0.5)))} aria-label="Diminuisci">−</button>
      <div style={{ fontSize: 28, fontWeight: 800, minWidth: 96, textAlign: 'center', color: C.primaryDark }}>{fmtH(hours)}</div>
      <button style={{ ...S.iconBtn, width: 44, height: 44, fontSize: 22 }} onClick={() => setHours((h) => round2(h + 0.5))} aria-label="Aumenta">+</button>
    </div>
  );
}
