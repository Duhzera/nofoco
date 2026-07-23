/**
 * Orientação adaptativa (pacing). Distribui a meta do dia entre as refeições e,
 * conforme a pessoa come mais ou menos que o previsto, ajusta a sugestão das
 * refeições que ainda faltam — com mensagens curtas e sem culpa.
 */
import { MEALS, mealDef, type MealKey } from '@/store/diary';
import { splitSum } from '@/store/profile';

export type PaceStatus = 'under' | 'on' | 'over' | 'done';
type Consumed = Record<MealKey, number>;
type Split = Record<MealKey, number>;

/** Alvo base (kcal) de uma refeição — proporcional à % dela. */
export function mealTarget(goalKcal: number, split: Split, key: MealKey): number {
  const total = splitSum(split) || 1;
  return Math.round((goalKcal * (split[key] ?? 0)) / total);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export type DayPacing = {
  consumed: number;
  goal: number;
  remaining: number;
  status: PaceStatus;
  message: string;
};

/** Orientação do dia inteiro, com base no horário atual e no consumido. */
export function dayPacing(goalKcal: number, split: Split, consumed: Consumed, nowMin: number): DayPacing {
  const total = MEALS.reduce((a, m) => a + (consumed[m.key] ?? 0), 0);
  const remaining = goalKcal - total;
  const expected = MEALS.filter((m) => timeToMinutes(m.time) <= nowMin).reduce(
    (a, m) => a + mealTarget(goalKcal, split, m.key),
    0,
  );
  const thr = Math.max(120, Math.round(goalKcal * 0.06));

  let status: PaceStatus;
  let message: string;
  if (total >= goalKcal) {
    if (remaining < 0) {
      status = 'over';
      message = `Você passou da meta em ${Math.abs(remaining)} kcal. Dá pra compensar amanhã.`;
    } else {
      status = 'done';
      message = 'Você atingiu a meta do dia 🎯';
    }
  } else if (total < expected - thr) {
    status = 'under';
    message = `Abaixo do previsto para este horário — ainda cabem ${remaining} kcal hoje.`;
  } else if (total > expected + thr) {
    status = 'over';
    message = `Acima do ritmo. Segure nas próximas: restam ${remaining} kcal.`;
  } else {
    status = 'on';
    message = `No ritmo 👍 Restam ${remaining} kcal para a meta.`;
  }
  return { consumed: total, goal: goalKcal, remaining, status, message };
}

export type MealAdvice = {
  base: number;
  consumed: number;
  suggestion: number;
  status: PaceStatus;
  message: string;
};

/** Orientação adaptativa para UMA refeição: quanto comer aqui dado o restante do dia. */
export function mealAdvice(goalKcal: number, split: Split, consumed: Consumed, key: MealKey): MealAdvice {
  const base = mealTarget(goalKcal, split, key);
  const eaten = consumed[key] ?? 0;
  const total = MEALS.reduce((a, m) => a + (consumed[m.key] ?? 0), 0);
  const remainingDay = goalKcal - total;

  // refeições ainda "abertas" (sem itens), garantindo incluir a atual
  const openKeys = MEALS.filter((m) => (consumed[m.key] ?? 0) === 0).map((m) => m.key);
  if (!openKeys.includes(key)) openKeys.push(key);
  const openSplit = openKeys.reduce((a, k) => a + (split[k] ?? 0), 0) || 1;
  const suggestion = Math.max(0, Math.round((remainingDay * (split[key] ?? 0)) / openSplit));

  const name = mealDef(key).name.toLowerCase();
  let status: PaceStatus;
  let message: string;

  if (eaten > 0) {
    if (eaten > base * 1.15) {
      status = 'over';
      message = `Você passou do alvo do ${name} (${base} kcal). Tente segurar nas próximas.`;
    } else if (eaten < base * 0.85) {
      status = 'under';
      message = `Abaixo do alvo do ${name} (${base} kcal) — pode compensar mais tarde.`;
    } else {
      status = 'on';
      message = `No alvo do ${name} 👍`;
    }
  } else if (remainingDay <= 0) {
    status = 'done';
    message = 'Você já atingiu a meta do dia. Comer mais vai passar do total.';
  } else if (suggestion > base * 1.1) {
    status = 'under';
    message = `Você comeu abaixo do previsto hoje. Pode ingerir até ~${suggestion} kcal aqui.`;
  } else if (suggestion < base * 0.9) {
    status = 'over';
    message = `Você já comeu bastante hoje. Tente segurar em ~${suggestion} kcal aqui.`;
  } else {
    status = 'on';
    message = `Alvo do ${name}: ~${base} kcal.`;
  }

  return { base, consumed: eaten, suggestion, status, message };
}
