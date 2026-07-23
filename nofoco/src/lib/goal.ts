/**
 * Motor de metas (ver plano E2). TMB por Mifflin-St Jeor → TDEE → ajuste por objetivo.
 * Estimativas informativas — não substituem acompanhamento profissional.
 */

export type Sex = 'M' | 'F';
export type Activity = 'sedentario' | 'leve' | 'moderado' | 'ativo' | 'muito';
export type Objective = 'perder' | 'manter' | 'ganhar' | 'recomp';

export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  objective: Objective;
};

export const ACTIVITY: Record<Activity, { label: string; factor: number }> = {
  sedentario: { label: 'Sedentário', factor: 1.2 },
  leve: { label: 'Levemente ativo', factor: 1.375 },
  moderado: { label: 'Moderadamente ativo', factor: 1.55 },
  ativo: { label: 'Muito ativo', factor: 1.725 },
  muito: { label: 'Extremamente ativo', factor: 1.9 },
};

export const OBJECTIVES: Record<
  Objective,
  { label: string; short: string; adjust: number; proteinPerKg: number }
> = {
  perder: { label: 'Perder peso', short: 'Déficit moderado', adjust: 0.82, proteinPerKg: 2.0 },
  manter: { label: 'Manter peso', short: 'Manutenção', adjust: 1.0, proteinPerKg: 1.8 },
  ganhar: { label: 'Ganhar massa', short: 'Superávit', adjust: 1.12, proteinPerKg: 1.8 },
  recomp: { label: 'Ganho c/ perda de gordura', short: 'Recomposição', adjust: 0.95, proteinPerKg: 2.2 },
};

export type Goal = {
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
  tmb: number;
  tdee: number;
};

/** Calcula a meta diária a partir do perfil. */
export function computeGoal(p: Profile): Goal {
  const s = p.sex === 'M' ? 5 : -161;
  const tmb = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s;
  const tdee = tmb * ACTIVITY[p.activity].factor;
  const obj = OBJECTIVES[p.objective];
  const kcal = Math.round(tdee * obj.adjust);

  const protein = Math.round(p.weightKg * obj.proteinPerKg);
  const fat = Math.round(p.weightKg * 0.9);
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return { kcal, carb, protein, fat, tmb: Math.round(tmb), tdee: Math.round(tdee) };
}
