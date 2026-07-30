/**
 * Estado do diário alimentar (Zustand + persistência AsyncStorage).
 * Guarda os itens lançados **por dia e por refeição**; sobrevive a fechar o app.
 *
 * As refeições em si vivem em store/meals — aqui só existe o mapa
 * "data → id da refeição → itens lançados", que aceita qualquer id.
 * O dia que está sendo exibido é estado de navegação e mora em store/day.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayKey, type DayKey } from '@/lib/date';
import type { Nutrients } from '@/data/foods';
import type { Meal, MealId } from '@/store/meals';

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

/** Itens de um dia, indexados pela refeição. */
export type DiaryItems = Record<MealId, DiaryItem[]>;

/** Todos os dias já registrados. */
export type DiaryDays = Record<DayKey, DiaryItems>;

type DiaryState = {
  days: DiaryDays;
  addItem: (day: DayKey, meal: MealId, item: DiaryItem) => void;
  /**
   * Salva a edição de um item já lançado. Quando `prevMeal` e `nextMeal` diferem,
   * o item muda de refeição em vez de ser duplicado.
   */
  saveItem: (day: DayKey, prevMeal: MealId, nextMeal: MealId, item: DiaryItem) => void;
  removeItems: (day: DayKey, meal: MealId, ids: string[]) => void;
  clearMeal: (day: DayKey, meal: MealId) => void;
  /** Descarta os itens de uma refeição excluída — em todos os dias. */
  dropMeal: (meal: MealId) => void;
  clearDay: (day: DayKey) => void;
};

/** Aplica uma transformação nos itens de um dia, preservando os demais dias. */
function patchDay(days: DiaryDays, day: DayKey, fn: (items: DiaryItems) => DiaryItems): DiaryDays {
  return { ...days, [day]: fn(days[day] ?? {}) };
}

export const useDiary = create<DiaryState>()(
  persist(
    (set) => ({
      days: {},

      addItem: (day, meal, item) =>
        set((s) => ({
          days: patchDay(s.days, day, (it) => ({ ...it, [meal]: [...(it[meal] ?? []), item] })),
        })),

      saveItem: (day, prevMeal, nextMeal, item) =>
        set((s) => ({
          days: patchDay(s.days, day, (it) =>
            prevMeal === nextMeal
              ? { ...it, [nextMeal]: (it[nextMeal] ?? []).map((i) => (i.id === item.id ? item : i)) }
              : {
                  ...it,
                  [prevMeal]: (it[prevMeal] ?? []).filter((i) => i.id !== item.id),
                  [nextMeal]: [...(it[nextMeal] ?? []), item],
                },
          ),
        })),

      removeItems: (day, meal, ids) =>
        set((s) => ({
          days: patchDay(s.days, day, (it) => ({
            ...it,
            [meal]: (it[meal] ?? []).filter((i) => !ids.includes(i.id)),
          })),
        })),

      clearMeal: (day, meal) =>
        set((s) => ({ days: patchDay(s.days, day, (it) => ({ ...it, [meal]: [] })) })),

      dropMeal: (meal) =>
        set((s) => {
          const days: DiaryDays = {};
          for (const [key, items] of Object.entries(s.days)) {
            const { [meal]: _removed, ...rest } = items;
            days[key] = rest;
          }
          return { days };
        }),

      clearDay: (day) => set((s) => ({ days: { ...s.days, [day]: {} } })),
    }),
    {
      name: 'nofoco-diary-v2',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      /** Antes do multi-dia o estado era `{ items }` — vira o dia de hoje. */
      migrate: (persisted, version) => {
        if (version < 3) {
          const old = persisted as { items?: DiaryItems } | undefined;
          return { days: old?.items ? { [todayKey()]: old.items } : {} } as DiaryState;
        }
        return persisted as DiaryState;
      },
    },
  ),
);

const ZERO: Nutrients = { kcal: 0, carb: 0, protein: 0, fat: 0, fiber: 0, sodium: 0 };

/**
 * Soma os campos obrigatórios (kcal + macros + sódio). Açúcar e demais opcionais
 * NÃO entram aqui — para a tabela completa (que trata `undefined`), ver lib/nutrition.
 */
export function sumMacros(items: DiaryItem[]): Nutrients {
  return items.reduce<Nutrients>(
    (acc, it) => ({
      kcal: acc.kcal + it.macros.kcal,
      carb: round1(acc.carb + it.macros.carb),
      protein: round1(acc.protein + it.macros.protein),
      fat: round1(acc.fat + it.macros.fat),
      fiber: round1(acc.fiber + it.macros.fiber),
      sodium: acc.sodium + it.macros.sodium,
    }),
    { ...ZERO },
  );
}

/** Itens de um dia (mapa vazio se nada foi lançado nele). */
export function dayItems(days: DiaryDays, day: DayKey): DiaryItems {
  return days[day] ?? {};
}

/** Itens de uma refeição num dia (lista vazia se ela nunca recebeu nada). */
export function mealItems(items: DiaryItems, meal: MealId): DiaryItem[] {
  return items[meal] ?? [];
}

/** Total do dia inteiro — só o que está em refeições existentes. */
export function dayMacros(items: DiaryItems, meals: Meal[]): Nutrients {
  return sumMacros(meals.flatMap((m) => items[m.id] ?? []));
}

/** kcal consumido por refeição (para a orientação — ver lib/pacing). */
export function kcalByMeal(items: DiaryItems, meals: Meal[]): Record<MealId, number> {
  const out: Record<MealId, number> = {};
  for (const m of meals) out[m.id] = sumMacros(items[m.id] ?? []).kcal;
  return out;
}

/** Total de kcal de cada dia — base dos relatórios (E7). */
export function kcalByDay(days: DiaryDays, meals: Meal[]): Record<DayKey, number> {
  const out: Record<DayKey, number> = {};
  for (const [key, items] of Object.entries(days)) out[key] = dayMacros(items, meals).kcal;
  return out;
}

/** id único para um item novo. */
export function newItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
