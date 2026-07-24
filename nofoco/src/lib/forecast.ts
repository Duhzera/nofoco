/**
 * Previsão de quanto tempo levaria para chegar ao peso-alvo.
 *
 * A conta ingênua — "déficit diário ÷ 7.700 kcal, pronto" — mente em prazo longo:
 * conforme a pessoa emagrece, a TMB cai, o TDEE cai junto, e o mesmo cardápio deixa
 * de produzir o mesmo déficit. Por isso aqui a simulação avança **semana a semana**,
 * recalculando a meta com o peso daquela semana. O resultado é mais lento que a conta
 * linear, e é o resultado que costuma acontecer de verdade.
 *
 * Continua sendo estimativa: ignora água, adaptação metabólica além do peso, mudança
 * de composição corporal e a vida real. Serve para orientar, não para prometer.
 */
import { addDays, todayKey, type DayKey } from '@/lib/date';
import { computeGoal, KCAL_PER_KG, type Profile } from '@/lib/goal';

/** Teto da simulação — além disso a previsão não informa nada de útil. */
const MAX_WEEKS = 260; // 5 anos

export type Forecast =
  | { kind: 'ok'; weeks: number; date: DayKey; avgWeeklyKg: number; firstWeekKg: number; capped: boolean }
  /** Sem peso-alvo definido. */
  | { kind: 'sem-alvo' }
  /** Já está no peso desejado (ou a menos de 300 g dele). */
  | { kind: 'alcancado' }
  /** O objetivo escolhido empurra o peso para o lado oposto do alvo. */
  | { kind: 'sentido-oposto' }
  /** Meta de manutenção (ou déficit desprezível): o peso não caminha. */
  | { kind: 'sem-ritmo' }
  /** Levaria mais de cinco anos no ritmo atual. */
  | { kind: 'muito-longo' };

export function forecastToTarget(p: Profile): Forecast {
  const target = p.targetWeightKg;
  if (!target || target <= 0) return { kind: 'sem-alvo' };

  const diff = target - p.weightKg;
  if (Math.abs(diff) < 0.3) return { kind: 'alcancado' };

  const wantsLoss = diff < 0;

  let weight = p.weightKg;
  let firstWeekKg = 0;
  let capped = false;

  for (let week = 1; week <= MAX_WEEKS; week++) {
    const g = computeGoal({ ...p, weightKg: weight });
    if (g.capped) capped = true;

    // positivo = déficit (perde peso); negativo = superávit (ganha)
    const dailyDelta = g.tdee - g.kcal;
    const deltaKg = (dailyDelta * 7) / KCAL_PER_KG;

    if (Math.abs(deltaKg) < 0.005) return { kind: 'sem-ritmo' };
    if ((wantsLoss && deltaKg < 0) || (!wantsLoss && deltaKg > 0)) {
      return { kind: 'sentido-oposto' };
    }

    weight -= deltaKg;
    if (week === 1) firstWeekKg = Math.abs(deltaKg);

    const reached = wantsLoss ? weight <= target : weight >= target;
    if (reached) {
      return {
        kind: 'ok',
        weeks: week,
        date: addDays(todayKey(), week * 7),
        avgWeeklyKg: Math.abs(p.weightKg - target) / week,
        firstWeekKg,
        capped,
      };
    }
  }

  return { kind: 'muito-longo' };
}

/** "3 semanas" · "cerca de 4 meses" · "cerca de 1 ano e 2 meses" */
export function formatDuration(weeks: number): string {
  if (weeks <= 1) return 'cerca de 1 semana';
  if (weeks < 9) return `cerca de ${weeks} semanas`;

  const months = Math.round(weeks / 4.345);
  if (months < 12) return `cerca de ${months} meses`;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearPart = years === 1 ? '1 ano' : `${years} anos`;
  if (rest === 0) return `cerca de ${yearPart}`;
  return `cerca de ${yearPart} e ${rest} ${rest === 1 ? 'mês' : 'meses'}`;
}
