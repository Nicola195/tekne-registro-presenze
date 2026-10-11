import { useState } from 'react';
import { Session, AssenzaTipo, ASSENZE, newId, round2, dayLabelLong } from '../model';
import { C, S, chip, useWide } from '../ui';
import { HourCounter } from './HourCounter';
import { IconClose } from './Icons';

interface Props {
  date: string;
  initial?: Session;
  onSave: (s: Session) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Inserimento di un'assenza (permesso / ferie). */
export function AbsenceEditor({ date, initial, onSave, onDelete, onClose }: Props) {
  const [tipo, setTipo] = useState<AssenzaTipo>(initial?.assenza ?? 'Permesso');
  const [hours, setHours] = useState<number>(initial?.hours ?? 1);
  const [note, setNote] = useState<string>(initial?.note ?? '');
  const wide = useWide();

  const save = () =>
    onSave({ id: initial?.id ?? newId(), date, hours: round2(hours), names: [], assenza: tipo, note: note.trim() || undefined });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(3,71,77,0.45)', zIndex: 50, display: 'flex', alignItems: wide ? 'center' : 'flex-end', justifyContent: 'center', padding: wide ? 24 : 0 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', borderRadius: wide ? 18 : '18px 18px 0 0', padding: '16px 18px 24px', boxSizing: 'border-box', borderTop: `5px solid ${C.yellow}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{initial ? 'Modifica assenza' : 'Registra assenza'}</div>
            <div style={{ ...S.muted, textTransform: 'capitalize' }}>{dayLabelLong(date)}</div>
          </div>
          <button style={{ ...S.iconBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose} aria-label="Chiudi"><IconClose /></button>
        </div>

        <span style={S.label}>Tipo di assenza</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {ASSENZE.map((t) => (
            <button key={t} style={{ ...chip(tipo === t), flex: 1 }} onClick={() => setTipo(t)}>{t === 'Permesso' ? 'Ore di permesso' : 'Ferie'}</button>
          ))}
        </div>

        <span style={{ ...S.label, textAlign: 'center' }}>Ore di {tipo === 'Permesso' ? 'permesso' : 'ferie'}</span>
        <HourCounter hours={hours} setHours={setHours} />

        <span style={S.label}>Note (facoltative)</span>
        <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. visita medica…" />

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {onDelete && <button style={{ ...S.btnGhost, color: C.danger, borderColor: C.dangerSoft }} onClick={onDelete}>Elimina</button>}
          <button style={{ ...S.btn, flex: 1, opacity: hours > 0 ? 1 : 0.5 }} disabled={hours <= 0} onClick={save}>Salva assenza</button>
        </div>
      </div>
    </div>
  );
}
