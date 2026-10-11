import { useState } from 'react';
import type React from 'react';
import { Session, Operator, Nominativo, TariffaVoce, inPeriod, nomeCompleto } from '../model';
import { exportOrePerNominativo, exportRegistro, exportFamiglia } from '../reports';
import { errMsg } from '../store';
import { C, S, useWide } from '../ui';
import { PeriodCard, PeriodState, toPeriod } from './PeriodPicker';
import { IconCalendar, IconReceipt, IconFamily, IconProps } from './Icons';

interface Props {
  period: PeriodState;
  setPeriod: (p: PeriodState) => void;
  sessions: Session[];
  nominativi: Nominativo[];
  operators: Operator[];
  tariffe: TariffaVoce[];
  unlocked: string[];
  mode: 'operatore' | 'utenza';
  viewOp?: Operator;   // modalità operatore
  fixedNom?: string;   // modalità utenza (nominativo selezionato)
}

const DownIcon = ({ color = '#fff' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
);

export function ReportsView({ period, setPeriod, sessions, nominativi, operators, tariffe, unlocked, mode, viewOp, fixedNom }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const wide = useWide();
  const p = toPeriod(period);

  const ms = viewOp ? sessions.filter((s) => s.operatorId === viewOp.id && inPeriod(s, p)) : [];
  const anagFam = fixedNom ? nominativi.find((n) => n.name === fixedNom) : undefined;
  const famHours = fixedNom ? sessions.some((s) => s.names.includes(fixedNom) && inPeriod(s, p)) : false;

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
    Icon: (p: IconProps) => React.ReactElement, title: string, desc: string, accent: string, action: React.ReactNode, disabled?: boolean,
  ): React.ReactNode => (
    <div style={{ ...S.card, marginBottom: 10, borderLeft: `5px solid ${accent}`, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', opacity: disabled ? 0.6 : 1 }}>
      <div style={{ flexShrink: 0, display: 'flex' }}><Icon size={26} color={accent} /></div>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
        <div style={{ ...S.muted, marginTop: 3 }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{action}</div>
    </div>
  );

  return (
    <div>
      <PeriodCard value={period} onChange={setPeriod} unlocked={unlocked} />

      {/* ---- Modalità OPERATORE: report dell'operatore ---- */}
      {mode === 'operatore' && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '16px 2px 8px' }}>Report dell'operatore</div>
          {rowCard(IconCalendar, 'Registro ore lavorate',
            'Elenco delle giornate lavorate con fasce orarie di entrata/uscita, nominativi seguiti, tipo di intervento e totale ore. Una settimana per pagina, con totale settimanale e del periodo.',
            C.conc, dlBtn('r', 'Registro', C.conc, !viewOp || !ms.length, () => exportRegistro(sessions, viewOp!, operators, p)), !viewOp || !ms.length)}
          {rowCard(IconReceipt, 'Ore per nominativo',
            'Per l\'ufficio pagamenti: ore totali di ogni nominativo seguito dall\'operatore (individuali, in contemporanea, extra) e griglia giorno per giorno, una settimana per pagina.',
            C.primary, dlBtn('n', 'Prospetto', C.primary, !viewOp || !ms.length, () => exportOrePerNominativo(sessions, viewOp!, nominativi, p)), !viewOp || !ms.length)}
          {viewOp && !ms.length && <div style={{ ...S.muted, margin: '0 2px 4px', color: C.extra }}>Nessuna ora dell'operatore nel periodo selezionato.</div>}
        </>
      )}

      {/* ---- Modalità UTENZA: solo report per la famiglia dell'utenza scelta ---- */}
      {mode === 'utenza' && fixedNom && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '16px 2px 8px' }}>Report per la famiglia</div>
          <div style={{ ...S.card, marginBottom: 10, borderLeft: `5px solid ${C.yellow}` }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex' }}><IconFamily size={26} color={C.primaryDark} /></div>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Riepilogo mensile per la famiglia</div>
                <div style={{ ...S.muted, marginTop: 3 }}>
                  Da consegnare ai genitori di <b>{anagFam ? nomeCompleto(anagFam) : fixedNom}</b> con la fatturazione. Riquadro con i dati dell'utente e dei genitori/tutori,
                  elenco delle presenze (data, fascia oraria, ore, modalità individuale o <b>microgruppo</b>, attività), con totale ore e <b>importo</b> del mese.
                  Comprende le ore di tutti gli operatori. Per riservatezza non riporta i nomi degli altri bambini né le annotazioni libere.
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              {dlBtn('f', 'Scarica report', C.primary, !famHours, () => exportFamiglia(sessions, operators, nominativi, fixedNom, p, tariffe))}
            </div>
            {!famHours && <div style={{ ...S.muted, marginTop: 10, color: C.extra }}>Nessuna ora registrata per questa utenza nel periodo selezionato.</div>}
          </div>
        </>
      )}

      {msg && <div style={{ marginTop: 8, fontSize: 14, color: msg.ok ? C.primary : C.danger, fontWeight: 600 }}>{msg.text}</div>}
      <div style={{ height: wide ? 10 : 70 }} />
    </div>
  );
}
