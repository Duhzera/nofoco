/**
 * Dados de alimentos (mock) — estrutura alinhada ao modelo do plano (§5 e E4.1).
 * Tudo é normalizado por 100 g/ml; o app deriva os macros a partir do peso escolhido.
 * No futuro estes dados virão da base própria (TACO/TBCA/Open Food Facts) — ver §4.4.1.
 */

export type Nutrients = {
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
  sugar: number;
  fiber: number;
  sodium: number; // mg
};

export type Serving = { id: string; label: string; grams: number };

export type Food = {
  id: string;
  name: string;
  brand?: string;
  source: string;
  emoji: string;
  kind: 'alimento' | 'marca' | 'refeicao';
  liquid?: boolean; // usa ml em vez de g
  per100: Nutrients; // por 100 g (ou 100 ml se liquid)
  unitGrams: number; // peso de 1 "unidade"/porção padrão
  unitLabel: string; // ex.: 'unidade média', 'copo', 'fatia'
  extraServings?: Serving[]; // medidas caseiras adicionais
};

export const FOODS: Food[] = [
  {
    id: 'pao-queijo-tradicional',
    name: 'Pão de queijo tradicional',
    source: 'Genérico',
    emoji: '🧀',
    kind: 'alimento',
    per100: { kcal: 300, carb: 28, protein: 10, fat: 16, sugar: 1.2, fiber: 0.8, sodium: 310 },
    unitGrams: 50,
    unitLabel: 'unidade média',
  },
  {
    id: 'pao-queijo-light',
    name: 'Pão de queijo light',
    source: 'Genérico',
    emoji: '🧀',
    kind: 'alimento',
    per100: { kcal: 240, carb: 30, protein: 11, fat: 9, sugar: 1.0, fiber: 1.0, sodium: 290 },
    unitGrams: 50,
    unitLabel: 'unidade',
  },
  {
    id: 'pao-queijo-integral',
    name: 'Pão de queijo integral',
    source: 'Genérico',
    emoji: '🧀',
    kind: 'alimento',
    per100: { kcal: 280, carb: 26, protein: 12, fat: 14, sugar: 1.1, fiber: 2.4, sodium: 300 },
    unitGrams: 50,
    unitLabel: 'unidade',
  },
  {
    id: 'pao-queijo-recheado',
    name: 'Pão de queijo recheado',
    brand: 'Forno de Minas',
    source: 'Open Food Facts',
    emoji: '🧀',
    kind: 'marca',
    per100: { kcal: 300, carb: 24, protein: 9, fat: 18, sugar: 1.5, fiber: 0.9, sodium: 360 },
    unitGrams: 60,
    unitLabel: 'unidade',
  },
  {
    id: 'pao-queijo-vegano',
    name: 'Pão de queijo vegano',
    source: 'Genérico',
    emoji: '🧀',
    kind: 'alimento',
    per100: { kcal: 260, carb: 32, protein: 5, fat: 12, sugar: 1.3, fiber: 1.6, sodium: 280 },
    unitGrams: 50,
    unitLabel: 'unidade',
  },
  {
    id: 'cafe-com-leite',
    name: 'Café com leite',
    source: 'Genérico',
    emoji: '☕',
    kind: 'alimento',
    liquid: true,
    per100: { kcal: 70, carb: 8, protein: 3.4, fat: 2.8, sugar: 7.5, fiber: 0, sodium: 45 },
    unitGrams: 200,
    unitLabel: 'copo (200 ml)',
  },
  {
    id: 'arroz-branco',
    name: 'Arroz branco cozido',
    source: 'TACO',
    emoji: '🍚',
    kind: 'alimento',
    per100: { kcal: 130, carb: 28, protein: 2.5, fat: 0.2, sugar: 0.1, fiber: 1.6, sodium: 1 },
    unitGrams: 100,
    unitLabel: 'porção (100 g)',
    extraServings: [
      { id: 'colher', label: 'colher de sopa', grams: 25 },
      { id: 'escumadeira', label: 'escumadeira', grams: 45 },
    ],
  },
  {
    id: 'feijao-carioca',
    name: 'Feijão carioca cozido',
    source: 'TACO',
    emoji: '🫘',
    kind: 'alimento',
    per100: { kcal: 76, carb: 13.6, protein: 4.8, fat: 0.5, sugar: 0.3, fiber: 8.5, sodium: 2 },
    unitGrams: 100,
    unitLabel: 'concha (100 g)',
    extraServings: [{ id: 'colher', label: 'colher de sopa', grams: 20 }],
  },
  {
    id: 'frango-grelhado',
    name: 'Peito de frango grelhado',
    source: 'TACO',
    emoji: '🍗',
    kind: 'alimento',
    per100: { kcal: 165, carb: 0, protein: 31, fat: 3.6, sugar: 0, fiber: 0, sodium: 74 },
    unitGrams: 100,
    unitLabel: 'filé (100 g)',
    extraServings: [{ id: 'file-medio', label: 'filé médio', grams: 120 }],
  },
];

/** Normaliza texto para busca (sem acento, minúsculo). */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function searchFoods(query: string): Food[] {
  const q = normalize(query);
  if (!q) return FOODS;
  return FOODS.filter((f) => normalize(f.name).includes(q) || (f.brand && normalize(f.brand).includes(q)));
}

export function getFood(id: string): Food | undefined {
  return FOODS.find((f) => f.id === id);
}

/** Macros para um dado peso em gramas/ml. */
export function macrosForGrams(f: Food, grams: number): Nutrients {
  const k = grams / 100;
  return {
    kcal: Math.round(f.per100.kcal * k),
    carb: round1(f.per100.carb * k),
    protein: round1(f.per100.protein * k),
    fat: round1(f.per100.fat * k),
    sugar: round1(f.per100.sugar * k),
    fiber: round1(f.per100.fiber * k),
    sodium: Math.round(f.per100.sodium * k),
  };
}

/** kcal de 1 unidade padrão. */
export function unitKcal(f: Food): number {
  return Math.round((f.per100.kcal * f.unitGrams) / 100);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
