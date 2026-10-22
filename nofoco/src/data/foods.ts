/**
 * Dados de alimentos — modelo alinhado ao plano (§5 e E4.1). Tudo por 100 g/ml;
 * o app deriva os macros a partir do peso escolhido. A base vem da TACO (data/taco.ts,
 * ~600 itens BR reais) somada a alguns alimentos curados com porções/marcas.
 * Próximas fontes (barcode/OFF, micros/USDA) entram via backend — ver §4.4.1.
 */
import { TACO_FOODS } from './taco';

/**
 * Tabela nutricional de um alimento.
 *
 * Os seis primeiros campos são obrigatórios — toda fonte traz macros e sódio.
 * O resto é opcional de propósito: `undefined` significa "não sabemos", e é
 * diferente de zero. A UI mostra "—" nesses casos em vez de fingir um valor.
 * (Açúcar é opcional porque a TACO não traz essa coluna — ver data/taco.ts.)
 */
export type Nutrients = {
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
  fiber: number;
  sodium: number; // mg

  sugar?: number; // g — nem toda fonte informa

  // gorduras detalhadas (g)
  satFat?: number;
  transFat?: number;
  monoFat?: number;
  polyFat?: number;
  cholesterol?: number; // mg

  // minerais (mg)
  potassium?: number;
  calcium?: number;
  iron?: number;
  magnesium?: number;
  zinc?: number;

  // vitaminas
  vitA?: number; // µg
  vitC?: number; // mg
  vitD?: number; // µg
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
  barcode?: string; // código de barras (EAN-13, UPC, etc.) se houver
  extraServings?: Serving[]; // medidas caseiras adicionais
};

/**
 * Alimentos curados à mão (com porções caseiras, marcas e exemplos de barcode).
 * A base real vem da TACO (data/taco.ts); estes ficam na frente por terem porções
 * melhores. Alguns campos aqui são aproximações de rótulo — conferir na fonte real.
 */
const CURATED: Food[] = [
  {
    id: 'pao-queijo-tradicional',
    name: 'Pão de queijo tradicional',
    source: 'Genérico',
    emoji: '🧀',
    kind: 'alimento',
    per100: {
      kcal: 300, carb: 28, protein: 10, fat: 16, sugar: 1.2, fiber: 0.8, sodium: 310,
      satFat: 8.5, transFat: 0, cholesterol: 42, calcium: 210,
    },
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
    per100: {
      kcal: 300, carb: 24, protein: 9, fat: 18, sugar: 1.5, fiber: 0.9, sodium: 360,
      satFat: 9.2, transFat: 0, cholesterol: 48, calcium: 190,
    },
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
    per100: {
      kcal: 70, carb: 8, protein: 3.4, fat: 2.8, sugar: 7.5, fiber: 0, sodium: 45,
      satFat: 1.7, cholesterol: 10, calcium: 110, potassium: 140,
    },
    unitGrams: 200,
    unitLabel: 'copo (200 ml)',
  },
  {
    id: 'arroz-branco',
    name: 'Arroz branco cozido',
    source: 'TACO',
    emoji: '🍚',
    kind: 'alimento',
    per100: {
      kcal: 130, carb: 28, protein: 2.5, fat: 0.2, sugar: 0.1, fiber: 1.6, sodium: 1,
      satFat: 0.1, calcium: 4, iron: 0.1, magnesium: 3, potassium: 15, zinc: 0.5,
    },
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
    per100: {
      kcal: 76, carb: 13.6, protein: 4.8, fat: 0.5, sugar: 0.3, fiber: 8.5, sodium: 2,
      satFat: 0.1, calcium: 27, iron: 1.3, magnesium: 42, potassium: 255, zinc: 0.7,
    },
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
    per100: {
      kcal: 165, carb: 0, protein: 31, fat: 3.6, sugar: 0, fiber: 0, sodium: 74,
      satFat: 1.0, monoFat: 1.2, polyFat: 0.8, cholesterol: 85,
      calcium: 5, iron: 0.4, magnesium: 29, potassium: 256, zinc: 1.0,
    },
    unitGrams: 100,
    unitLabel: 'filé (100 g)',
    extraServings: [{ id: 'file-medio', label: 'filé médio', grams: 120 }],
  },
];

/** Base de busca: curados na frente, base TACO (~600 itens) em seguida. */
export const FOODS: Food[] = [...CURATED, ...TACO_FOODS];

/** Máximo de resultados devolvidos à busca (a base TACO tem ~600 itens). */
const SEARCH_LIMIT = 60;

/** Normaliza texto para busca (sem acento, minúsculo). */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Produtos vindos do leitor de código de barras, receitas e cache
 * são lembrados aqui em runtime para ficarem acessíveis a qualquer busca.
 */
const remembered = new Map<string, Food>();

export function rememberFood(food: Food): void {
  remembered.set(food.id, food);
}

export function searchFoods(query: string): Food[] {
  const q = normalize(query);
  const userItems = Array.from(remembered.values());
  const combined = [...userItems, ...FOODS];
  const base = q
    ? combined.filter((f) => normalize(f.name).includes(q) || (f.brand && normalize(f.brand).includes(q)))
    : combined;
  return base.slice(0, SEARCH_LIMIT);
}

export function getFood(id: string): Food | undefined {
  return remembered.get(id) ?? FOODS.find((f) => f.id === id);
}

/** Escala um campo opcional mantendo `undefined` quando o dado não existe. */
function scaleOpt(v: number | undefined, k: number, decimals = 1): number | undefined {
  if (v === undefined) return undefined;
  const f = 10 ** decimals;
  return Math.round(v * k * f) / f;
}

/** Macros para um dado peso em gramas/ml. */
export function macrosForGrams(f: Food, grams: number): Nutrients {
  const k = grams / 100;
  const p = f.per100;
  return {
    kcal: Math.round(p.kcal * k),
    carb: round1(p.carb * k),
    protein: round1(p.protein * k),
    fat: round1(p.fat * k),
    fiber: round1(p.fiber * k),
    sodium: Math.round(p.sodium * k),

    sugar: scaleOpt(p.sugar, k),
    satFat: scaleOpt(p.satFat, k),
    transFat: scaleOpt(p.transFat, k),
    monoFat: scaleOpt(p.monoFat, k),
    polyFat: scaleOpt(p.polyFat, k),
    cholesterol: scaleOpt(p.cholesterol, k, 0),

    potassium: scaleOpt(p.potassium, k, 0),
    calcium: scaleOpt(p.calcium, k, 0),
    iron: scaleOpt(p.iron, k, 2),
    magnesium: scaleOpt(p.magnesium, k, 0),
    zinc: scaleOpt(p.zinc, k, 2),

    vitA: scaleOpt(p.vitA, k, 0),
    vitC: scaleOpt(p.vitC, k),
    vitD: scaleOpt(p.vitD, k, 2),
  };
}

/** kcal de 1 unidade padrão. */
export function unitKcal(f: Food): number {
  return Math.round((f.per100.kcal * f.unitGrams) / 100);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
