/**
 * Perfil da pessoa (Zustand + persistência). Alimenta o cálculo de meta (lib/goal).
 *
 * A distribuição da meta entre as refeições NÃO mora aqui — cada refeição carrega
 * a própria fatia (%) em store/meals, para que criar ou excluir refeição não deixe
 * um percentual órfão para trás.
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
  setProfile: (patch: Partial<Profile>) => void;
};

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
    }),
    {
      name: 'nofoco-profile-v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
