import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Session, Operator, Nominativo, TariffaVoce, extraFor } from './model';
import { AppData, loadAll, saveBlock, saveOperators, saveNominativi, saveUnlocked, saveTariffe, blockOf, errMsg } from './store';
import { C, useWide } from './ui';
import { DayView } from './components/DayView';
import { SummaryView } from './components/SummaryView';
import { ReportsView } from './components/ReportsView';
import { AdminSettings } from './components/AdminSettings';
import { PeriodState, initialPeriod, OperatorSelect } from './components/PeriodPicker';
import { Header, Footer } from './components/Shell';
import { Login } from './components/Login';
import { useAuth } from './auth';
import { supabaseConfigured } from './supabase';

type Tab = 'giorno' | 'riepilogo' | 'estrazioni' | 'impostazioni';
type Sync = 'loading' | 'ok' | 'saving' | 'error';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const EMPTY: AppData = { operators: [], nominativi: [], sessions: [], unlocked: [], tariffe: [] };

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div style={{ minHeight: '100vh', background: C.bg, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, padding: 24, textAlign: 'center' }}>{children}</div>
);

export const App = () => {
  const wide = useWide();
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('giorno');
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [, setSync] = useState<Sync>('loading');
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodState>(initialPeriod);
  const [viewOpId, setViewOpId] = useState('');
  const ref = useRef(data);
  ref.current = data;

  const isAdmin = !!auth.profile?.isAdmin;
  const ready = auth.phase === 'ready';

  const load = useCallback(async () => {
    setSync('loading'); setError(null);
    try {
      const d = await loadAll({ isAdmin });
      setData(d); setLoaded(true); setSync('ok');
    } catch (e) {
      setError(`Impossibile caricare i dati: ${errMsg(e)}`); setSync('error'); setLoaded(true);
    }
  }, [isAdmin]);

  // Carica i dati solo quando l'utente è autenticato e col profilo pronto.
  useEffect(() => {
    if (ready) load();
    else { setData(EMPTY); setLoaded(false); }
  }, [ready, load]);

  // L'operatrice collegata al profilo (null per l'amministrazione).
  const me = useMemo(
    () => (auth.profile?.operatorId ? data.operators.find((o) => o.id === auth.profile!.operatorId) : undefined),
    [data.operators, auth.profile?.operatorId],
  );
  // L'amministrazione sceglie quale operatore consultare; l'operatrice vede sé stessa.
  const viewOp: Operator | undefined = isAdmin ? data.operators.find((o) => o.id === viewOpId) : me;

  const logout = () => { if (window.confirm('Vuoi uscire?')) auth.signOut(); };

  const update = (next: AppData) => { ref.current = next; setData(next); };

  const persist = async (job: () => Promise<unknown>) => {
    setSync('saving');
    try { await job(); setSync('ok'); setError(null); } catch (e) { setSync('error'); setError(`Salvataggio non riuscito: ${errMsg(e)}`); }
  };

  const viewSessions = useMemo(() => (viewOp ? data.sessions.filter((s) => s.operatorId === viewOp.id) : []), [data.sessions, viewOp?.id]);

  const onReplace = (removeIds: string[], add: Session[]) => {
    if (!me) return; // solo le operatrici inseriscono ore
    const prev = ref.current;
    const removed = prev.sessions.filter((s) => removeIds.includes(s.id));
    const stamped = add.map((s) => {
      const extra = extraFor(s.names, me.id, prev.nominativi);
      return { ...s, operatorId: me.id, extraNames: extra.length ? extra : undefined, coverOf: extra.length ? s.coverOf : undefined };
    });
    const sessions = [...prev.sessions.filter((s) => !removeIds.includes(s.id)), ...stamped];
    update({ ...prev, sessions });
    const keys = new Set([...removed, ...stamped].map(blockOf));
    persist(async () => { for (const k of keys) await saveBlock(k, sessions.filter((s) => blockOf(s) === k)); });
  };

  const onOperators = (ops: Operator[]) => { update({ ...ref.current, operators: ops }); persist(() => saveOperators(ops)); };
  const onNominativi = (n: Nominativo[]) => { update({ ...ref.current, nominativi: n }); persist(() => saveNominativi(n)); };
  const onTariffe = (t: TariffaVoce[]) => { update({ ...ref.current, tariffe: t }); persist(() => saveTariffe(t)); };
  const onToggleUnlock = (iso: string) => {
    const cur = ref.current.unlocked || [];
    const next = cur.includes(iso) ? cur.filter((d) => d !== iso) : [...cur, iso];
    update({ ...ref.current, unlocked: next });
    persist(() => saveUnlocked(next));
  };

  const openDay = (d: string) => { setPeriod((pp) => ({ ...pp, mode: 'giorno', day: d })); setTab('giorno'); };

  const allTabs: [Tab, string, string][] = [
    ['giorno', isAdmin ? '👁' : '✏️', 'Presenze'],
    ['riepilogo', '📊', 'Riepilogo'],
    ['estrazioni', '⬇️', 'Estrazioni'],
    ['impostazioni', '⚙️', 'Impostazioni'],
  ];
  const tabs = allTabs.filter(([k]) => isAdmin || k !== 'impostazioni');
  const t: Tab = !isAdmin && tab === 'impostazioni' ? 'giorno' : tab;

  const navBtn = (k: Tab, icon: string, label: string) => {
    const active = t === k;
    return wide ? (
      <button key={k} onClick={() => setTab(k)}
        style={{ border: 'none', cursor: 'pointer', borderRadius: 10, padding: '9px 14px', fontSize: 14, fontWeight: 600,
          background: active ? C.yellow : 'transparent', color: active ? C.primaryDark : '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>{label}
      </button>
    ) : (
      <button key={k} onClick={() => setTab(k)}
        style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 0 10px', cursor: 'pointer', color: active ? C.primary : C.muted,
          fontWeight: active ? 700 : 500, fontSize: 12, borderTop: `3px solid ${active ? C.yellow : 'transparent'}` }}>
        <div style={{ fontSize: 20 }}>{icon}</div>{label}
      </button>
    );
  };

  // ---------- Stati non autenticati ----------
  if (!supabaseConfigured) {
    return (
      <Centered>
        <div style={{ maxWidth: 460 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.primary, marginBottom: 8 }}>Configurazione mancante</div>
          <div style={{ lineHeight: 1.5 }}>
            Mancano le variabili d'ambiente di Supabase. Definisci <b>VITE_SUPABASE_URL</b> e <b>VITE_SUPABASE_PUBLISHABLE_KEY</b> nel file <code>.env</code> (in locale) e nelle Environment variables di Netlify, poi ricarica.
          </div>
        </div>
      </Centered>
    );
  }
  if (auth.phase === 'loading') return <Centered>Caricamento…</Centered>;
  if (auth.phase !== 'ready') return <Login auth={auth} />;
  if (!loaded) return <Centered>Caricamento dati…</Centered>;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <Header wide={wide} nav={tabs.map(([k, i, l]) => navBtn(k, i, l))} onLogout={logout} />

      <main style={{ flex: 1, width: '100%', maxWidth: 1440, margin: '0 auto', padding: wide ? '20px 24px 32px' : '12px 12px 90px', boxSizing: 'border-box' }}>
        {error && (
          <div style={{ background: C.dangerSoft, color: C.danger, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 14 }}>
            {error} <button onClick={load} style={{ marginLeft: 8, border: 'none', background: 'transparent', color: C.danger, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Riprova</button>
          </div>
        )}
        {isAdmin && (t === 'giorno' || t === 'estrazioni') && (
          <OperatorSelect operators={data.operators} value={viewOpId} onChange={setViewOpId} />
        )}

        {t === 'giorno' && (
          isAdmin && !viewOp ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, textAlign: 'center', color: C.muted }}>
              Seleziona un operatore per vederne le presenze.
            </div>
          ) : viewOp ? (
            <DayView period={period} setPeriod={setPeriod} sessions={viewSessions} opId={viewOp.id} nominativi={data.nominativi} operators={data.operators}
              voci={data.tariffe.map((tt) => tt.nome)} onReplace={onReplace} readOnly={isAdmin} unlocked={data.unlocked} isAdmin={isAdmin} onToggleUnlock={onToggleUnlock} />
          ) : null
        )}
        {t === 'riepilogo' && (
          <SummaryView period={period} setPeriod={setPeriod} sessions={data.sessions} operators={data.operators} nominativi={data.nominativi}
            viewOp={viewOp} isAdmin={isAdmin} tariffe={data.tariffe} setViewOp={setViewOpId} onOpenDay={openDay} onGoExport={() => setTab('estrazioni')} unlocked={data.unlocked} />
        )}
        {t === 'estrazioni' && (
          <ReportsView period={period} setPeriod={setPeriod} sessions={data.sessions} nominativi={data.nominativi} operators={data.operators}
            viewOp={viewOp} isAdmin={isAdmin} tariffe={data.tariffe} unlocked={data.unlocked} />
        )}
        {t === 'impostazioni' && isAdmin && (
          <AdminSettings operators={data.operators} nominativi={data.nominativi} sessions={data.sessions} tariffe={data.tariffe}
            onOperators={onOperators} onNominativi={onNominativi} onTariffe={onTariffe} />
        )}
      </main>

      <Footer wide={wide} />

      {!wide && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 30, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {tabs.map(([k, i, l]) => navBtn(k, i, l))}
        </nav>
      )}
    </div>
  );
};

export default App;
