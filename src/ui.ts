import type React from 'react';
import { useEffect, useState } from 'react';

/** Palette ricavata dal logo TEKNE: verde petrolio, giallo, arancio su fondo crema. */
export const C = {
  bg: '#f6f7f1',
  card: '#ffffff',
  text: '#1d2b2d',
  muted: '#62736f',
  border: '#e3e6dc',
  primary: '#045e66', // verde petrolio (logo)
  primaryDark: '#03474d',
  primarySoft: '#e2eff0',
  yellow: '#fabe35', // giallo (logo)
  yellowSoft: '#fff5d6',
  conc: '#e2741b', // arancio (logo) - ore in contemporanea
  concSoft: '#fdeedf',
  extra: '#8a6100', // ore extra / coperture (giallo scuro)
  extraSoft: '#fff5d6',
  extraBorder: '#fabe35',
  danger: '#b42318',
  dangerSoft: '#fdecea',
};

/** true su schermi ampi (tablet orizzontale / desktop). */
export function useWide(min = 900) {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth >= min : false);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const on = () => setWide(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min]);
  return wide;
}

/** Griglia responsive: le schede si dispongono su più colonne quando c'è spazio. */
export const grid = (min: number, gap = 12): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`,
  gap,
  alignItems: 'start',
});

export const S: Record<string, React.CSSProperties> = {
  card: {
    background: C.card,
    borderRadius: 14,
    border: `1px solid ${C.border}`,
    padding: 14,
    marginBottom: 12,
  },
  btn: {
    border: 'none',
    borderRadius: 10,
    padding: '11px 16px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    background: C.primary,
    color: '#fff',
  },
  btnGhost: {
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '9px 12px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    background: '#fff',
    color: C.text,
  },
  iconBtn: {
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    width: 40,
    height: 40,
    fontSize: 18,
    cursor: 'pointer',
    background: '#fff',
    color: C.text,
  },
  input: {
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 16,
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    color: C.text,
  },
  label: { fontSize: 13, fontWeight: 600, color: C.muted, margin: '14px 0 6px', display: 'block' },
  h2: { fontSize: 17, fontWeight: 700, margin: '0 0 10px' },
  muted: { color: C.muted, fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '8px 6px', borderBottom: `2px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 700 },
  td: { padding: '8px 6px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'top' },
};

export const chip = (active: boolean, conc = false): React.CSSProperties => ({
  border: `1px solid ${active ? (conc ? C.conc : C.primary) : C.border}`,
  background: active ? (conc ? C.conc : C.primary) : '#fff',
  color: active ? '#fff' : C.text,
  borderRadius: 999,
  padding: '8px 12px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
});

export const badge = (conc: boolean): React.CSSProperties => ({
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: 999,
  background: conc ? C.concSoft : C.primarySoft,
  color: conc ? C.conc : C.primary,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
});
