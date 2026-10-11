// Client della Edge Function "admin-users" (gestione utenze, solo amministrazione).
// La funzione gira lato server e usa la service_role; qui si invia solo l'azione.
import { supabase } from './supabase';

export interface AccessUser {
  id: string;
  email: string;
  confirmed: boolean;
  operatorId: string | null;
  isAdmin: boolean;
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } });
  if (error) {
    let msg = error.message || 'Errore della funzione.';
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      const j = ctx?.json ? await ctx.json() : null;
      if (j?.error) msg = j.error;
    } catch {
      /* lascia il messaggio generico */
    }
    throw new Error(msg);
  }
  if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
  return data as T;
}

/** Elenco di tutti gli utenti con stato e profilo. */
export const listAccessi = () => call<{ users: AccessUser[] }>('list').then((d) => d.users);

/** Crea un utente (email + password temporanea, già confermato) e il relativo profilo. */
export const createAccesso = (p: { email: string; pwd: string; operatorId: string | null; isAdmin: boolean }) =>
  call<{ ok: true; id: string }>('create', p);

/** Reimposta la password di un utente esistente. */
export const setAccessoPwd = (userId: string, pwd: string) => call<{ ok: true }>('setPwd', { userId, pwd });

/** Aggiorna il profilo di un utente (operatore collegato / amministratore). */
export const setAccessoRole = (userId: string, p: { operatorId?: string | null; isAdmin?: boolean }) =>
  call<{ ok: true }>('setRole', { userId, ...p });
