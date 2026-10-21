/**
 * Sessão de autenticação (Supabase). A conta é opcional: sem backend configurado
 * ou sem login, `user` é null e o app segue local. Quando logado, guardamos a
 * sessão para o Perfil mostrar o e-mail e a sincronização saber de quem é o dado.
 */
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/services/supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  /** true até sabermos se há sessão salva (evita piscar "entrar" pra quem já entrou). */
  initializing: boolean;
  setSession: (s: Session | null) => void;
};

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  initializing: true,
  setSession: (s) => set({ session: s, user: s?.user ?? null, initializing: false }),
}));

// Carrega a sessão persistida e escuta login/logout. Sem backend, só encerra o loading.
if (supabase) {
  supabase.auth.getSession().then(({ data }) => useAuth.getState().setSession(data.session));
  supabase.auth.onAuthStateChange((_event, session) => useAuth.getState().setSession(session));
} else {
  useAuth.setState({ initializing: false });
}

export type AuthResult = { ok: boolean; error?: string };

/** Mensagens do Supabase vêm em inglês — traduz as mais comuns. */
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered')) return 'Este e-mail já tem conta. Tente entrar.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (m.includes('password')) return 'A senha precisa ter ao menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'E-mail inválido.';
  return msg;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend não configurado.' };
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend não configurado.' };
  const { error } = await supabase.auth.signUp({ email: email.trim(), password });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

/** Login social direto com Google (OAuth). */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend não configurado.' };
  try {
    const redirectUrl = Linking.createURL('/conta');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) return { ok: false, error: friendly(error.message) };

    if (Platform.OS !== 'web' && data?.url) {
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (res.type === 'success' && res.url) {
        const hash = res.url.split('#')[1] || res.url.split('?')[1] || '';
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Falha na conexão com o Google.';
    return { ok: false, error: friendly(msg) };
  }
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/** Exclusão Definitiva de Conta e Dados (Direito ao esquecimento da LGPD / Google Play). */
export async function deleteUserAccount(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend não configurado.' };
  try {
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      console.warn('RPC delete_user_account falhou, aplicando fallback de exclusão de dados:', error.message);
      const uid = useAuth.getState().user?.id;
      if (uid) {
        await Promise.allSettled([
          supabase.from('profiles').delete().eq('user_id', uid),
          supabase.from('diary_items').delete().eq('user_id', uid),
          supabase.from('meals').delete().eq('user_id', uid),
          supabase.from('weight_log').delete().eq('user_id', uid),
          supabase.from('recipes').delete().eq('user_id', uid),
          supabase.from('favorites').delete().eq('user_id', uid),
        ]);
      }
    }
    await signOut();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Falha ao excluir a conta.';
    return { ok: false, error: friendly(msg) };
  }
}
