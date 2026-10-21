/**
 * Gerenciamento de Assinatura e Recursos PRO (NoFoco PRO).
 *
 * Modelo Freemium:
 * - Free: 2 análises de prato com IA por dia, contador completo de calorias/macros, tabela TACO.
 * - PRO: Fotos ilimitadas com IA, ajuste fino de macros, previsão avançada de peso, receitas ilimitadas.
 *
 * Integrável com Google Play Billing (RevenueCat).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayKey, type DayKey } from '@/lib/date';

export const FREE_DAILY_PHOTOS = 2;

export type PlanType = 'free' | 'monthly' | 'annual';

type SubscriptionState = {
  isPro: boolean;
  plan: PlanType;
  expiresAt: number | null;
  /** Contador de fotos usadas por dia { '2026-10-21': 1 } */
  dailyUsage: Record<DayKey, number>;

  /** Quantas fotos ainda restam hoje para o usuário */
  remainingPhotosToday: () => number;
  /** Verifica se o usuário tem cota ou é PRO para analisar foto */
  canAnalyzePhoto: () => boolean;
  /** Consome 1 análise de foto do dia */
  consumePhotoScan: () => boolean;

  /** Ativa ou atualiza assinatura PRO */
  setPro: (isPro: boolean, plan?: PlanType, durationDays?: number) => void;
  /** Restaura compras existentes da Google Play */
  restorePurchases: () => Promise<{ success: boolean; message: string }>;
};

export const useSubscription = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      isPro: false,
      plan: 'free',
      expiresAt: null,
      dailyUsage: {},

      remainingPhotosToday: () => {
        const { isPro, dailyUsage } = get();
        if (isPro) return Infinity;
        const today = todayKey();
        const used = dailyUsage[today] ?? 0;
        return Math.max(0, FREE_DAILY_PHOTOS - used);
      },

      canAnalyzePhoto: () => {
        const { isPro, remainingPhotosToday } = get();
        if (isPro) return true;
        return remainingPhotosToday() > 0;
      },

      consumePhotoScan: () => {
        const { isPro, canAnalyzePhoto } = get();
        if (isPro) return true;
        if (!canAnalyzePhoto()) return false;

        const today = todayKey();
        set((s) => ({
          dailyUsage: {
            ...s.dailyUsage,
            [today]: (s.dailyUsage[today] ?? 0) + 1,
          },
        }));
        return true;
      },

      setPro: (isPro, plan = 'annual', durationDays = 365) => {
        const expiresAt = isPro ? Date.now() + durationDays * 24 * 60 * 60 * 1000 : null;
        set({
          isPro,
          plan: isPro ? plan : 'free',
          expiresAt,
        });
      },

      restorePurchases: async () => {
        // Simulação de verificação com a Google Play Store
        await new Promise((r) => setTimeout(r, 800));
        const { isPro } = get();
        if (isPro) {
          return { success: true, message: 'Sua assinatura NoFoco PRO está ativa!' };
        }
        return { success: false, message: 'Nenhuma assinatura ativa encontrada para esta conta Google Play.' };
      },
    }),
    {
      name: 'nofoco-subscription-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        isPro: s.isPro,
        plan: s.plan,
        expiresAt: s.expiresAt,
        dailyUsage: s.dailyUsage,
      }),
    },
  ),
);
