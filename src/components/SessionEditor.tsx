import { useState } from 'react';
import type React from 'react';
import { Session, Operator, Nominativo, newId, fmtH, endTime, round2, dayLabelLong, pad } from '../model';
import { C, S, chip, badge, useWide } from '../ui';
import { HourCounter } from './HourCounter';
import { MultiSelect } from './MultiSelect';
import { IconClose } from './Icons';

interface Props {
  date: string;
  initial?: Session;
  opId: string;
  nominativi: Nominativo[];
  colleagues: Operator[];
  voci: string[]; // voci di terapia definite dall'amministrazione (le uniche selezionabili)
  onSave: (s: Session) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Intestazione di sezione interna alla dialog. */
const SecLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 12, fontWeight: 800, color: C.primary, textTransform: 'uppercase', letterSpacing: 0.4, margin: '18px 0 8px' }}>{children}</div>
);

export function SessionEditor({ date, initial, opId, nominativi, colleagues, voci, onSave, onDelete, onClose }: Props) {
  const [hours, setHours] = useState<number>(initial?.hours ?? 1);
  const [sel, setSel] = useState<string[]>(initial?.names ?? []);
  const [start, setStart] = useState<string>(initial?.start ?? '');
  const [startH, startM] = start ? start.split(':') : ['', ''];
  const [note, setNote] = useState<string>(initial?.note ?? '');
  const [att, setAtt] = useState<string[]>(initial?.attivita ?? []);
  const [cover, setCover] = useState<string>(initial?.coverOf ?? '');
  const wide = useWide();

  const vociDisp = Array.from(new Set([...voci, ...att]));
  const toggleAtt = (v: string) => setAtt((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  const conc = sel.length > 1;
  const assigned = nominativi.filter((n) => n.operators.includes(opId)).map((n) => n.name);
  // altri nominativi (di colleghe o non assegnati), inclusi eventuali nomi già presenti nella sessione
  const others = Array.from(new Set([...nominativi.map((n) => n.name), ...sel])).filter((n) => !assigned.includes(n));
  const extraSel = sel.filter((n) => !assigned.includes(n));

  const toggle = (n: string) => {
    const adding = !sel.includes(n);
    setSel((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
    if (adding && !assigned.includes(n) && !cover) {
      const owners = (nominativi.find((x) => x.name === n)?.operators || []).filter((o) => o !== opId && colleagues.some((c) => c.id === o));
      if (owners.length === 1) setCover(owners[0]);
    }
  };
  const valid = hours > 0 && sel.length > 0;

  const save = () => {
    if (!valid) return;
    onSave({
      id: initial?.id ?? newId(),
      date,
      hours: round2(hours),
      names: sel,
      coverOf: extraSel.length ? cover || undefined : undefined,
      start: start || undefined,
      attivita: att.length ? att : undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(3,71,77,0.45)', zIndex: 50, display: 'flex', alignItems: wide ? 'center' : 'flex-end', justifyContent: 'center', padding: wide ? 24 : 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.bg, width: '100%', maxWidth: wide ? 680 : 600, maxHeight: wide ? '90vh' : '94vh', overflowY: 'auto', borderRadius: wide ? 18 : '18px 18px 0 0', padding: '16px 18px 24px', boxSizing: 'border-box', borderTop: `5px solid ${C.yellow}` }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{initial ? 'Modifica ore lavorate' : 'Registra ore lavorate'}</div>
            <div style={{ ...S.muted, textTransform: 'capitalize' }}>{dayLabelLong(date)}</div>
          </div>
          <button style={{ ...S.iconBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose} aria-label="Chiudi"><IconClose /></button>
        </div>

        {/* Fascia oraria (sx) + Ore lavorate (dx) affiancate */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <span style={{ ...S.label, marginTop: 8 }}>Fascia oraria (facoltativa)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select style={{ ...S.input, width: 'auto' }} value={startH} onChange={(e) => setStart(e.target.value ? `${e.target.value}:${startM || '00'}` : '')}>
                <option value="">Ora —</option>
                {Array.from({ length: 24 }, (_, i) => pad(i)).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span style={{ fontWeight: 700 }}>:</span>
              <select style={{ ...S.input, width: 'auto' }} value={startM} disabled={!startH} onChange={(e) => startH && setStart(`${startH}:${e.target.value}`)}>
                {['00', '30'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            {start && <div style={{ marginTop: 6, fontSize: 13 }}>Fine: <b>{endTime(start, hours)}</b> · <button style={{ ...S.btnGhost, padding: '2px 8px', fontSize: 12 }} onClick={() => setStart('')}>Rimuovi</button></div>}
          </div>
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <span style={{ ...S.label, marginTop: 8, textAlign: 'center' }}>Ore lavorate{conc ? ' (contemp.)' : ''}</span>
            <HourCounter hours={hours} setHours={setHours} />
          </div>
        </div>

        {/* Nominativi */}
        <SecLabel>Nominativi</SecLabel>
        {sel.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <span style={badge(conc)}>{conc ? `In contemporanea (${sel.length})` : 'Individuale'}</span>
          </div>
        )}
        <div style={{ ...S.muted, marginBottom: 6 }}>
          Seleziona più nominativi se le ore sono state svolte in contemporanea: ognuno matura {fmtH(hours)}, ma nel registro contano una volta sola.
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>I miei nominativi</span>
        <div style={{ marginTop: 4 }}>
          <MultiSelect
            options={assigned}
            selected={sel.filter((n) => assigned.includes(n))}
            onToggle={toggle}
            placeholder={assigned.length ? 'Seleziona i nominativi…' : 'Nessun nominativo assegnato'}
            emptyText="Nessun nominativo assegnato: chiedi all'amministrazione di assegnarli."
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginTop: 10 }}>Altri nominativi (ore extra / coperture)</span>
        <div style={{ marginTop: 4 }}>
          <MultiSelect
            options={others}
            selected={extraSel}
            onToggle={toggle}
            placeholder="Aggiungi altri nominativi…"
            emptyText="Nessun altro nominativo."
            accent={C.extra}
          />
        </div>
        {extraSel.length > 0 && (
          <div style={{ ...S.card, background: C.extraSoft, borderColor: C.extraBorder, marginTop: 10, marginBottom: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Ore extra per: {extraSel.join(', ')}</div>
            <span style={{ ...S.label, marginTop: 8 }}>In copertura di (facoltativo)</span>
            <select style={S.input} value={cover} onChange={(e) => setCover(e.target.value)}>
              <option value="">Nessuna collega – solo ore extra</option>
              {colleagues.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tipo di intervento */}
        <SecLabel>Tipo di intervento</SecLabel>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {vociDisp.map((v) => (
            <button key={v} style={chip(att.includes(v))} onClick={() => toggleAtt(v)}>{v}</button>
          ))}
          {vociDisp.length === 0 && <span style={S.muted}>Nessuna voce definita: l'amministrazione deve configurarle in Impostazioni → Tariffe.</span>}
        </div>

        {/* Note */}
        <SecLabel>Annotazioni</SecLabel>
        <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note facoltative (es. recupero, uscita anticipata…)" />

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {onDelete && (
            <button style={{ ...S.btnGhost, color: C.danger, borderColor: C.dangerSoft }} onClick={onDelete}>Elimina</button>
          )}
          <button style={{ ...S.btn, flex: 1, opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={save}>
            Salva{sel.length > 1 ? ` (${sel.length} in contemporanea)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
