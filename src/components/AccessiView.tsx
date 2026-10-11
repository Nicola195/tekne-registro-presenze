import { useEffect, useState, type ReactNode } from 'react';
import { Operator, Ruolo, RUOLI, newId } from '../model';
import { saveOperators } from '../store';
import { C, S, badge } from '../ui';
import { AccessUser, listAccessi, createAccesso, setAccessoPwd, setAccessoRole } from '../admin-api';

/** Password temporanea leggibile (niente caratteri ambigui). */
const genPwd = () => {
  const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => cs[Math.floor(Math.random() * cs.length)]).join('');
};

/** Form riutilizzabile: email (facoltativa) + password temporanea con generatore. */
function CredForm({ withEmail, submitLabel, onSubmit, onCancel }:
  { withEmail: boolean; submitLabel: string; onSubmit: (email: string, pwd: string) => Promise<void>; onCancel: () => void }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState(genPwd());
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ ...S.card, background: C.bg, marginTop: 8, marginBottom: 0 }}>
      {withEmail && (
        <>
          <span style={S.label}>Email</span>
          <input style={S.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" />
        </>
      )}
      <span style={S.label}>Password temporanea</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...S.input, flex: 1 }} value={pwd} onChange={(e) => setPwd(e.target.value)} />
        <button type="button" style={S.btnGhost} onClick={() => setPwd(genPwd())}>Genera</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button style={{ ...S.btnGhost, flex: 1 }} disabled={busy} onClick={onCancel}>Annulla</button>
        <button style={{ ...S.btn, flex: 1, opacity: busy ? 0.6 : 1 }} disabled={busy}
          onClick={async () => { setBusy(true); try { await onSubmit(email.trim(), pwd); } finally { setBusy(false); } }}>{submitLabel}</button>
      </div>
    </div>
  );
}

const Sec = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={S.card}>
    <div style={S.h2}>{title}</div>
    {children}
  </div>
);

