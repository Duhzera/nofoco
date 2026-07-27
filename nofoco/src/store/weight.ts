/**
 * Histórico de peso (Zustand + persistência).
 *
 * Uma medição por dia (a última do dia vence). O peso "atual" do perfil, usado no
 * cálculo de meta e na previsão, é a medição mais recente daqui — então registrar
 * um peso novo já atualiza a meta, e não fica um número solto no perfil.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { type DayKey } from '@/lib/date';

export type WeightEntry = { date: DayKey; kg: number };

type WeightState = {
  log: Record<DayKey, number>;
  setWeight: (day: DayKey, kg: number) => void;
  removeWeight: (day: DayKey) => void;
};

export const useWeight = create<WeightState>()(
  persist(
    (set) => ({
      log: {},
      setWeight: (day, kg) => set((s) => (kg > 0 ? { log: { ...s.log, [day]: kg } } : s)),
      removeWeight: (day) =>
        set((s) => {
          const { [day]: _removed, ...rest } = s.log;
          return { log: rest };
        }),
    }),
    {
      name: 'nofoco-weight-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Série ordenada por data (mais antiga → mais recente). */
export function weightSeries(log: Record<DayKey, number>): WeightEntry[] {
  return Object.entries(log)
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Peso da medição mais recente, se houver. */
export function latestWeight(log: Record<DayKey, number>): number | undefined {
  const s = weightSeries(log);
  return s.length ? s[s.length - 1].kg : undefined;
}

/** Converte texto digitado ("78,5", "78.5", "80") em kg com 1 casa. */
export function parseKg(text: string): number {
  const n = parseFloat(text.replace(',', '.').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n)) return 0;
  return Math.min(400, Math.max(0, Math.round(n * 10) / 10));
}

/** Formata kg para exibição no padrão brasileiro, sem casa desnecessária (78 · 78,5). */
export function formatKg(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}
