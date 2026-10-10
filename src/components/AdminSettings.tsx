import { useMemo, useState } from 'react';
import { Session, Operator, Nominativo, Ruolo, RUOLI, TariffaVoce, fmtH, round2, newId, nomeCompleto, genitoriLabel } from '../model';
import { C, S, chip, useWide } from '../ui';
import { NominativoEditor } from './NominativoEditor';
import { seg } from './PeriodPicker';

interface Props {
  operators: Operator[];
  nominativi: Nominativo[];
  sessions: Session[];
  tariffe: TariffaVoce[];
  onOperators: (o: Operator[]) => void;
  onNominativi: (n: Nominativo[]) => void;
  onTariffe: (t: TariffaVoce[]) => void;
}

type Sub = 'utenze' | 'operatori' | 'associazioni' | 'tariffe';

export function AdminSettings({ operators, nominativi, sessions, tariffe, onOperators, onNominativi, onTariffe }: Props) {
  const wide = useWide();
  const [sub, setSub] = useState<Sub>('utenze');

  const totalNom = (n: string) => round2(sessions.filter((s) => s.names.includes(n)).reduce((a, s) => a + s.hours, 0));
  const totalOp = (id: string) => round2(sessions.filter((s) => s.operatorId === id).reduce((a, s) => a + s.hours, 0));

  // ---- Utenze ----
  const [editing, setEditing] = useState<Nominativo | 'new' | null>(null);
  const [filtroU, setFiltroU] = useState('');
  const utenze = useMemo(
    () => [...nominativi].sort((a, b) => a.name.localeCompare(b.name)).filter((n) => nomeCompleto(n).toLowerCase().includes(filtroU.toLowerCase())),
    [nominativi, filtroU],
  );
  const saveNom = (n: Nominativo) => {
    const exists = nominativi.some((x) => x.name === n.name);
    onNominativi(exists ? nominativi.map((x) => (x.name === n.name ? { ...x, ...n } : x)) : [...nominativi, n]);
    setEditing(null);
  };
  const removeNom = (name: string) => {
    if (window.confirm(`Rimuovere ${name} dall'elenco utenze? Le ore già registrate restano nello storico e nei report.`))
      onNominativi(nominativi.filter((x) => x.name !== name));
  };

  // ---- Operatori ----
  const [newOp, setNewOp] = useState('');
  const [newRuolo, setNewRuolo] = useState<Ruolo>('Educatrice');
  const addOp = () => {
    const name = newOp.trim();
    if (!name) return;
    if (operators.some((o) => o.name.toLowerCase() === name.toLowerCase())) return void window.alert(`${name} è già presente.`);
    onOperators([...operators, { id: `op-${newId()}`, name, ruolo: newRuolo }]);
    setNewOp('');
  };
  const setRuolo = (id: string, ruolo: Ruolo) => onOperators(operators.map((o) => (o.id === id ? { ...o, ruolo } : o)));
  const renameOp = (o: Operator) => {
    const name = window.prompt('Cognome e nome', o.name)?.trim();
    if (name) onOperators(operators.map((x) => (x.id === o.id ? { ...x, name } : x)));
  };
  const removeOp = (o: Operator) => {
    if (sessions.some((s) => s.operatorId === o.id)) return void window.alert(`${o.name} ha ore registrate: non può essere rimosso (lo storico resterebbe senza intestatario).`);
    if (!window.confirm(`Rimuovere ${o.name}?`)) return;
    onOperators(operators.filter((x) => x.id !== o.id));
    onNominativi(nominativi.map((n) => ({ ...n, operators: n.operators.filter((id) => id !== o.id) })));
  };

  // ---- Associazioni ----
  const [filtroOp, setFiltroOp] = useState('');
  const [filtroAnom, setFiltroAnom] = useState('');
  const assocOps = filtroOp ? operators.filter((o) => o.id === filtroOp) : operators;
  const toggleAssign = (nom: string, opId: string) =>
    onNominativi(
      nominativi.map((n) =>
        n.name === nom ? { ...n, operators: n.operators.includes(opId) ? n.operators.filter((x) => x !== opId) : [...n.operators, opId] } : n,
      ),
    );

  // ---- Tariffe (voci di terapia + tariffa oraria) ----
  const [newVoce, setNewVoce] = useState('');
  const addVoce = () => {
    const nome = newVoce.trim();
    if (!nome) return;
    if (tariffe.some((t) => t.nome.toLowerCase() === nome.toLowerCase())) return void window.alert(`La voce "${nome}" è già presente.`);
    onTariffe([...tariffe, { nome, tariffa: 0 }]);
    setNewVoce('');
  };
  const setTariffa = (nome: string, tariffa: number) => onTariffe(tariffe.map((t) => (t.nome === nome ? { ...t, tariffa } : t)));
  const renameVoce = (t: TariffaVoce) => {
    const nome = window.prompt('Nome della voce di terapia', t.nome)?.trim();
    if (!nome || nome === t.nome) return;
    if (tariffe.some((x) => x.nome.toLowerCase() === nome.toLowerCase())) return void window.alert(`La voce "${nome}" è già presente.`);
    onTariffe(tariffe.map((x) => (x.nome === t.nome ? { ...x, nome } : x)));
  };
  const removeVoce = (nome: string) => {
    const usata = sessions.some((s) => s.attivita?.includes(nome));
    const msg = usata
      ? `La voce "${nome}" è usata in alcune registrazioni. Rimuovendola non sarà più selezionabile; le registrazioni esistenti la conservano. Procedere?`
      : `Rimuovere la voce "${nome}"?`;
    if (window.confirm(msg)) onTariffe(tariffe.filter((t) => t.nome !== nome));
  };

  const ruoloSelect = (value: Ruolo, onChange: (r: Ruolo) => void) => (
    <select style={{ ...S.input, width: 'auto', padding: '7px 8px', fontSize: 14 }} value={value} onChange={(e) => onChange(e.target.value as Ruolo)}>
      {RUOLI.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  );

  const subTabs: [Sub, string][] = [['utenze', `Utenze (${nominativi.length})`], ['operatori', `Operatori (${operators.length})`], ['associazioni', 'Associazioni'], ['tariffe', `Tariffe (${tariffe.length})`]];

  // ---------- UTENZE ----------
  const utenzeView = (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={S.h2}>Utenze</div>
        <button style={S.btn} onClick={() => setEditing('new')}>+ Nuova utenza</button>
      </div>
      <div style={{ ...S.muted, marginBottom: 8 }}>Bambini e ragazzi seguiti. Apri una scheda per i dati anagrafici e i riferimenti dei genitori/tutori.</div>
      {nominativi.length > 6 && <input style={{ ...S.input, marginBottom: 8 }} placeholder="Cerca utenza…" value={filtroU} onChange={(e) => setFiltroU(e.target.value)} />}
      {utenze.map((n) => (
        <div key={n.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }} onClick={() => setEditing(n)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{nomeCompleto(n)}</div>
            <div style={{ ...S.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {n.terapia || 'Terapia non indicata'}{genitoriLabel(n) ? ` · ${genitoriLabel(n)}` : ''}
            </div>
          </div>
          <div style={{ ...S.muted, textAlign: 'right' }}>
            <div>{fmtH(totalNom(n.name))}</div>
            <div style={{ fontSize: 11 }}>{n.operators.length ? `${n.operators.length} op.` : <span style={{ color: C.extra }}>non assoc.</span>}</div>
          </div>
          <button style={{ ...S.btnGhost, padding: '6px 9px' }} onClick={(e) => { e.stopPropagation(); setEditing(n); }} title="Scheda">✎</button>
          <button style={{ ...S.btnGhost, padding: '6px 9px', color: C.danger }} onClick={(e) => { e.stopPropagation(); removeNom(n.name); }} title="Rimuovi">🗑</button>
        </div>
      ))}
      {nominativi.length === 0 && <div style={S.muted}>Nessuna utenza. Aggiungine una con "Nuova utenza".</div>}
    </div>
  );

  // ---------- OPERATORI ----------
  const operatoriView = (
    <div style={S.card}>
      <div style={S.h2}>Operatori</div>
      <div style={{ ...S.muted, marginBottom: 8 }}>Educatori e psicologi che registrano le ore. Le associazioni con le utenze si gestiscono nella scheda "Associazioni".</div>
      {operators.map((o) => (
        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{o.name}</div>
            <div style={S.muted}>{fmtH(totalOp(o.id))} registrate · {nominativi.filter((n) => n.operators.includes(o.id)).length} utenze</div>
          </div>
          {ruoloSelect(o.ruolo, (r) => setRuolo(o.id, r))}
          <button style={{ ...S.btnGhost, padding: '6px 9px' }} onClick={() => renameOp(o)} title="Rinomina">✎</button>
          <button style={{ ...S.btnGhost, padding: '6px 9px', color: C.danger }} onClick={() => removeOp(o)} title="Rimuovi">🗑</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input style={{ ...S.input, flex: '1 1 180px', width: 'auto' }} value={newOp} placeholder="Cognome e nome" onChange={(e) => setNewOp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addOp()} />
        {ruoloSelect(newRuolo, setNewRuolo)}
        <button style={S.btn} onClick={addOp}>Aggiungi</button>
      </div>
    </div>
  );

  // ---------- ASSOCIAZIONI ----------
  const assocView = (
    <div style={S.card}>
      <div style={S.h2}>Associazioni utenze ↔ operatori</div>
      <div style={{ ...S.muted, marginBottom: 10 }}>
        Tocca un operatore sotto ogni utenza per associarlo o rimuoverlo. Un'utenza può essere associata a più operatori. Le ore registrate su utenze non associate risultano <b>extra</b>.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <select style={{ ...S.input, width: 'auto', flex: '1 1 200px' }} value={filtroOp} onChange={(e) => setFiltroOp(e.target.value)}>
          <option value="">Tutti gli operatori</option>
          {operators.map((o) => (
            <option key={o.id} value={o.id}>Filtra: {o.name}</option>
          ))}
        </select>
        <input style={{ ...S.input, flex: '1 1 160px', width: 'auto' }} placeholder="Cerca utenza…" value={filtroAnom} onChange={(e) => setFiltroAnom(e.target.value)} />
      </div>
      {[...nominativi].sort((a, b) => a.name.localeCompare(b.name)).filter((n) => nomeCompleto(n).toLowerCase().includes(filtroAnom.toLowerCase()))
        .filter((n) => !filtroOp || n.operators.includes(filtroOp))
        .map((n) => (
          <div key={n.name} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{nomeCompleto(n)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {assocOps.map((o) => (
                <button key={o.id} style={{ ...chip(n.operators.includes(o.id)), padding: '5px 10px', fontSize: 12 }} onClick={() => toggleAssign(n.name, o.id)}>{o.name}</button>
              ))}
              {n.operators.length === 0 && !filtroOp && <span style={{ fontSize: 12, color: C.extra, alignSelf: 'center' }}>non associata</span>}
            </div>
          </div>
        ))}
      {nominativi.length === 0 && <div style={S.muted}>Aggiungi prima le utenze dalla scheda "Utenze".</div>}
    </div>
  );

  // ---------- TARIFFE ----------
  const tariffeView = (
    <div style={S.card}>
      <div style={S.h2}>Voci di terapia e tariffe orarie</div>
      <div style={{ ...S.muted, marginBottom: 10 }}>
        Definisci le voci di intervento e la relativa tariffa oraria. Sono le <b>uniche</b> voci che gli operatori possono selezionare quando registrano le ore.
        Tariffe e importi sono visibili solo all'amministrazione.
      </div>
      {tariffe.map((t) => (
        <div key={t.nome} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px', minWidth: 0, fontWeight: 600 }}>{t.nome}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number" min={0} step={0.5} inputMode="decimal"
              style={{ ...S.input, width: 100, textAlign: 'right' }}
              value={Number.isFinite(t.tariffa) ? t.tariffa : 0}
              onChange={(e) => setTariffa(t.nome, Math.max(0, Number(e.target.value) || 0))}
            />
            <span style={{ color: C.muted, fontSize: 13 }}>€/ora</span>
          </div>
          <button style={{ ...S.btnGhost, padding: '6px 9px' }} onClick={() => renameVoce(t)} title="Rinomina">✎</button>
          <button style={{ ...S.btnGhost, padding: '6px 9px', color: C.danger }} onClick={() => removeVoce(t.nome)} title="Rimuovi">🗑</button>
        </div>
      ))}
      {tariffe.length === 0 && <div style={S.muted}>Nessuna voce definita: aggiungine almeno una, altrimenti gli operatori non potranno indicare il tipo di intervento.</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input style={{ ...S.input, flex: '1 1 180px', width: 'auto' }} value={newVoce} placeholder="Nuova voce (es. Logopedia)" onChange={(e) => setNewVoce(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addVoce()} />
        <button style={S.btn} onClick={addVoce}>Aggiungi voce</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', background: '#ebede4', borderRadius: 10, padding: 3, marginBottom: 12, maxWidth: 680, flexWrap: wide ? 'nowrap' : 'wrap' }}>
        {subTabs.map(([k, l]) => (
          <button key={k} style={{ ...seg(sub === k), flex: wide ? 1 : '1 1 46%' }} onClick={() => setSub(k)}>{l}</button>
        ))}
      </div>
      {sub === 'utenze' && utenzeView}
      {sub === 'operatori' && operatoriView}
      {sub === 'associazioni' && assocView}
      {sub === 'tariffe' && tariffeView}

      {editing && (
        <NominativoEditor
          initial={editing === 'new' ? undefined : editing}
          esistenti={nominativi.map((n) => n.name)}
          onClose={() => setEditing(null)}
          onSave={saveNom}
        />
      )}
    </div>
  );
}
