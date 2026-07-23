/**
 * Perfil da pessoa + distribuição da meta por refeição (Zustand + persistência).
 * Alimenta o cálculo de meta (lib/goal) e a orientação por refeição (lib/pacing).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Profile } from '@/lib/goal';
import { MEALS, type MealKey } from '@/store/diary';

/** Distribuição padrão da meta diária (% por refeição). */
export const DEFAULT_SPLIT: Record<MealKey, number> = {
  cafe: 25,
  lanche_manha: 10,
  almoco: 30,
  lanche_tarde: 10,
  jantar: 25,
};

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
  split: Record<MealKey, number>;
  setProfile: (patch: Partial<Profile>) => void;
  setSplit: (key: MealKey, pct: number) => void;
  resetSplit: () => void;
};

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      split: { ...DEFAULT_SPLIT },
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      setSplit: (key, pct) =>
        set((s) => ({ split: { ...s.split, [key]: Math.max(0, Math.min(100, pct)) } })),
      resetSplit: () => set({ split: { ...DEFAULT_SPLIT } }),
    }),
    {
      name: 'nofoco-profile-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Soma das porcentagens (para normalizar mesmo que não some 100). */
export function splitSum(split: Record<MealKey, number>): number {
  return MEALS.reduce((acc, m) => acc + (split[m.key] ?? 0), 0);
}
