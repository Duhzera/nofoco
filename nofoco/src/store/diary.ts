/**
 * Estado do diário alimentar (Zustand + persistência AsyncStorage).
 * Guarda os itens adicionados por refeição; sobrevive a fechar o app.
 * Por ora é um único dia (mock). Multi-dia/data entra junto com o backend.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Nutrients } from '@/data/foods';

export type MealKey = 'cafe' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'jantar';

export type MealDef = { key: MealKey; name: string; time: string; emoji: string };

export const MEALS: MealDef[] = [
  { key: 'cafe', name: 'Café da manhã', time: '08:00', emoji: '🍳' },
  { key: 'lanche_manha', name: 'Lanche da manhã', time: '10:30', emoji: '🥪' },
  { key: 'almoco', name: 'Almoço', time: '13:00', emoji: '🍽️' },
  { key: 'lanche_tarde', name: 'Lanche da tarde', time: '16:00', emoji: '🥗' },
  { key: 'jantar', name: 'Jantar', time: '19:00', emoji: '🌙' },
];

export function mealDef(key: MealKey): MealDef {
  return MEALS.find((m) => m.key === key) ?? MEALS[0];
}

/** Item lançado no diário — guarda snapshot dos macros (ver plano §5). */
export type DiaryItem = {
  id: string;
  foodId: string;
  name: string;
  emoji: string;
  grams: number;
  portionLabel: string; // ex.: "2 un (90 g)" ou "80 g"
  macros: Nutrients;
};

type DiaryState = {
  items: Record<MealKey, DiaryItem[]>;
  addItem: (meal: MealKey, item: DiaryItem) => void;
  removeItem: (meal: MealKey, id: string) => void;
  clearDay: () => void;
};

const emptyItems = (): Record<MealKey, DiaryItem[]> => ({
  cafe: [],
  lanche_manha: [],
  almoco: [],
  lanche_tarde: [],
  jantar: [],
});

export const useDiary = create<DiaryState>()(
  persist(
    (set) => ({
      items: emptyItems(),
      addItem: (meal, item) =>
        set((s) => ({ items: { ...s.items, [meal]: [...s.items[meal], item] } })),
      removeItem: (meal, id) =>
        set((s) => ({ items: { ...s.items, [meal]: s.items[meal].filter((i) => i.id !== id) } })),
      clearDay: () => set({ items: emptyItems() }),
    }),
    {
      name: 'nofoco-diary-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

const ZERO: Nutrients = { kcal: 0, carb: 0, protein: 0, fat: 0, sugar: 0, fiber: 0, sodium: 0 };

export function sumMacros(items: DiaryItem[]): Nutrients {
  return items.reduce<Nutrients>(
    (acc, it) => ({
      kcal: acc.kcal + it.macros.kcal,
      carb: round1(acc.carb + it.macros.carb),
      protein: round1(acc.protein + it.macros.protein),
      fat: round1(acc.fat + it.macros.fat),
      sugar: round1(acc.sugar + it.macros.sugar),
      fiber: round1(acc.fiber + it.macros.fiber),
      sodium: acc.sodium + it.macros.sodium,
    }),
    { ...ZERO },
  );
}

/** Total do dia inteiro (todas as refeições). */
export function dayMacros(items: Record<MealKey, DiaryItem[]>): Nutrients {
  return sumMacros(MEALS.flatMap((m) => items[m.key]));
}

/** kcal consumido por refeição (para a orientação — ver lib/pacing). */
export function kcalByMeal(items: Record<MealKey, DiaryItem[]>): Record<MealKey, number> {
  return {
    cafe: sumMacros(items.cafe).kcal,
    lanche_manha: sumMacros(items.lanche_manha).kcal,
    almoco: sumMacros(items.almoco).kcal,
    lanche_tarde: sumMacros(items.lanche_tarde).kcal,
    jantar: sumMacros(items.jantar).kcal,
  };
}

/** id único para um item novo. */
export function newItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
