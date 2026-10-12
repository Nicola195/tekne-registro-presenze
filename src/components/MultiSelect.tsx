import { useState } from 'react';
import { C, S } from '../ui';
import { IconClose } from './Icons';

interface Props {
  options: string[];
  selected: string[];
  onToggle: (name: string) => void;
  placeholder?: string;
  emptyText?: string;
  accent?: string;
  label?: (o: string) => string; // etichetta visualizzata (default: il valore stesso)
}

/** Combolist a selezione multipla: pulsante che apre un pannello con ricerca e caselle. */
export function MultiSelect({ options, selected, onToggle, placeholder = 'Seleziona…', emptyText, accent = C.primary, label }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const lab = (o: string) => (label ? label(o) : o);
  const filtered = options.filter((o) => lab(o).toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ ...S.input, width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, flexWrap: 'wrap' }}
      >
        {selected.length === 0 ? (
          <span style={{ color: C.muted }}>{placeholder}</span>
        ) : (
          selected.map((n) => (
            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: accent, color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 13, fontWeight: 600 }}>
              {lab(n)}
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onToggle(n); }}
                style={{ cursor: 'pointer', fontWeight: 700 }}
              ><IconClose size={12} /></span>
            </span>
          ))
        )}
        <span style={{ marginLeft: 'auto', color: C.muted }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 41, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(3,71,77,0.18)', maxHeight: 260, overflowY: 'auto', padding: 6 }}>
            {options.length > 7 && (
              <input autoFocus style={{ ...S.input, marginBottom: 6 }} placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} onClick={(e) => e.stopPropagation()} />
            )}
            {filtered.map((o) => {
              const on = selected.includes(o);
              return (
                <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', background: on ? C.primarySoft : 'transparent', fontWeight: on ? 700 : 400 }}>
                  <input type="checkbox" checked={on} onChange={() => onToggle(o)} style={{ width: 18, height: 18, accentColor: accent }} />
                  {lab(o)}
                </label>
              );
            })}
            {filtered.length === 0 && <div style={{ ...S.muted, padding: 10 }}>{emptyText || 'Nessun elemento.'}</div>}
          </div>
        </>
      )}
    </div>
  );
}
