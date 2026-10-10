import { useState } from 'react';
import { Auth } from '../auth';
import { ENTE, LOGO_PNG } from '../branding';
import { C, S } from '../ui';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Contenitore centrato con logo e intestazione, condiviso dalle schermate di accesso. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box', fontFamily: font }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img src={LOGO_PNG} alt="TEKNE" style={{ width: 100, height: 100, objectFit: 'contain' }} />
          <div style={{ fontSize: 24, fontWeight: 800, color: C.primary, marginTop: 8 }}>Registro Ore</div>
          <div style={{ ...S.muted, marginTop: 2 }}>{ENTE.nome}</div>
        </div>
        <div style={{ ...S.card, borderTop: `5px solid ${C.yellow}` }}>{children}</div>
      </div>
    </div>
  );
}

/** Accesso con email e credenziale, con impostazione credenziale (invito/recupero) e recupero. */
export function Login({ auth }: { auth: Auth }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true); setMsg(null); setInfo(null);
    const err = await fn();
    setBusy(false);
    if (err) setMsg(err);
    return err;
  };

  // Impostazione della credenziale dopo invito o recupero.
  if (auth.phase === 'needsPwd') {
    const save = () =>
      run(async () => {
        if (pwd.length < 8) return 'La password deve avere almeno 8 caratteri.';
        if (pwd !== pwd2) return 'Le due password non coincidono.';
        return auth.savePwd(pwd);
      });
    return (
      <Frame>
        <div style={S.h2}>Imposta la password</div>
        <div style={{ ...S.muted, marginBottom: 10 }}>Scegli una password per il tuo accesso. Ti servirà per entrare le prossime volte.</div>
        <span style={S.label}>Nuova password</span>
        <input style={S.input} type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Almeno 8 caratteri" />
        <span style={S.label}>Ripeti la password</span>
        <input style={S.input} type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        {msg && <div style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{msg}</div>}
        <button style={{ ...S.btn, width: '100%', marginTop: 16, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>Salva e accedi</button>
      </Frame>
    );
  }

  // Account autenticato ma non ancora collegato a un profilo.
  if (auth.phase === 'noProfile') {
    return (
      <Frame>
        <div style={S.h2}>Account non ancora abilitato</div>
        <div style={{ ...S.muted, marginBottom: 10, lineHeight: 1.5 }}>
          Il tuo accesso è attivo ({auth.email}) ma non è ancora collegato a un operatore.
          Contatta l'amministrazione per il completamento.
        </div>
        <button style={{ ...S.btnGhost, width: '100%', marginTop: 8 }} onClick={() => auth.signOut()}>Esci</button>
      </Frame>
    );
  }

  // Accesso normale.
  const doLogin = () =>
    run(async () => {
      if (!email.trim() || !pwd) return 'Inserisci email e password.';
      return auth.signIn(email, pwd);
    });
  const doReset = async () => {
    if (!email.trim()) { setMsg('Inserisci prima la tua email, poi tocca di nuovo "Password dimenticata?".'); return; }
    const err = await run(() => auth.sendReset(email));
    if (!err) setInfo('Se l\'email è registrata, riceverai un link per reimpostare la password.');
  };

  return (
    <Frame>
      <div style={S.h2}>Accedi</div>
      <span style={S.label}>Email</span>
      <input style={S.input} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" />
      <span style={S.label}>Password</span>
      <input style={S.input} type="password" autoComplete="current-password" value={pwd} onChange={(e) => setPwd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doLogin()} />
      {msg && <div style={{ color: C.danger, fontSize: 13, marginTop: 10 }}>{msg}</div>}
      {info && <div style={{ color: C.primary, fontSize: 13, marginTop: 10 }}>{info}</div>}
      <button style={{ ...S.btn, width: '100%', marginTop: 16, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={doLogin}>Accedi</button>
      <button style={{ border: 'none', background: 'transparent', color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 12, width: '100%', textAlign: 'center' }} onClick={doReset}>
        Password dimenticata?
      </button>
    </Frame>
  );
}
