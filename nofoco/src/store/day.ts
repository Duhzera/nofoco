/**
 * Dia que o app está mostrando.
 *
 * De propósito **não é persistido**: abrir o app deve cair no dia de hoje, não no
 * dia que você estava olhando ontem à noite. Como o diário guarda tudo por data
 * (ver store/diary), navegar aqui só muda a lente, nunca os dados.
 */
import { create } from 'zustand';

import { addDays, todayKey, type DayKey } from '@/lib/date';

type DayState = {
  date: DayKey;
  setDate: (date: DayKey) => void;
  shiftDays: (n: number) => void;
  goToday: () => void;
};

export const useDay = create<DayState>()((set) => ({
  date: todayKey(),
  setDate: (date) => set({ date }),
  shiftDays: (n) => set((s) => ({ date: addDays(s.date, n) })),
  goToday: () => set({ date: todayKey() }),
}));