/** Sezione Amministrazione: gestione degli accessi (operatori e amministratori). */
export function AccessiView({ operators, onOperators }:
  { operators: Operator[]; onOperators: (ops: Operator[]) => void }) {
  const [users, setUsers] = useState<AccessUser[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState('');
  const [nome, setNome] = useState('');
  const [ruolo, setRuolo] = useState<Ruolo>('Educatrice');
  const [promoteId, setPromoteId] = useState('');

  const reload = async () => {
    try { setUsers(await listAccessi()); setErr(null); } catch (e) { setErr((e as Error).message); }
  };
  useEffect(() => { reload(); }, []);

  const userOf = (opId: string) => users?.find((u) => u.operatorId === opId);
  const admins = users?.filter((u) => u.isAdmin) || [];
  const promotable = users?.filter((u) => !u.isAdmin) || [];
  const ok = (m: string) => { setNote(m); setErr(null); };

  const createForOperator = async (op: Operator, email: string, pwd: string) => {
    if (!email) { setErr('Inserisci una email.'); return; }
    try { await createAccesso({ email, pwd, operatorId: op.id, isAdmin: false }); setOpen(''); await reload(); ok(`Accesso creato per ${op.name}. Password temporanea: ${pwd}`); }
    catch (e) { setErr((e as Error).message); }
  };
  const resetForUser = async (u: AccessUser, _e: string, pwd: string) => {
    try { await setAccessoPwd(u.id, pwd); setOpen(''); ok(`Password reimpostata per ${u.email}. Nuova password temporanea: ${pwd}`); }
    catch (e) { setErr((e as Error).message); }
  };
  const createNewOperator = async (email: string, pwd: string) => {
    if (!nome.trim() || !email) { setErr('Inserisci nome operatore ed email.'); return; }
    const op: Operator = { id: `op-${newId()}`, name: nome.trim(), ruolo };
    const next = [...operators, op];
    try {
      await saveOperators(next); // crea prima la riga operatore (vincolo del profilo)
      onOperators(next);
      await createAccesso({ email, pwd, operatorId: op.id, isAdmin: false });
      setOpen(''); setNome(''); await reload();
      ok(`Operatore "${op.name}" creato e abilitato. Password temporanea: ${pwd}`);
    } catch (e) { setErr((e as Error).message); }
  };
  const createAdmin = async (email: string, pwd: string) => {
    if (!email) { setErr('Inserisci una email.'); return; }
    try { await createAccesso({ email, pwd, operatorId: null, isAdmin: true }); setOpen(''); await reload(); ok(`Amministratore creato. Password temporanea: ${pwd}`); }
    catch (e) { setErr((e as Error).message); }
  };
  const promote = async () => {
    if (!promoteId) { setErr('Seleziona un utente da promuovere.'); return; }
    try { await setAccessoRole(promoteId, { isAdmin: true }); setPromoteId(''); await reload(); ok('Utente promosso ad amministrazione.'); }
    catch (e) { setErr((e as Error).message); }
  };

  if (users === null && !err) return <div style={{ ...S.card, color: C.muted }}>Caricamento accessi…</div>;

  return (
    <div>
      {err && (
        <div style={{ background: C.dangerSoft, color: C.danger, borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 12 }}>
          {err} <button onClick={reload} style={{ marginLeft: 6, border: 'none', background: 'transparent', color: C.danger, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Riprova</button>
        </div>
      )}
      {note && <div style={{ background: C.primarySoft, color: C.primary, borderRadius: 10, padding: 10, fontSize: 13, marginBottom: 12 }}>{note}</div>}

      <Sec title="Operatori">
        <div style={{ ...S.muted, marginBottom: 4 }}>Crea l'accesso (email + password temporanea) o reimposta la password. Comunica la password a voce o in chat, non via email.</div>
        {operators.length === 0 && <div style={S.muted}>Nessun operatore. Aggiungine uno qui sotto o da Impostazioni → Operatori.</div>}
        {operators.map((op) => {
          const u = userOf(op.id);
          return (
            <div key={op.id} style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{op.name} <span style={{ ...S.muted, fontWeight: 400 }}>· {op.ruolo}</span></div>
                  <div style={S.muted}>{u ? u.email : 'Nessun accesso'}</div>
                </div>
                <span style={badge(!u)}>{u ? 'Registrato' : 'Non registrato'}</span>
                {u
                  ? <button style={S.btnGhost} onClick={() => setOpen(open === `r:${op.id}` ? '' : `r:${op.id}`)}>Reimposta password</button>
                  : <button style={S.btn} onClick={() => setOpen(open === `c:${op.id}` ? '' : `c:${op.id}`)}>Crea accesso</button>}
              </div>
              {open === `c:${op.id}` && <CredForm withEmail submitLabel="Crea accesso" onCancel={() => setOpen('')} onSubmit={(e, p) => createForOperator(op, e, p)} />}
              {open === `r:${op.id}` && u && <CredForm withEmail={false} submitLabel="Reimposta" onCancel={() => setOpen('')} onSubmit={(e, p) => resetForUser(u, e, p)} />}
            </div>
          );
        })}
      </Sec>

      <Sec title="Nuovo operatore con accesso">
        <div style={{ ...S.muted, marginBottom: 6 }}>Inserisce l'operatore e crea subito il suo accesso.</div>
        <span style={S.label}>Nome e cognome</span>
        <input style={S.input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. ROSSI Maria" />
        <span style={S.label}>Ruolo</span>
        <select style={S.input} value={ruolo} onChange={(e) => setRuolo(e.target.value as Ruolo)}>
          {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {open === 'newOp'
          ? <CredForm withEmail submitLabel="Crea operatore e accesso" onCancel={() => setOpen('')} onSubmit={createNewOperator} />
          : <button style={{ ...S.btn, marginTop: 12 }} onClick={() => { if (!nome.trim()) { setErr('Inserisci nome operatore.'); return; } setErr(null); setOpen('newOp'); }}>Continua →</button>}
      </Sec>

      <Sec title="Amministrazione">
        <div style={{ ...S.muted, marginBottom: 4 }}>Amministratori attuali e creazione di nuovi.</div>
        {admins.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>{a.email || '(senza email)'}</div>
            <span style={badge(false)}>Amministratore</span>
          </div>
        ))}

        <div style={{ marginTop: 14 }}>
          {open === 'newAdmin'
            ? <CredForm withEmail submitLabel="Crea amministratore" onCancel={() => setOpen('')} onSubmit={createAdmin} />
            : <button style={S.btn} onClick={() => setOpen('newAdmin')}>Nuovo amministratore</button>}
        </div>

        <div style={{ marginTop: 16 }}>
          <span style={S.label}>Promuovi un utente esistente ad amministratore</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select style={{ ...S.input, flex: 1 }} value={promoteId} onChange={(e) => setPromoteId(e.target.value)}>
              <option value="">Seleziona utente…</option>
              {promotable.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
            <button style={S.btn} onClick={promote}>Promuovi</button>
          </div>
        </div>
      </Sec>
    </div>
  );
}
