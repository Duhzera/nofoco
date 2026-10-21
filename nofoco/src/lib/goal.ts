/**
 * Motor de metas (ver plano E2). TMB por Mifflin-St Jeor → TDEE → ajuste por objetivo.
 * Estimativas informativas — não substituem acompanhamento profissional.
 */

export type Sex = 'M' | 'F';
export type Activity = 'sedentario' | 'leve' | 'moderado' | 'ativo' | 'muito';
export type Objective = 'perder' | 'manter' | 'ganhar' | 'recomp';

export type CustomMacros = {
  enabled: boolean;
  kcal?: number;
  carb?: number;
  protein?: number;
  fat?: number;
  fiber?: number;
};

export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  objective: Objective;
  /** Peso que a pessoa quer alcançar (opcional). Alimenta a previsão em lib/forecast. */
  targetWeightKg?: number;
  /**
   * Ritmo desejado em kg/semana. Quando definido, **substitui** o ajuste fixo do
   * objetivo: a meta de calorias passa a ser calculada para produzir esse ritmo.
   * Fica `undefined` no modo automático.
   */
  weeklyRateKg?: number;
  /**
   * Ajuste fino manual de macronutrientes. Quando habilitado, substitui o cálculo
   * automático proporcional da fórmula.
   */
  customMacros?: CustomMacros;
};

/**
 * Energia aproximada de 1 kg de tecido corporal.
 *
 * Os 7.700 kcal são a referência clássica para **gordura**. Ganho de massa envolve
 * tecido magro, cujo custo é diferente, então a previsão de ganho é mais grosseira
 * que a de perda — é estimativa informativa, como todo o resto do app.
 */
export const KCAL_PER_KG = 7700;

/** Ritmos oferecidos na interface (kg por semana). */
export const WEEKLY_RATES = [0.25, 0.5, 0.75, 1] as const;

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
  fiber: number;
  tmb: number;
  tdee: number;
  /** Piso de segurança aplicado à meta (nunca abaixo da TMB nem do mínimo absoluto). */
  floor: number;
  /** `true` quando o ritmo pedido exigiria comer abaixo do piso e a meta foi travada. */
  capped: boolean;
  /** `true` quando metas manuais personalizadas estão ativas. */
  isCustom?: boolean;
};

/**
 * Piso da meta diária.
 *
 * Duas travas: nunca abaixo da **TMB** (o corpo em repouso já gasta isso) e nunca
 * abaixo do mínimo absoluto usualmente citado — 1.200 kcal para mulheres, 1.500 para
 * homens. Quem pedir um ritmo agressivo demais recebe a meta travada aqui, e a
 * previsão passa a refletir o ritmo real, não o pedido.
 */
function goalFloor(p: Profile, tmb: number): number {
  return Math.max(Math.round(tmb), p.sex === 'F' ? 1200 : 1500);
}

/** Calcula a meta diária a partir do perfil. */
export function computeGoal(p: Profile): Goal {
  const s = p.sex === 'M' ? 5 : -161;
  const tmb = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s;
  const tdee = tmb * ACTIVITY[p.activity].factor;
  const obj = OBJECTIVES[p.objective];

  let kcal: number;
  if (p.weeklyRateKg && p.weeklyRateKg > 0 && p.objective !== 'manter') {
    // ritmo escolhido pela pessoa: a meta é o que produz esse ganho/perda por semana
    const dailyDelta = (p.weeklyRateKg * KCAL_PER_KG) / 7;
    kcal = Math.round(p.objective === 'ganhar' ? tdee + dailyDelta : tdee - dailyDelta);
  } else {
    kcal = Math.round(tdee * obj.adjust);
  }

  const floor = goalFloor(p, tmb);
  const capped = kcal < floor;
  if (capped) kcal = floor;

  // Se o usuário personalizou macros manualmente
  if (p.customMacros?.enabled) {
    const protein = p.customMacros.protein ?? Math.round(p.weightKg * obj.proteinPerKg);
    const fat = p.customMacros.fat ?? Math.round(p.weightKg * 0.9);
    const carb = p.customMacros.carb ?? Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const finalKcal = p.customMacros.kcal ?? (protein * 4 + fat * 9 + carb * 4);
    // Meta de fibras: recomendação da IOM / Dietary Guidelines (~14g a cada 1000 kcal)
    const fiber = p.customMacros.fiber ?? Math.round((finalKcal / 1000) * 14);

    return {
      kcal: finalKcal,
      carb,
      protein,
      fat,
      fiber,
      tmb: Math.round(tmb),
      tdee: Math.round(tdee),
      floor,
      capped,
      isCustom: true,
    };
  }

  const protein = Math.round(p.weightKg * obj.proteinPerKg);
  const fat = Math.round(p.weightKg * 0.9);
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  // Meta de fibras: recomendação da IOM / Dietary Guidelines (~14g a cada 1000 kcal)
  const fiber = Math.round((kcal / 1000) * 14);

  return {
    kcal,
    carb,
    protein,
    fat,
    fiber,
    tmb: Math.round(tmb),
    tdee: Math.round(tdee),
    floor,
    capped,
    isCustom: false,
  };
}

/**
 * Alerta de ritmo agressivo: perder mais de 1% do peso corporal por semana
 * é associado a maior risco de perda de massa magra, rebote e cálculo biliar (ACSM / OMS).
 */
export function isAggressivePace(weeklyRateKg: number | undefined, weightKg: number): boolean {
  if (!weeklyRateKg || weeklyRateKg <= 0 || weightKg <= 0) return false;
  return weeklyRateKg > weightKg * 0.01 + 0.001;
}

/** Limite seguro de perda de peso semanal em kg (1% do peso atual). */
export function safeMaxWeeklyLoss(weightKg: number): number {
  return Math.round(weightKg * 0.01 * 100) / 100;
}

/**
 * Avaliação da OMS para consumo de açúcares livres:
 * Limite recomendado: máximo 10% do total calórico diário (e idealmente < 5%).
 * 1 g de açúcar = 4 kcal.
 */
export function checkSugarIntake(consumedSugarGrams: number, goalKcal: number): {
  maxGrams: number;
  idealMaxGrams: number;
  pctKcal: number;
  isOver: boolean;
  isWarning: boolean;
  consumedGrams: number;
} {
  const sugarKcal = consumedSugarGrams * 4;
  const pctKcal = goalKcal > 0 ? (sugarKcal / goalKcal) * 100 : 0;
  const maxGrams = Math.round((goalKcal * 0.1) / 4);
  const idealMaxGrams = Math.round((goalKcal * 0.05) / 4);

  return {
    maxGrams,
    idealMaxGrams,
    pctKcal: Math.round(pctKcal * 10) / 10,
    isOver: pctKcal > 10,
    isWarning: pctKcal > 7.5,
    consumedGrams: consumedSugarGrams,
  };
}

/** Índice de massa corporal. */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return m > 0 ? weightKg / (m * m) : 0;
}

export type BmiClass = 'abaixo' | 'saudavel' | 'sobrepeso' | 'obesidade';

export function bmiClass(value: number): BmiClass {
  if (value < 18.5) return 'abaixo';
  if (value < 25) return 'saudavel';
  if (value < 30) return 'sobrepeso';
  return 'obesidade';
}

/** Faixa de peso correspondente a um IMC saudável (18,5 a 24,9) para aquela altura. */
export function healthyWeightRange(heightCm: number): { min: number; max: number } {
  const m = heightCm / 100;
  return { min: Math.round(18.5 * m * m), max: Math.round(24.9 * m * m) };
}
