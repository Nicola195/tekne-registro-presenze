import { dayLabelLong } from '../model';
import { OpMancanti } from '../pregresse';
import { C, S } from '../ui';
import { IconBell, IconClose } from './Icons';

/** Campanella nell'header: rossa con contatore se ci sono notifiche, bianca se nessuna. */
export function BellButton({ count, onClick }: { count: number; onClick: () => void }) {
  const on = count > 0;
  return (
    <button onClick={onClick} title={on ? `${count} ${count === 1 ? 'notifica' : 'notifiche'}` : 'Nessuna notifica'} aria-label="Notifiche"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? '#fff' : 'rgba(255,255,255,0.35)'}`, background: on ? C.danger : 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8, height: 34, width: 38, cursor: 'pointer' }}>
      <IconBell color="#fff" />
      {on && (
        <span style={{ position: 'absolute', top: -7, right: -7, background: '#fff', color: C.danger, borderRadius: 999, minWidth: 18, height: 18, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: `1px solid ${C.danger}` }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

const Overlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(3,71,77,0.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, width: '100%', maxWidth: 520, borderRadius: 16, padding: '18px 20px 22px', boxSizing: 'border-box', borderTop: `5px solid ${C.yellow}`, margin: 'auto' }}>
      {children}
    </div>
  </div>
);

const Head = ({ title, onClose }: { title: string; onClose: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
    <div style={{ fontWeight: 800, fontSize: 18, color: C.primary }}>{title}</div>
    <button style={{ ...S.iconBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose} aria-label="Chiudi"><IconClose /></button>
  </div>
);

/** Dialog promemoria per l'OPERATORE: elenco delle giornate da registrare. */
export function NotifOperatore({ giorni, onClose, onApri }: { giorni: string[]; onClose: () => void; onApri?: (d: string) => void }) {
  return (
    <Overlay onClose={onClose}>
      <Head title="Giornate da registrare" onClose={onClose} />
      {giorni.length === 0 ? (
        <div style={S.muted}>Nessuna giornata pregressa da registrare. Tutto in regola!</div>
      ) : (
        <>
          <div style={{ ...S.muted, marginBottom: 10 }}>
            Ci {giorni.length === 1 ? "è 1 giornata lavorativa" : `sono ${giorni.length} giornate lavorative`} nel passato senza alcuna registrazione (presenza o assenza). Toccane una per inserirla subito.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {giorni.map((d) => (
              <button key={d} onClick={() => onApri?.(d)}
                style={{ ...S.card, marginBottom: 0, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: onApri ? 'pointer' : 'default', borderLeft: `5px solid ${C.danger}`, textAlign: 'left', textTransform: 'capitalize' }}>
                <span style={{ fontWeight: 600 }}>{dayLabelLong(d)}</span>
                {onApri && <span style={{ color: C.primary, fontWeight: 700, fontSize: 13 }}>Inserisci ›</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </Overlay>
  );
}

/** Dialog promemoria per l'AMMINISTRAZIONE: operatori con giornate pregresse scoperte. */
export function NotifAmministrazione({ lista, onClose }: { lista: OpMancanti[]; onClose: () => void }) {
  const totGiorni = lista.reduce((a, x) => a + x.giorni.length, 0);
  return (
    <Overlay onClose={onClose}>
      <Head title="Operatori con giornate da registrare" onClose={onClose} />
      {lista.length === 0 ? (
        <div style={S.muted}>Tutti gli operatori sono in regola: nessuna giornata pregressa scoperta.</div>
      ) : (
        <>
          <div style={{ ...S.muted, marginBottom: 10 }}>
            {lista.length === 1 ? '1 operatore ha' : `${lista.length} operatori hanno`} giornate lavorative pregresse non ancora registrate ({totGiorni} in tutto).
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {lista.map(({ op, giorni }) => (
              <div key={op.id} style={{ ...S.card, marginBottom: 0, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderLeft: `5px solid ${C.danger}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{op.name}</div>
                  <div style={S.muted}>{op.ruolo}</div>
                </div>
                <div style={{ fontWeight: 800, color: C.danger, whiteSpace: 'nowrap' }}>{giorni.length} {giorni.length === 1 ? 'giornata' : 'giornate'}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Overlay>
  );
}
