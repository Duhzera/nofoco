/**
 * Perfil da pessoa (Zustand + persistência). Alimenta o cálculo de meta (lib/goal).
 *
 * A distribuição da meta entre as refeições NÃO mora aqui — cada refeição carrega
 * a própria fatia (%) em store/meals, para que criar ou excluir refeição não deixe
 * um percentual órfão para trás.
 *
 * `onboarded` decide se o fluxo de primeira abertura (app/onboarding) já foi feito;
 * `hasHydrated` avisa quando a persistência terminou de carregar, para o gate de
 * navegação não redirecionar com base no valor padrão antes de ler o disco.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Profile } from '@/lib/goal';

const DEFAULT_PROFILE: Profile = {
  sex: 'M',
  age: 28,
  heightCm: 175,
  weightKg: 78,
  activity: 'moderado',
  objective: 'perder',
};

type ProfileState = {
  profile: Profile;
  onboarded: boolean;
  hasHydrated: boolean;
  setProfile: (patch: Partial<Profile>) => void;
  completeOnboarding: () => void;
  setHasHydrated: (v: boolean) => void;
};

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      onboarded: false,
      hasHydrated: false,
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      completeOnboarding: () => set({ onboarded: true }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'nofoco-profile-v2',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // só persiste o que é dado — hasHydrated é sempre calculado em runtime
      partialize: (s) => ({ profile: s.profile, onboarded: s.onboarded }),
      // quem já tinha perfil salvo (antes do onboarding existir) não deve revê-lo
      migrate: (persisted, version) => {
        if (version < 1) return { ...(persisted as object), onboarded: true } as ProfileState;
        return persisted as ProfileState;
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
