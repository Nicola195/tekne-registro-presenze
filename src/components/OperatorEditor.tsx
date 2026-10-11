import { useState } from 'react';
import { Operator, Nominativo, Ruolo, RUOLI, newId, nomeCompleto } from '../model';
import { C, S, chip } from '../ui';

interface Props {
  initial?: Operator;        // undefined = nuovo operatore
  operators: Operator[];     // per il controllo nomi duplicati
  nominativi: Nominativo[];  // per le associazioni (utenze seguite)
  onSave: (op: Operator, utenzeSeguite: string[]) => void;
  onClose: () => void;
}

/** Scheda di un operatore: dati, ruolo e utenze seguite (associazioni). */
export function OperatorEditor({ initial, operators, nominativi, onSave, onClose }: Props) {
  const isNew = !initial;
  const id = initial?.id || '';
  const [name, setName] = useState(initial?.name || '');
  const [ruolo, setRuolo] = useState<Ruolo>(initial?.ruolo || 'Educatrice');
  const [assoc, setAssoc] = useState<string[]>(() =>
    initial ? nominativi.filter((n) => n.operators.includes(initial.id)).map((n) => n.name) : [],
  );
  const [filtro, setFiltro] = useState('');

  const nameTrim = name.trim();
  const dup = operators.some((o) => o.id !== id && o.name.trim().toLowerCase() === nameTrim.toLowerCase());
  const valid = !!nameTrim && !dup;

  const toggle = (nome: string) => setAssoc((p) => (p.includes(nome) ? p.filter((x) => x !== nome) : [...p, nome]));

  const save = () => {
    if (!valid) return;
    onSave({ id: id || `op-${newId()}`, name: nameTrim, ruolo }, assoc);
  };

  const noms = [...nominativi]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((n) => nomeCompleto(n).toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(3,71,77,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, width: '100%', maxWidth: 620, borderRadius: 16, padding: '16px 18px 22px', boxSizing: 'border-box', borderTop: `5px solid ${C.yellow}`, margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{isNew ? 'Nuovo operatore' : `Scheda di ${initial?.name}`}</div>
          <button style={S.iconBtn} onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: '14px 0 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Dati dell'operatore</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={{ ...S.label, marginTop: 0 }}>Cognome e nome *</span>
            <input style={{ ...S.input, borderColor: dup ? C.danger : undefined }} value={name} placeholder="Es. ROSSI Maria" onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <span style={{ ...S.label, marginTop: 0 }}>Ruolo</span>
            <select style={S.input} value={ruolo} onChange={(e) => setRuolo(e.target.value as Ruolo)}>
              {RUOLI.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        {dup && <div style={{ color: C.danger, fontSize: 13, marginTop: 6 }}>Esiste già un operatore con questo nome.</div>}

        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: '16px 0 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Utenze seguite</div>
        <div style={{ ...S.muted, marginBottom: 8 }}>
          Seleziona le utenze (bambini e ragazzi) seguite da questo operatore. Le ore registrate su utenze non associate risultano <b>extra</b>.
        </div>
        {nominativi.length > 6 && (
          <input style={{ ...S.input, marginBottom: 8 }} placeholder="Cerca utenza…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {noms.map((n) => (
            <button key={n.name} style={{ ...chip(assoc.includes(n.name)), padding: '6px 11px', fontSize: 13 }} onClick={() => toggle(n.name)}>{nomeCompleto(n)}</button>
          ))}
          {nominativi.length === 0 && <span style={S.muted}>Nessuna utenza presente. Aggiungile prima nella sezione Utenze.</span>}
        </div>
        {assoc.length > 0 && <div style={{ ...S.muted, marginTop: 8 }}>{assoc.length} {assoc.length === 1 ? 'utenza seguita' : 'utenze seguite'}.</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button style={S.btnGhost} onClick={onClose}>Annulla</button>
          <button style={{ ...S.btn, flex: 1, opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={save}>Salva operatore</button>
        </div>
      </div>
    </div>
  );
}
