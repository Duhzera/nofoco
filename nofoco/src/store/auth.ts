/**
 * Sessão de autenticação (Supabase). A conta é opcional: sem backend configurado
 * ou sem login, `user` é null e o app segue local. Quando logado, guardamos a
 * sessão para o Perfil mostrar o e-mail e a sincronização saber de quem é o dado.
 */
import type { Session, User } from '@supabase/supabase-js';
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

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
