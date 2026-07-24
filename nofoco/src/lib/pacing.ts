/**
 * Orientação adaptativa (pacing). Distribui a meta do dia entre as refeições e,
 * conforme a pessoa come mais ou menos que o previsto, ajusta a sugestão das
 * refeições que ainda faltam — com mensagens curtas e sem culpa.
 *
 * Tudo aqui recebe a lista de refeições por parâmetro: ela é editável pela pessoa
 * (ver store/meals), então nada pode assumir quantas ou quais são.
 */
import type { Goal } from '@/lib/goal';
import { findMeal, pctSum, timeToMinutes, type Meal, type MealId } from '@/store/meals';

export type PaceStatus = 'under' | 'on' | 'over' | 'done';
type Consumed = Record<MealId, number>;

/** Fatia (0..1) que uma refeição representa da meta diária. */
function share(meals: Meal[], id: MealId): number {
  const total = pctSum(meals) || 1;
  return (findMeal(meals, id)?.pct ?? 0) / total;
}

/** Alvo base (kcal) de uma refeição — proporcional à % dela. */
export function mealTarget(goalKcal: number, meals: Meal[], id: MealId): number {
  return Math.round(goalKcal * share(meals, id));
}

/** Alvo de calorias E macros de uma refeição — a mesma fatia aplicada a cada meta. */
export type MealMacroTarget = { kcal: number; carb: number; protein: number; fat: number };

export function mealMacroTarget(goal: Goal, meals: Meal[], id: MealId): MealMacroTarget {
  const f = share(meals, id);
  return {
    kcal: Math.round(goal.kcal * f),
    carb: Math.round(goal.carb * f),
    protein: Math.round(goal.protein * f),
    fat: Math.round(goal.fat * f),
  };
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

/**
 * Orientação do dia inteiro, com base no horário atual e no consumido.
 *
 * `today` diz se o dia exibido é o de hoje. Num dia passado não existe "ritmo":
 * dizer "ainda cabem 800 kcal" sobre a terça-feira retrasada não ajuda ninguém,
 * então a mensagem vira um relato do que foi registrado.
 */
export function dayPacing(
  goalKcal: number,
  meals: Meal[],
  consumed: Consumed,
  nowMin: number,
  today = true,
): DayPacing {
  const total = meals.reduce((a, m) => a + (consumed[m.id] ?? 0), 0);
  const remaining = goalKcal - total;
  const expected = meals
    .filter((m) => timeToMinutes(m.time) <= nowMin)
    .reduce((a, m) => a + mealTarget(goalKcal, meals, m.id), 0);
  const thr = Math.max(120, Math.round(goalKcal * 0.06));

  let status: PaceStatus;
  let message: string;

  if (!today) {
    if (total === 0) {
      status = 'under';
      message = 'Nenhum registro neste dia.';
    } else if (remaining < 0) {
      status = 'over';
      message = `Neste dia você passou da meta em ${Math.abs(remaining)} kcal.`;
    } else if (total >= goalKcal) {
      status = 'done';
      message = 'Neste dia você atingiu a meta 🎯';
    } else {
      status = 'on';
      message = `Neste dia você registrou ${total} de ${goalKcal} kcal.`;
    }
    return { consumed: total, goal: goalKcal, remaining, status, message };
  }

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

/**
 * Orientação adaptativa para UMA refeição: quanto comer aqui dado o restante do dia.
 * Como em `dayPacing`, num dia passado a mensagem relata em vez de orientar.
 */
export function mealAdvice(
  goalKcal: number,
  meals: Meal[],
  consumed: Consumed,
  id: MealId,
  today = true,
): MealAdvice {
  const base = mealTarget(goalKcal, meals, id);
  const eaten = consumed[id] ?? 0;
  const total = meals.reduce((a, m) => a + (consumed[m.id] ?? 0), 0);
  const remainingDay = goalKcal - total;

  if (!today) {
    const status: PaceStatus = eaten === 0 ? 'under' : eaten > base * 1.15 ? 'over' : 'on';
    return {
      base,
      consumed: eaten,
      suggestion: base,
      status,
      message:
        eaten === 0
          ? `Nada registrado aqui neste dia (alvo era ~${base} kcal).`
          : `Neste dia você registrou ${eaten} kcal aqui, de um alvo de ~${base} kcal.`,
    };
  }

  // refeições ainda "abertas" (sem itens), garantindo incluir a atual
  const open = meals.filter((m) => (consumed[m.id] ?? 0) === 0 || m.id === id);
  const openPct = open.reduce((a, m) => a + (m.pct ?? 0), 0) || 1;
  const myPct = findMeal(meals, id)?.pct ?? 0;
  const suggestion = Math.max(0, Math.round((remainingDay * myPct) / openPct));

  const name = (findMeal(meals, id)?.name ?? 'refeição').toLowerCase();
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
