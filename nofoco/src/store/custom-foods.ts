/**
 * Alimentos criados pelo usuário (ex.: cadastro manual ou leitura de tabela nutricional por foto).
 * Ficam salvos no aparelho via AsyncStorage e são registrados no catálogo em runtime (rememberFood).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { rememberFood, type Food } from '@/data/foods';

type CustomFoodsState = {
  customFoods: Food[];
  addCustomFood: (food: Food) => void;
  removeCustomFood: (id: string) => void;
};

export const useCustomFoods = create<CustomFoodsState>()(
  persist(
    (set, get) => ({
      customFoods: [],

      addCustomFood: (food: Food) => {
        rememberFood(food);
        set((s) => ({
          customFoods: [food, ...s.customFoods.filter((f) => f.id !== food.id)],
        }));
      },

      removeCustomFood: (id: string) => {
        set((s) => ({
          customFoods: s.customFoods.filter((f) => f.id !== id),
        }));
      },
    }),
    {
      name: 'nofoco-custom-foods-v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Ao carregar a persistência, registra todos os alimentos personalizados no catálogo
        if (state?.customFoods) {
          state.customFoods.forEach((f) => rememberFood(f));
        }
      },
    },
  ),
);
