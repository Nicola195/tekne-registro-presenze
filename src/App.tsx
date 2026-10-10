import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Session, Operator, Nominativo, extraFor } from './model';
import { AppData, loadAll, readLocal, cacheLocal, saveBlock, saveOperators, saveNominativi, saveUnlocked, saveTariffe, blockOf, errMsg } from './store';
import { C, useWide } from './ui';
import { DayView } from './components/DayView';
import { SummaryView } from './components/SummaryView';
import { ReportsView } from './components/ReportsView';
import { AdminSettings } from './components/AdminSettings';
import { PeriodState, initialPeriod, OperatorSelect } from './components/PeriodPicker';
import { ADMIN_ID, Header, Footer, LoginView } from './components/Shell';

type Tab = 'giorno' | 'riepilogo' | 'estrazioni' | 'impostazioni';
type Sync = 'loading' | 'ok' | 'saving' | 'error';

const PROFILE_KEY = 'registro-ore-profilo';

export const App = () => {
  const wide = useWide();
  const [tab, setTab] = useState<Tab>('giorno');
  const [data, setData] = useState<AppData>({ operators: [], nominativi: [], sessions: [], unlocked: [], tariffe: [] });
  const [loaded, setLoaded] = useState(false);
  const [, setSync] = useState<Sync>('loading');
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodState>(initialPeriod);
  const [viewOpId, setViewOpId] = useState('');
  const [profile, setProfileState] = useState<string>(() => {
    try { return localStorage.getItem(PROFILE_KEY) || ''; } catch { return ''; }
  });
  const ref = useRef(data);
  ref.current = data;

  const load = useCallback(async () => {
    setSync('loading'); setError(null);
    const cached = readLocal();
    if (cached) { setData(cached); setLoaded(true); }
    try {
      const d = await loadAll();
      setData(d); setLoaded(true); setSync('ok');
    } catch (e) {
      setError(`Impossibile caricare i dati salvati: ${errMsg(e)}`); setSync('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isAdmin = profile === ADMIN_ID;
  const me = data.operators.find((o) => o.id === profile);
  const loggedIn = isAdmin || !!me;
  // L'amministrazione non ha un operatore predefinito: va scelto esplicitamente.
  const viewOp: Operator | undefined = isAdmin ? data.operators.find((o) => o.id === viewOpId) : me;

  const setProfile = (id: string) => {
    setProfileState(id);
    setTab(id === ADMIN_ID ? 'riepilogo' : 'giorno');
    try {
      if (id) localStorage.setItem(PROFILE_KEY, id);
      else localStorage.removeItem(PROFILE_KEY);
    } catch { /* ignora */ }
  };
  const logout = () => { if (window.confirm('Vuoi uscire dal profilo?')) setProfile(''); };

  const update = (next: AppData) => { ref.current = next; setData(next); cacheLocal(next); };

  const persist = async (job: () => Promise<unknown>) => {
    setSync('saving');
    try { await job(); setSync('ok'); setError(null); } catch (e) { setSync('error'); setError(`Salvataggio non riuscito: ${errMsg(e)}`); }
  };

  const viewSessions = useMemo(() => (viewOp ? data.sessions.filter((s) => s.operatorId === viewOp.id) : []), [data.sessions, viewOp?.id]);

  const onReplace = (removeIds: string[], add: Session[]) => {
    if (!me) return; // solo le operatrici inseriscono ore
    const prev = ref.current;
    const removed = prev.sessions.filter((s) => removeIds.includes(s.id));
    // ogni registrazione appartiene all'operatrice collegata; extra = nominativi non associati a lei
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
  const onTariffe = (t: import('./model').TariffaVoce[]) => { update({ ...ref.current, tariffe: t }); persist(() => saveTariffe(t)); };
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

  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  if (!loaded) {
    return <div style={{ minHeight: '100vh', background: C.bg, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>Caricamento dati…</div>;
  }
  if (!loggedIn) return <LoginView operators={data.operators} onLogin={setProfile} />;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
      <Header wide={wide} nav={tabs.map(([k, i, l]) => navBtn(k, i, l))} onLogout={logout} />

      <main style={{ flex: 1, width: '100%', maxWidth: 1440, margin: '0 auto', padding: wide ? '20px 24px 32px' : '12px 12px 90px', boxSizing: 'border-box' }}>
        {error && (
          <div style={{ background: C.dangerSoft, color: C.danger, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 14 }}>
            {error} <button onClick={load} style={{ marginLeft: 8, border: 'none', background: 'transparent', color: C.danger, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Riprova</button>
          </div>
        )}
        {/* L'amministrazione sceglie l'operatore con una combolist; il Riepilogo ha la propria. */}
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
