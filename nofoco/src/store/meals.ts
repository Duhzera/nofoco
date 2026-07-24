/**
 * Refeições do dia (Zustand + persistência).
 *
 * A pessoa decide quantas refeições tem e como se chamam — 3, 5, 7, tanto faz.
 * Cada refeição carrega sua própria fatia (%) da meta diária, então a lista é a
 * única fonte de verdade: o pacing (lib/pacing) e o diário (store/diary) leem daqui.
 * A lista fica sempre ordenada por horário.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type MealId = string;

export type Meal = {
  id: MealId;
  name: string;
  time: string; // 'HH:MM'
  emoji: string;
  pct: number; // fatia da meta diária (não precisa somar 100 — o app normaliza)
};

/** Ponto de partida de quem acabou de instalar. */
export const DEFAULT_MEALS: Meal[] = [
  { id: 'cafe', name: 'Café da manhã', time: '08:00', emoji: '🍳', pct: 25 },
  { id: 'lanche_manha', name: 'Lanche da manhã', time: '10:30', emoji: '🥪', pct: 10 },
  { id: 'almoco', name: 'Almoço', time: '13:00', emoji: '🍽️', pct: 30 },
  { id: 'lanche_tarde', name: 'Lanche da tarde', time: '16:00', emoji: '🥗', pct: 10 },
  { id: 'jantar', name: 'Jantar', time: '19:00', emoji: '🌙', pct: 25 },
];

/** Emojis oferecidos ao criar/editar uma refeição. */
export const MEAL_EMOJIS = [
  '🍳', '🥪', '🍽️', '🥗', '🌙', '🍎', '☕', '🥤', '🍪', '🌮', '🍜', '🥛', '🍫', '🧃', '🍇', '🥣',
];

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function minutesToTime(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function byTime(a: Meal, b: Meal): number {
  return timeToMinutes(a.time) - timeToMinutes(b.time);
}

function newMealId(): MealId {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type MealsState = {
  meals: Meal[];
  addMeal: (draft: Omit<Meal, 'id'>) => MealId;
  updateMeal: (id: MealId, patch: Partial<Omit<Meal, 'id'>>) => void;
  removeMeal: (id: MealId) => void;
  resetMeals: () => void;
};

export const useMeals = create<MealsState>()(
  persist(
    (set) => ({
      meals: [...DEFAULT_MEALS],

      addMeal: (draft) => {
        const id = newMealId();
        set((s) => ({ meals: [...s.meals, { ...draft, id }].sort(byTime) }));
        return id;
      },

      updateMeal: (id, patch) =>
        set((s) => ({
          meals: s.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)).sort(byTime),
        })),

      /** Some com a refeição. Os itens lançados nela são limpos por quem chama (ver store/diary). */
      removeMeal: (id) => set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),

      resetMeals: () => set({ meals: [...DEFAULT_MEALS] }),
    }),
    {
      name: 'nofoco-meals-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Soma das porcentagens — usada para normalizar mesmo quando não dá 100. */
export function pctSum(meals: Meal[]): number {
  return meals.reduce((acc, m) => acc + (m.pct || 0), 0);
}

export function findMeal(meals: Meal[], id: MealId | undefined): Meal | undefined {
  return meals.find((m) => m.id === id);
}

/**
 * % sugerida para uma refeição nova: divide o "espaço" que sobra até 100.
 * Se já passou de 100, oferece uma fatia pequena — o app normaliza de qualquer jeito.
 */
export function suggestedPct(meals: Meal[]): number {
  const left = 100 - pctSum(meals);
  return left >= 5 ? Math.round(left) : 10;
}
