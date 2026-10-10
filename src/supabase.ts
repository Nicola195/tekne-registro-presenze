// Client Supabase (auth + database Postgres).
// Le chiavi NON sono nel codice: arrivano dalle variabili d'ambiente VITE_*.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** true solo se entrambe le variabili d'ambiente sono presenti. */
export const supabaseConfigured = !!(url && key);

if (!supabaseConfigured) {
  // Messaggio esplicito in console; l'app mostrerà una schermata di configurazione.
  // eslint-disable-next-line no-console
  console.error(
    'Variabili Supabase mancanti. Definisci VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY ' +
      'nel file .env (in locale) e nelle Environment variables di Netlify.',
  );
}

/**
 * Tipo di azione presente nel link email di Supabase (invito / recupero password),
 * letto SUBITO all'avvio: supabase-js consuma e ripulisce l'hash dell'URL in modo
 * asincrono, quindi va catturato prima che venga rimosso.
 */
export const authActionType: string = (() => {
  if (typeof window === 'undefined') return '';
  const m = /type=(\w+)/.exec(window.location.hash || '');
  return m ? m[1] : '';
})();

// Se mancano le variabili si usano valori segnaposto: evita il crash all'import,
// l'app intercetta comunque supabaseConfigured === false e avvisa l'utente.
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
