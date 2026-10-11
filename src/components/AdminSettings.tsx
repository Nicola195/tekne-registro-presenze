import { useMemo, useState } from 'react';
import { Session, Operator, Nominativo, TariffaVoce, fmtH, round2, nomeCompleto, genitoriLabel } from '../model';
import { C, S, useWide } from '../ui';
import { NominativoEditor } from './NominativoEditor';
import { OperatorEditor } from './OperatorEditor';
import { seg } from './PeriodPicker';
import { AccessiView } from './AccessiView';

interface Props {
  operators: Operator[];
  nominativi: Nominativo[];
  sessions: Session[];
  tariffe: TariffaVoce[];
  onOperators: (o: Operator[]) => void;
  onNominativi: (n: Nominativo[]) => void;
  onTariffe: (t: TariffaVoce[]) => void;
}

// Due sezioni "padre", ognuna con le proprie sezioni "figlie".
type Parent = 'utenti' | 'amministrazione';
type SubUtenti = 'utenze' | 'operatori';
type SubAdmin = 'tariffe' | 'accessi';

export function AdminSettings({ operators, nominativi, sessions, tariffe, onOperators, onNominativi, onTariffe }: Props) {
  const wide = useWide();
  const [parent, setParent] = useState<Parent>('utenti');
  const [subUtenti, setSubUtenti] = useState<SubUtenti>('utenze');
  const [subAdmin, setSubAdmin] = useState<SubAdmin>('tariffe');

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

  // ---- Operatori (scheda con dati, ruolo e utenze seguite) ----
  const [editingOp, setEditingOp] = useState<Operator | 'new' | null>(null);
  const saveOperator = (op: Operator, utenzeSeguite: string[]) => {
    const exists = operators.some((o) => o.id === op.id);
    onOperators(exists ? operators.map((o) => (o.id === op.id ? op : o)) : [...operators, op]);
    // applica le associazioni: imposta l'appartenenza di questo operatore su ogni utenza
    const nextNoms = nominativi.map((n) => {
      const should = utenzeSeguite.includes(n.name);
      const has = n.operators.includes(op.id);
      if (should && !has) return { ...n, operators: [...n.operators, op.id] };
      if (!should && has) return { ...n, operators: n.operators.filter((x) => x !== op.id) };
      return n;
    });
    onNominativi(nextNoms);
    setEditingOp(null);
  };
  const removeOp = (o: Operator) => {
    if (sessions.some((s) => s.operatorId === o.id)) return void window.alert(`${o.name} ha ore registrate: non può essere rimosso (lo storico resterebbe senza intestatario).`);
    if (!window.confirm(`Rimuovere ${o.name}?`)) return;
    onOperators(operators.filter((x) => x.id !== o.id));
    onNominativi(nominativi.map((n) => ({ ...n, operators: n.operators.filter((id) => id !== o.id) })));
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={S.h2}>Operatori</div>
        <button style={S.btn} onClick={() => setEditingOp('new')}>+ Nuovo operatore</button>
      </div>
      <div style={{ ...S.muted, marginBottom: 8 }}>Educatori e psicologi che registrano le ore. Apri la scheda per modificare dati, ruolo e utenze seguite.</div>
      {operators.map((o) => {
        const nAssoc = nominativi.filter((n) => n.operators.includes(o.id)).length;
        return (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }} onClick={() => setEditingOp(o)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{o.name} <span style={{ ...S.muted, fontWeight: 400 }}>· {o.ruolo}</span></div>
              <div style={S.muted}>{fmtH(totalOp(o.id))} registrate · {nAssoc} {nAssoc === 1 ? 'utenza seguita' : 'utenze seguite'}</div>
            </div>
            <button style={{ ...S.btnGhost, padding: '6px 9px' }} onClick={(e) => { e.stopPropagation(); setEditingOp(o); }} title="Scheda">✎</button>
            <button style={{ ...S.btnGhost, padding: '6px 9px', color: C.danger }} onClick={(e) => { e.stopPropagation(); removeOp(o); }} title="Rimuovi">🗑</button>
          </div>
        );
      })}
      {operators.length === 0 && <div style={S.muted}>Nessun operatore. Aggiungine uno con "Nuovo operatore".</div>}
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

  // ---------- Navigazione a due livelli ----------
  const parentTabs: [Parent, string][] = [['utenti', 'Utenti del sistema'], ['amministrazione', 'Amministrazione']];
  const utentiTabs: [SubUtenti, string][] = [['utenze', `Utenze (${nominativi.length})`], ['operatori', `Operatori (${operators.length})`]];
  const adminTabs: [SubAdmin, string][] = [['tariffe', `Tariffe (${tariffe.length})`], ['accessi', 'Gestione accessi']];
  const parentDesc = parent === 'utenti'
    ? 'Anagrafiche del sistema: utenze (bambini e ragazzi) e operatori (educatori e psicologi).'
    : 'Funzioni riservate all’amministrazione: tariffe delle voci di terapia e gestione degli accessi.';

  const tabBar = (tabs: [string, string][], active: string, onSel: (k: string) => void, accent = C.primary) => (
    <div style={{ display: 'flex', background: '#ebede4', borderRadius: 10, padding: 3, maxWidth: 680, flexWrap: wide ? 'nowrap' : 'wrap' }}>
      {tabs.map(([k, l]) => (
        <button key={k} style={{ ...seg(active === k, accent), flex: wide ? 1 : '1 1 46%' }} onClick={() => onSel(k)}>{l}</button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Sezioni padre */}
      {tabBar(parentTabs as [string, string][], parent, (k) => setParent(k as Parent), C.conc)}
      <div style={{ ...S.muted, margin: '8px 2px 12px' }}>{parentDesc}</div>

      {/* Sezioni figlie */}
      {parent === 'utenti' && (
        <>
          {tabBar(utentiTabs as [string, string][], subUtenti, (k) => setSubUtenti(k as SubUtenti))}
          <div style={{ height: 12 }} />
          {subUtenti === 'utenze' && utenzeView}
          {subUtenti === 'operatori' && operatoriView}
        </>
      )}
      {parent === 'amministrazione' && (
        <>
          {tabBar(adminTabs as [string, string][], subAdmin, (k) => setSubAdmin(k as SubAdmin))}
          <div style={{ height: 12 }} />
          {subAdmin === 'tariffe' && tariffeView}
          {subAdmin === 'accessi' && <AccessiView operators={operators} onOperators={onOperators} />}
        </>
      )}

      {editing && (
        <NominativoEditor
          initial={editing === 'new' ? undefined : editing}
          esistenti={nominativi.map((n) => n.name)}
          onClose={() => setEditing(null)}
          onSave={saveNom}
        />
      )}
      {editingOp && (
        <OperatorEditor
          initial={editingOp === 'new' ? undefined : editingOp}
          operators={operators}
          nominativi={nominativi}
          onClose={() => setEditingOp(null)}
          onSave={saveOperator}
        />
      )}
    </div>
  );
}
