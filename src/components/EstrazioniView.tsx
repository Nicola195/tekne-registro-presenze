import { useState } from 'react';
import type React from 'react';
import { Session, Operator, Nominativo, TariffaVoce } from '../model';
import { exportFamiglieZip, exportOrePerNominativoZip, exportRegistroZip } from '../reports';
import { errMsg } from '../store';
import { PeriodCard, PeriodState, initialPeriod, toPeriod } from './PeriodPicker';
import { C, S, useWide } from '../ui';
import { IconFamily, IconReceipt, IconCalendar, IconDownload, IconProps } from './Icons';

interface Props {
  sessions: Session[];
  operators: Operator[];
  nominativi: Nominativo[];
  tariffe: TariffaVoce[];
  unlocked?: string[];
}

/** Estrazioni massive, riservate all'amministrazione (una sezione sotto Gestione amministrativa). */
export function EstrazioniView({ sessions, operators, nominativi, tariffe, unlocked = [] }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [period, setPeriod] = useState<PeriodState>(initialPeriod);
  const wide = useWide();
  const p = toPeriod(period);

  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: 'Estrazione generata e scaricata.' }); }
    catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
    finally { setBusy(null); }
  };

  const dlBtn = (k: string, label: string, accent: string, fn: () => Promise<void>) => (
    <button
      style={{ ...S.btn, background: accent, display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', opacity: busy && busy !== k ? 0.5 : 1, minWidth: 170 }}
      disabled={!!busy}
      onClick={() => run(k, fn)}
      title={label}
    >
      {busy === k ? 'Preparazione…' : <><IconDownload size={18} color="#fff" />{label}</>}
    </button>
  );

  const rowCard = (Icon: (q: IconProps) => React.ReactElement, title: string, desc: string, accent: string, action: React.ReactNode): React.ReactNode => (
    <div style={{ ...S.card, marginBottom: 10, borderLeft: `5px solid ${accent}`, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
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
      <div style={{ ...S.muted, marginBottom: 10 }}>
        Estrazioni d'insieme per il periodo selezionato. Scegli giorno, mese o intervallo nella card qui sotto, poi scarica.
      </div>
      <PeriodCard value={period} onChange={setPeriod} unlocked={unlocked} />

      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '16px 2px 8px' }}>Report per le famiglie</div>
      {rowCard(IconFamily, 'Riepilogo per tutte le famiglie',
        'Un file ZIP con un PDF separato per ciascuna utenza con ore nel periodo. Riservatezza mantenuta: nessun nome di altri bambini, nessuna annotazione libera.',
        C.yellow, dlBtn('fam', 'Scarica ZIP', C.primary, () => exportFamiglieZip(sessions, operators, nominativi, p, tariffe)))}

      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '18px 2px 8px' }}>Report di tutti gli operatori</div>
      {rowCard(IconReceipt, 'Ore per nominativo — tutti gli operatori',
        'Un file ZIP con un PDF separato per ciascun operatore (per l\'ufficio pagamenti): ore totali per nominativo e griglie settimanali.',
        C.primary, dlBtn('nom', 'Scarica ZIP', C.primary, () => exportOrePerNominativoZip(sessions, operators, nominativi, p)))}
      {rowCard(IconCalendar, 'Registro ore — tutti gli operatori',
        'Un file ZIP con un PDF separato per ciascun operatore: il registro delle giornate lavorate, una settimana per pagina.',
        C.conc, dlBtn('reg', 'Scarica ZIP', C.conc, () => exportRegistroZip(sessions, operators, p)))}

      {msg && <div style={{ marginTop: 10, fontSize: 14, color: msg.ok ? C.primary : C.danger, fontWeight: 600 }}>{msg.text}</div>}
      <div style={{ height: wide ? 10 : 40 }} />
    </div>
  );
}
