import { useState } from 'react';
import { Operator, Nominativo, nomeCompleto } from '../model';
import { C, S } from '../ui';
import { IconPerson, IconChild, IconGear, IconProps } from './Icons';

export type Ctx = 'operatore' | 'utenza' | 'amministrazione';

/** STEP 1 — scelta della modalità operativa (amministrazione). */
export function ModePicker({ operators, nominativi, onChoose }: {
  operators: Operator[];
  nominativi: Nominativo[];
  onChoose: (ctx: Ctx) => void;
}) {
  const tile = (ctx: Ctx, title: string, sub: string, accent: string, Icon: (p: IconProps) => React.ReactElement) => (
    <button key={ctx} onClick={() => onChoose(ctx)}
      style={{ ...S.card, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', borderLeft: `5px solid ${accent}`, width: '100%' }}>
      <div style={{ width: 44, height: 44, borderRadius: 999, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={22} color="#fff" /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{title}</div>
        <div style={S.muted}>{sub}</div>
      </div>
      <span style={{ color: accent, fontSize: 20, flexShrink: 0 }}>›</span>
    </button>
  );

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ ...S.card, borderTop: `5px solid ${C.yellow}`, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>Come vuoi operare?</div>
        <div style={{ ...S.muted, marginTop: 2 }}>Scegli la modalità. Potrai cambiarla in ogni momento dal pulsante in alto a destra.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {tile('operatore', 'Per operatore', `Presenze, riepilogo ed estrazioni di un operatore · ${operators.length} disponibili`, C.primary, IconPerson)}
        {tile('utenza', 'Per utenza', `Ore e report famiglia di un'utenza · ${nominativi.length} disponibili`, C.conc, IconChild)}
        {tile('amministrazione', 'Amministrazione', 'Anagrafiche (utenze, operatori) e gestione amministrativa', C.primaryDark, IconGear)}
      </div>
    </div>
  );
}

/** STEP 2 — scelta dell'operatore o dell'utenza dalla lista. */
export function ListPicker({ kind, operators, nominativi, onPick, onBack }: {
  kind: 'operatore' | 'utenza';
  operators: Operator[];
  nominativi: Nominativo[];
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState('');
  const accent = kind === 'operatore' ? C.primary : C.conc;
  const title = kind === 'operatore' ? 'Scegli l\'operatore' : 'Scegli l\'utenza';
  const sub = kind === 'operatore'
    ? 'Accedi a presenze, riepilogo ed estrazioni dell\'operatore selezionato.'
    : 'Accedi alle ore (su tutti gli operatori) e al report per la famiglia dell\'utenza selezionata.';

  const items: { id: string; title: string; sub: string; initial: string }[] =
    kind === 'operatore'
      ? [...operators].sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ id: o.id, title: o.name, sub: o.ruolo, initial: o.name.charAt(0).toUpperCase() }))
      : [...nominativi].sort((a, b) => a.name.localeCompare(b.name)).map((n) => ({ id: n.name, title: nomeCompleto(n), sub: n.terapia || 'Terapia non indicata', initial: (n.nome || n.name).charAt(0).toUpperCase() }));
  const shown = items.filter((it) => it.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ ...S.card, borderTop: `5px solid ${accent}` }}>
        <button onClick={onBack} style={{ border: 'none', background: 'transparent', color: C.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 8 }}>‹ Cambia modalità</button>
        <div style={{ fontSize: 19, fontWeight: 800, color: C.primary }}>{title}</div>
        <div style={{ ...S.muted, marginTop: 2 }}>{sub}</div>
        {items.length > 7 && (
          <input autoFocus style={{ ...S.input, marginTop: 10 }} placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {shown.map((it) => (
          <button key={it.id} onClick={() => onPick(it.id)}
            style={{ ...S.card, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', borderLeft: `5px solid ${accent}`, width: '100%' }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{it.initial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
              <div style={{ ...S.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.sub}</div>
            </div>
            <span style={{ color: accent, fontSize: 18, flexShrink: 0 }}>›</span>
          </button>
        ))}
        {items.length === 0 && <div style={{ ...S.card, ...S.muted, textAlign: 'center' }}>{kind === 'operatore' ? 'Nessun operatore presente: aggiungilo dall\'amministrazione.' : 'Nessuna utenza presente: aggiungila dall\'amministrazione.'}</div>}
        {items.length > 0 && shown.length === 0 && <div style={{ ...S.card, ...S.muted, textAlign: 'center' }}>Nessun risultato per «{q}».</div>}
      </div>
    </div>
  );
}
