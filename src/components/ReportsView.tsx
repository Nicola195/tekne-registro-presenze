import { useState } from 'react';
import type React from 'react';
import { Session, Operator, Nominativo, TariffaVoce, inPeriod, nomeCompleto } from '../model';
import { exportOrePerNominativo, exportRegistro, exportFamiglia, exportTutteFamiglie, nominativiNelPeriodo } from '../reports';
import { errMsg } from '../store';
import { C, S, useWide } from '../ui';
import { PeriodCard, PeriodState, OperatorCard, toPeriod } from './PeriodPicker';

interface Props {
  period: PeriodState;
  setPeriod: (p: PeriodState) => void;
  sessions: Session[];
  nominativi: Nominativo[];
  operators: Operator[];
  viewOp?: Operator;
  isAdmin?: boolean;
  tariffe: TariffaVoce[];
  unlocked: string[];
}

const DownIcon = ({ color = '#fff' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
);

export function ReportsView({ period, setPeriod, sessions, nominativi, operators, viewOp, isAdmin, tariffe, unlocked }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [famNome, setFamNome] = useState('');
  const wide = useWide();
  const p = toPeriod(period);
  const famiglie = nominativiNelPeriodo(sessions, p);
  const fam = famiglie.includes(famNome) ? famNome : famiglie[0] || '';
  const anagFam = nominativi.find((n) => n.name === fam);
  const ms = viewOp ? sessions.filter((s) => s.operatorId === viewOp.id && inPeriod(s, p)) : [];

  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: 'Report generato e scaricato.' });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusy(null);
    }
  };

  // pulsante export: solo colore + icona (+ etichetta), nessuna info ridondante
  const dlBtn = (k: string, label: string, accent: string, disabled: boolean, fn: () => Promise<void>) => (
    <button
      style={{ ...S.btn, background: accent, display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', opacity: disabled && busy !== k ? 0.5 : 1, minWidth: 150 }}
      disabled={disabled || !!busy}
      onClick={() => run(k, fn)}
      title={label}
    >
      {busy === k ? 'Preparazione…' : <><DownIcon />{label}</>}
    </button>
  );

  const rowCard = (
    icon: string, title: string, desc: string, accent: string, action: React.ReactNode, disabled?: boolean,
  ): React.ReactNode => (
    <div style={{ ...S.card, marginBottom: 10, borderLeft: `5px solid ${accent}`, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', opacity: disabled ? 0.6 : 1 }}>
      <div style={{ fontSize: 26, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
        <div style={{ ...S.muted, marginTop: 3 }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{action}</div>
    </div>
  );

  return (
    <div>
      {!isAdmin && <OperatorCard operators={operators} viewOp={viewOp} nominativi={nominativi} />}
      {/* Card periodo condivisa, pulita */}
      <PeriodCard value={period} onChange={setPeriod} unlocked={unlocked} />

      {/* Report per operatore */}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '16px 2px 8px' }}>Report dell'operatore</div>
      {rowCard('📅', 'Registro ore lavorate',
        'Elenco delle giornate lavorate con fasce orarie di entrata/uscita, nominativi seguiti, tipo di intervento e totale ore. Una settimana per pagina, con totale settimanale e del periodo.',
        C.conc, dlBtn('r', 'Registro', C.conc, !viewOp || !ms.length, () => exportRegistro(sessions, viewOp!, operators, p)), !viewOp || !ms.length)}
      {rowCard('🧾', 'Ore per nominativo',
        'Per l\'ufficio pagamenti: ore totali di ogni nominativo seguito dall\'operatore (individuali, in contemporanea, extra) e griglia giorno per giorno, una settimana per pagina.',
        C.primary, dlBtn('n', 'Prospetto', C.primary, !viewOp || !ms.length, () => exportOrePerNominativo(sessions, viewOp!, nominativi, p)), !viewOp || !ms.length)}
      {isAdmin && !viewOp && <div style={{ ...S.muted, margin: '0 2px 4px', color: C.extra }}>Seleziona un operatore qui sopra per i suoi report.</div>}
      {viewOp && !ms.length && <div style={{ ...S.muted, margin: '0 2px 4px', color: C.extra }}>Nessuna ora dell'operatore nel periodo selezionato.</div>}

      {/* Report per famiglia (solo amministrazione) */}
      {isAdmin && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '18px 2px 8px' }}>Report per la famiglia</div>
          <div style={{ ...S.card, marginBottom: 10, borderLeft: `5px solid ${C.yellow}` }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 26 }}>👪</div>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Riepilogo mensile per la famiglia</div>
                <div style={{ ...S.muted, marginTop: 3 }}>
                  Da consegnare ai genitori con la fatturazione. Riquadro con i dati dell'utente e dei genitori/tutori, elenco delle presenze
                  (data, fascia oraria, ore, modalità individuale o <b>microgruppo</b>, attività), con il totale ore e l'<b>importo</b> del mese. Comprende le ore di tutti gli operatori.
                  Per riservatezza non riporta i nomi degli altri bambini né le annotazioni libere.
                </div>
              </div>
            </div>
            {famiglie.length === 0 ? (
              <div style={{ ...S.muted, marginTop: 12 }}>Nessuna ora registrata nel periodo selezionato.</div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 14 }}>
                <div style={{ flex: '1 1 220px' }}>
                  <span style={{ ...S.label, marginTop: 0 }}>Utenza</span>
                  <select style={S.input} value={fam} onChange={(e) => setFamNome(e.target.value)}>
                    {famiglie.map((n) => {
                      const a = nominativi.find((x) => x.name === n);
                      return <option key={n} value={n}>{a ? nomeCompleto(a) : n}</option>;
                    })}
                  </select>
                </div>
                {dlBtn('f', 'Scarica utenza', C.primary, !fam, () => exportFamiglia(sessions, operators, nominativi, fam, p, tariffe))}
                {dlBtn('ff', `Tutte (${famiglie.length})`, C.conc, false, () => exportTutteFamiglie(sessions, operators, nominativi, p, tariffe))}
              </div>
            )}
          </div>
        </>
      )}

      {msg && <div style={{ marginTop: 8, fontSize: 14, color: msg.ok ? C.primary : C.danger, fontWeight: 600 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.text}</div>}
      <div style={{ height: wide ? 10 : 70 }} />
    </div>
  );
}
