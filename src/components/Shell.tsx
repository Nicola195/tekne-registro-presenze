import type React from 'react';
import { useState } from 'react';
import { ENTE, LOGO_PNG } from '../branding';
import { C, S } from '../ui';
import { IconClose } from './Icons';

export const LogoBox = ({ size = 40 }: { size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
    <img src={LOGO_PNG} alt="TEKNE" style={{ width: '92%', height: '92%', objectFit: 'contain' }} />
  </div>
);

interface HeaderProps {
  wide: boolean;
  nav?: React.ReactNode;
  onLogout: () => void;
  onSwitchMode?: () => void;
  notif?: React.ReactNode;
}

const SwitchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7h13l-3-3M20 17H7l3 3" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17l-5-5 5-5" />
    <path d="M15 12H5" />
  </svg>
);

/** Testata: logo e nome app a sinistra, notifiche, cambio modalità e uscita a destra. */
export function Header({ wide, nav, onLogout, onSwitchMode, notif }: HeaderProps) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 10, background: C.primary, color: '#fff', borderBottom: `4px solid ${C.yellow}` }}>
      <div style={{ padding: wide ? '8px 24px' : '8px 12px', display: 'flex', alignItems: 'center', gap: wide ? 16 : 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: wide ? '0 0 auto' : 1, minWidth: 0 }}>
          <LogoBox size={wide ? 44 : 38} />
          <div style={{ fontWeight: 800, fontSize: wide ? 19 : 16, whiteSpace: 'nowrap' }}>Registro Ore</div>
        </div>
        {wide && nav && <nav style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>{nav}</nav>}
        {wide && !nav && <div style={{ flex: 1 }} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {notif}
          {onSwitchMode && (
            <button onClick={onSwitchMode} title="Cambia modalità" aria-label="Cambia modalità"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8, height: 34, padding: wide ? '0 12px' : '0 10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <SwitchIcon />{wide ? 'Cambia' : ''}
            </button>
          )}
          <button onClick={onLogout} title="Esci" aria-label="Esci"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8, height: 34, padding: wide ? '0 12px' : '0 10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <LogoutIcon />{wide ? 'Esci' : ''}
          </button>
        </div>
      </div>
    </header>
  );
}

/** Informativa: dati della cooperativa, contatti e manuale utente. */
function InformativaModal({ onClose }: { onClose: () => void }) {
  const Sec = ({ t, children }: { t: string; children: React.ReactNode }) => (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 700, color: C.primary, marginBottom: 4 }}>{t}</div>
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(3,71,77,0.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, width: '100%', maxWidth: 660, borderRadius: 16, padding: '18px 20px 24px', boxSizing: 'border-box', borderTop: `5px solid ${C.yellow}`, margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.primary }}>Informativa</div>
          <button style={{ ...S.iconBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose} aria-label="Chiudi"><IconClose /></button>
        </div>

        <Sec t={ENTE.nome}>
          {ENTE.sedeLegale.replace('Sede Legale: ', 'Sede legale: ')}<br />
          {ENTE.sedeFisica.replace('Sede Fisica: ', 'Sede operativa: ')}<br />
          {ENTE.piva}
        </Sec>

        <Sec t="Contatti">
          Per assistenza o segnalazioni sull'applicazione:
          <div style={{ marginTop: 6 }}><b>Simona Tundo</b> — +39 349 755 0812</div>
        </Sec>

        <div style={{ fontWeight: 800, fontSize: 16, color: C.primaryDark, marginTop: 20 }}>Manuale utente</div>
        <Sec t="Accesso">Scegli il tuo profilo nella schermata iniziale. Gli operatori registrano le proprie ore; l'amministrazione gestisce utenze e operatori e consulta i dati di tutti.</Sec>
        <Sec t="Inserimento ore (operatori)">Nella scheda <b>Inserisci</b> seleziona <b>Giorno</b> e tocca <b>+ Aggiungi ore</b>. Indica le ore, uno o più nominativi (più nominativi = microgruppo), la fascia oraria e il tipo di intervento. Con <b>+ Assenza</b> registri permessi o ferie. I giorni festivi e i weekend sono evidenziati e bloccati, salvo sblocco dell'amministrazione.</Sec>
        <Sec t="Riepilogo">Scegli l'operatore (per l'amministrazione) e il periodo — giorno, mese o intervallo. Mostra gli indicatori del periodo e il dettaglio per giorno (diviso per settimana) o per nominativo.</Sec>
        <Sec t="Estrazioni">Scarica i report in formato stampabile: registro ore lavorate e ore per nominativo (per operatore), e il riepilogo per la famiglia (amministrazione).</Sec>
        <Sec t="Impostazioni (amministrazione)">Gestisci le <b>Utenze</b> (anagrafica e genitori/tutori), gli <b>Operatori</b> e le <b>Associazioni</b> tra loro.</Sec>
      </div>
    </div>
  );
}

/** Footer: solo nome della cooperativa e accesso all'Informativa. */
export function Footer({ wide }: { wide: boolean }) {
  const [info, setInfo] = useState(false);
  return (
    <footer style={{ background: '#fff', borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 12.5, marginBottom: wide ? 0 : 64 }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: wide ? '12px 24px' : '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 auto', fontWeight: 700, color: C.primary }}>{ENTE.nome}</div>
        <button style={{ ...S.btnGhost, padding: '7px 12px' }} onClick={() => setInfo(true)}>Informativa</button>
      </div>
      {info && <InformativaModal onClose={() => setInfo(false)} />}
    </footer>
  );
}
