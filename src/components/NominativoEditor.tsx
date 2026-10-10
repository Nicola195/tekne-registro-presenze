import { useState } from 'react';
import { Nominativo, nomeCompleto, dateIT } from '../model';
import { C, S } from '../ui';

interface Props {
  initial?: Nominativo;
  esistenti: string[]; // cognomi già presenti (per evitare duplicati sui nuovi)
  onSave: (n: Nominativo) => void;
  onClose: () => void;
}

const field = (label: string, el: React.ReactNode): React.ReactNode => (
  <div>
    <span style={{ ...S.label, marginTop: 0 }}>{label}</span>
    {el}
  </div>
);

/** Scheda anagrafica di un'utenza (bambino/ragazzo). */
export function NominativoEditor({ initial, esistenti, onSave, onClose }: Props) {
  const [f, setF] = useState<Nominativo>(initial || { name: '', operators: [] });
  const set = (patch: Partial<Nominativo>) => setF((p) => ({ ...p, ...patch }));
  const isNew = !initial;
  const nameUp = f.name.trim().toUpperCase();
  const dup = isNew && esistenti.includes(nameUp);
  const valid = !!nameUp && !dup;

  const save = () => {
    if (!valid) return;
    onSave({
      ...f,
      name: nameUp,
      nome: f.nome?.trim() || undefined,
      luogoNascita: f.luogoNascita?.trim() || undefined,
      codiceFiscale: f.codiceFiscale?.trim().toUpperCase() || undefined,
      indirizzo: f.indirizzo?.trim() || undefined,
      terapia: f.terapia?.trim() || undefined,
      genitore1: f.genitore1?.trim() || undefined,
      genitore2: f.genitore2?.trim() || undefined,
      telefono: f.telefono?.trim() || undefined,
      note: f.note?.trim() || undefined,
    });
  };

  const inp = (key: keyof Nominativo, ph = '') => (
    <input style={S.input} value={(f[key] as string) || ''} placeholder={ph} onChange={(e) => set({ [key]: e.target.value } as Partial<Nominativo>)} />
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(3,71,77,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, width: '100%', maxWidth: 620, borderRadius: 16, padding: '16px 18px 22px', boxSizing: 'border-box', borderTop: `5px solid ${C.yellow}`, margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{isNew ? 'Nuova utenza' : `Scheda di ${nomeCompleto(f)}`}</div>
          <button style={S.iconBtn} onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: '14px 0 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Dati dell'utente</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {field('Cognome *', <input style={{ ...S.input, borderColor: dup ? C.danger : undefined }} value={f.name} placeholder="COGNOME" onChange={(e) => set({ name: e.target.value })} disabled={!isNew} />)}
          {field('Nome', inp('nome', 'Nome'))}
          {field('Data di nascita', <input type="date" style={S.input} value={f.dataNascita || ''} onChange={(e) => set({ dataNascita: e.target.value })} />)}
          {field('Luogo di nascita', inp('luogoNascita', 'Città'))}
          {field('Codice fiscale', inp('codiceFiscale'))}
          {field('Telefono', inp('telefono'))}
        </div>
        {field('Indirizzo', inp('indirizzo', 'Via, civico, città'))}
        {field('Tipologia di terapia / motivazione', <textarea style={{ ...S.input, minHeight: 54, resize: 'vertical' }} value={f.terapia || ''} placeholder="Es. terapia logopedica, sostegno all'apprendimento…" onChange={(e) => set({ terapia: e.target.value })} />)}
        {dup && <div style={{ color: C.danger, fontSize: 13, marginTop: 6 }}>Esiste già un'utenza con questo cognome.</div>}

        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: '16px 0 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Genitori / Tutori</div>
        <div style={{ ...S.muted, marginBottom: 6 }}>Compaiono sul riepilogo mensile consegnato alla famiglia.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {field('Genitore / tutore 1', inp('genitore1', 'Cognome e nome'))}
          {field('Genitore / tutore 2', inp('genitore2', 'Cognome e nome'))}
        </div>
        {field('Note', inp('note'))}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button style={S.btnGhost} onClick={onClose}>Annulla</button>
          <button style={{ ...S.btn, flex: 1, opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={save}>Salva scheda</button>
        </div>
        {!isNew && f.dataNascita && <div style={{ ...S.muted, marginTop: 8, textAlign: 'center' }}>Nato/a il {dateIT(f.dataNascita)}</div>}
      </div>
    </div>
  );
}
