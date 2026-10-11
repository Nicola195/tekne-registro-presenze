import { useState } from 'react';
import { Operator, Nominativo, nomeCompleto } from '../model';
import { C, S } from '../ui';

export type Ctx = 'operatore' | 'utenza' | 'amministrazione';

interface Props {
  operators: Operator[];
  nominativi: Nominativo[];
  onEnter: (ctx: Ctx, id?: string) => void;
}

/** Pagina di scelta del contesto per l'amministrazione:
 *  operare per un operatore, per un'utenza, oppure accedere all'amministrazione. */
export function ContextPicker({ operators, nominativi, onEnter }: Props) {
  const [qOp, setQOp] = useState('');
  const [qNom, setQNom] = useState('');
  const ops = [...operators].sort((a, b) => a.name.localeCompare(b.name)).filter((o) => o.name.toLowerCase().includes(qOp.toLowerCase()));
  const noms = [...nominativi].sort((a, b) => a.name.localeCompare(b.name)).filter((n) => nomeCompleto(n).toLowerCase().includes(qNom.toLowerCase()));

  const tile = (key: string, title: string, sub: string, accent: string, icon: string, onClick: () => void) => (
    <button key={key} onClick={onClick}
      style={{ ...S.card, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', borderLeft: `5px solid ${accent}`, width: '100%' }}>
      <div style={{ width: 38, height: 38, borderRadius: 999, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ ...S.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
      </div>
      <span style={{ color: accent, fontSize: 18, flexShrink: 0 }}>›</span>
    </button>
  );

  const sectionTitle = (t: string, d: string) => (
    <div style={{ margin: '22px 2px 10px' }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: C.primaryDark }}>{t}</div>
      <div style={S.muted}>{d}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ ...S.card, borderTop: `5px solid ${C.yellow}`, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>Come vuoi operare?</div>
        <div style={{ ...S.muted, marginTop: 2 }}>Scegli il contesto. Potrai cambiarlo in ogni momento dalla card in alto.</div>
      </div>

      {/* Operatore */}
      {sectionTitle('Per operatore', 'Consulta presenze, riepilogo ed estrazioni di uno specifico operatore.')}
      {operators.length > 7 && (
        <input style={{ ...S.input, marginBottom: 8 }} placeholder="Cerca operatore…" value={qOp} onChange={(e) => setQOp(e.target.value)} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ops.map((o) => tile(o.id, o.name, o.ruolo, C.primary, o.name.charAt(0).toUpperCase(), () => onEnter('operatore', o.id)))}
        {operators.length === 0 && <div style={S.muted}>Nessun operatore: aggiungilo dall'amministrazione.</div>}
        {operators.length > 0 && ops.length === 0 && <div style={S.muted}>Nessun operatore trovato.</div>}
      </div>

      {/* Utenza */}
      {sectionTitle('Per utenza', 'Consulta le ore di un bambino/ragazzo su tutti gli operatori e il report per la famiglia.')}
      {nominativi.length > 7 && (
        <input style={{ ...S.input, marginBottom: 8 }} placeholder="Cerca utenza…" value={qNom} onChange={(e) => setQNom(e.target.value)} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {noms.map((n) => tile(n.name, nomeCompleto(n), n.terapia || 'Terapia non indicata', C.conc, (n.nome || n.name).charAt(0).toUpperCase(), () => onEnter('utenza', n.name)))}
        {nominativi.length === 0 && <div style={S.muted}>Nessuna utenza: aggiungila dall'amministrazione.</div>}
        {nominativi.length > 0 && noms.length === 0 && <div style={S.muted}>Nessuna utenza trovata.</div>}
      </div>

      {/* Amministrazione */}
      {sectionTitle('Amministrazione', 'Anagrafiche (utenze e operatori) e gestione amministrativa (terapie, account).')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {tile('admin', 'Entra in amministrazione', 'Configurazione del sistema', C.primaryDark, '⚙', () => onEnter('amministrazione'))}
      </div>
    </div>
  );
}
