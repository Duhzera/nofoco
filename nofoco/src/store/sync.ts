/**
 * Orquestra a sincronização (ver services/sync). Regras, pensadas para NÃO perder
 * dados no fluxo comum (um dono, geralmente um aparelho, às vezes trocando):
 *
 *  - Login numa conta nova PARA ESTE APARELHO (boundUser ≠ uid):
 *      remoto tem dados → PULL (restaura a conta neste aparelho);
 *      remoto vazio      → PUSH (semeia o remoto com o que já existe aqui).
 *  - Mesmo aparelho/conta de sempre (boundUser === uid): não puxa sozinho no
 *      arranque (evita sobrescrever alterações offline); segue com auto-push.
 *  - Auto-push: toda mudança local, com debounce, sobe pro remoto (espelho).
 *  - Botões manuais: "Sincronizar agora" (push) e "Restaurar do backup" (pull).
 *
 * boundUser/lastSyncAt são persistidos para o arranque saber se este aparelho já
 * está casado com a conta. Sem backend configurado, tudo vira no-op.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { pullAll, pushAll, remoteHasData } from '@/services/sync';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/store/auth';
import { useDiary } from '@/store/diary';
import { useMeals } from '@/store/meals';
import { useProfile } from '@/store/profile';
import { useWeight } from '@/store/weight';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'done' | 'error';

type SyncState = {
  status: SyncStatus;
  lastSyncAt: number | null;
  error: string | null;
  boundUser: string | null;
  /** Envia o local para o remoto (backup manual). */
  syncNow: () => Promise<void>;
  /** Baixa o remoto e substitui o local (restauração manual). */
  restore: () => Promise<void>;
};

const errMsg = (e: unknown): string => {
  if (!e) return 'Erro desconhecido na sincronização.';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  if (typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error_description === 'string') return obj.error_description;
    if (typeof obj.hint === 'string') return obj.hint;
    try {
      return JSON.stringify(e);
    } catch {
      return 'Erro na comunicação com o banco de dados.';
    }
  }
  return String(e);
};

/**
 * Enquanto aplicamos um pull, os stores mudam e disparariam auto-push de volta.
 * Este sinal segura o auto-push durante a aplicação.
 */
let applying = false;

export const useSync = create<SyncState>()(
  persist(
    (set) => ({
      status: supabase ? 'idle' : 'off',
      lastSyncAt: null,
      error: null,
      boundUser: null,

      syncNow: async () => {
        const uid = useAuth.getState().user?.id;
        if (!supabase || !uid) return;
        set({ status: 'syncing', error: null });
        try {
          await pushAll(uid);
          set({ status: 'done', error: null, lastSyncAt: Date.now() });
        } catch (e) {
          set({ status: 'error', error: errMsg(e) });
        }
      },

      restore: async () => {
        const uid = useAuth.getState().user?.id;
        if (!supabase || !uid) return;
        set({ status: 'syncing', error: null });
        try {
          const has = await remoteHasData(uid);
          if (!has) {
            set({
              status: 'idle',
              error: 'Nenhum backup encontrado na nuvem para esta conta. Seus dados locais foram mantidos.',
            });
            return;
          }
          applying = true;
          await pullAll(uid);
          set({ status: 'done', error: null, lastSyncAt: Date.now() });
        } catch (e) {
          set({ status: 'error', error: errMsg(e) });
        } finally {
          setTimeout(() => (applying = false), 0);
        }
      },
    }),
    {
      name: 'nofoco-sync-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ boundUser: s.boundUser, lastSyncAt: s.lastSyncAt }),
    },
  ),
);

/** Casa este aparelho com a conta no login (pull ou push conforme o caso). */
async function bind(uid: string) {
  if (!supabase) return;
  if (useSync.getState().boundUser === uid) return; // já casado: segue com auto-push
  useSync.setState({ status: 'syncing', error: null });
  try {
    const has = await remoteHasData(uid);
    if (has) {
      applying = true;
      await pullAll(uid);
    } else {
      await pushAll(uid);
    }
    useSync.setState({ boundUser: uid, status: 'done', error: null, lastSyncAt: Date.now() });
  } catch (e) {
    useSync.setState({ status: 'error', error: errMsg(e) });
  } finally {
    setTimeout(() => (applying = false), 0);
  }
}

if (supabase) {
  // reage a login/logout
  useAuth.subscribe((s) => {
    const uid = s.user?.id ?? null;
    if (uid) void bind(uid);
    else useSync.setState({ boundUser: null, status: 'idle', error: null });
  });
  // caso já exista sessão no arranque
  const current = useAuth.getState().user?.id;
  if (current) void bind(current);

  // auto-push (debounced) em qualquer mudança dos stores de dados
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedulePush = () => {
    if (applying) return;
    if (!useSync.getState().boundUser) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void useSync.getState().syncNow(), 2500);
  };
  useProfile.subscribe(schedulePush);
  useMeals.subscribe(schedulePush);
  useWeight.subscribe(schedulePush);
  useDiary.subscribe(schedulePush);
}
