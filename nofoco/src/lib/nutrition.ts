/**
 * Tabela nutricional — catálogo de exibição e somatório honesto.
 *
 * Somar nutriente opcional tem uma armadilha: se três dos cinco itens da refeição
 * não informam gordura saturada, somar só os que informam e mostrar o total como
 * se fosse completo engana. Por isso `sumNutrient` devolve quantos itens tinham o
 * dado, e a interface avisa quando o número está incompleto.
 */
import type { Nutrients } from '@/data/foods';
import { NoFoco } from '@/constants/theme';

export type NutrientKey = keyof Omit<Nutrients, 'kcal'>;

export type NutrientDef = {
  key: NutrientKey;
  label: string;
  unit: string;
  /** Nutriente "filho" (ex.: açúcares dentro de carboidratos) — recuado na tabela. */
  child?: boolean;
  color?: string;
};

export type NutrientGroup = { title: string; rows: NutrientDef[] };

/** Ordem e agrupamento seguem o padrão de rótulo brasileiro (RDC 429/2020). */
export const NUTRIENT_GROUPS: NutrientGroup[] = [
  {
    title: 'Carboidratos',
    rows: [
      { key: 'carb', label: 'Carboidratos', unit: 'g', color: NoFoco.carb },
      { key: 'sugar', label: 'Açúcares totais', unit: 'g', child: true },
      { key: 'fiber', label: 'Fibra alimentar', unit: 'g', child: true, color: NoFoco.micro },
    ],
  },
  {
    title: 'Proteínas',
    rows: [{ key: 'protein', label: 'Proteínas', unit: 'g', color: NoFoco.protein }],
  },
  {
    title: 'Gorduras',
    rows: [
      { key: 'fat', label: 'Gorduras totais', unit: 'g', color: NoFoco.fat },
      { key: 'satFat', label: 'Saturadas', unit: 'g', child: true },
      { key: 'transFat', label: 'Trans', unit: 'g', child: true },
      { key: 'monoFat', label: 'Monoinsaturadas', unit: 'g', child: true },
      { key: 'polyFat', label: 'Poli-insaturadas', unit: 'g', child: true },
      { key: 'cholesterol', label: 'Colesterol', unit: 'mg', child: true },
    ],
  },
  {
    title: 'Minerais',
    rows: [
      { key: 'sodium', label: 'Sódio', unit: 'mg' },
      { key: 'potassium', label: 'Potássio', unit: 'mg' },
      { key: 'calcium', label: 'Cálcio', unit: 'mg' },
      { key: 'iron', label: 'Ferro', unit: 'mg' },
      { key: 'magnesium', label: 'Magnésio', unit: 'mg' },
      { key: 'zinc', label: 'Zinco', unit: 'mg' },
    ],
  },
  {
    title: 'Vitaminas',
    rows: [
      { key: 'vitA', label: 'Vitamina A', unit: 'µg' },
      { key: 'vitC', label: 'Vitamina C', unit: 'mg' },
      { key: 'vitD', label: 'Vitamina D', unit: 'µg' },
    ],
  },
];

/** Resultado de somar um nutriente numa lista — `null` quando ninguém informou. */
export type NutrientSum = {
  value: number;
  /** Quantos itens da lista traziam este dado. */
  known: number;
  /** Total de itens considerados. */
  total: number;
  /** `false` quando pelo menos um item não informou — o valor é um piso, não o total. */
  complete: boolean;
};

export function sumNutrient(list: Nutrients[], key: NutrientKey): NutrientSum | null {
  let value = 0;
  let known = 0;
  for (const n of list) {
    const v = n[key];
    if (typeof v === 'number') {
      value += v;
      known += 1;
    }
  }
  if (known === 0) return null;
  return {
    value: Math.round(value * 100) / 100,
    known,
    total: list.length,
    complete: known === list.length,
  };
}

/** Formata para exibição: "12,4 g" · "—" quando não há dado. */
export function formatNutrient(sum: NutrientSum | null, unit: string): string {
  if (!sum) return '—';
  const decimals = sum.value >= 100 || Number.isInteger(sum.value) ? 0 : 1;
  return `${sum.value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${unit}`;
}

/** Formata um valor solto (tela de porção, onde há um alimento só). */
export function formatValue(v: number | undefined, unit: string): string {
  if (v === undefined) return '—';
  const decimals = v >= 100 || Number.isInteger(v) ? 0 : 1;
  return `${v.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${unit}`;
}

/** Um grupo só aparece se pelo menos uma linha dele tiver dado. */
export function groupHasData(group: NutrientGroup, list: Nutrients[]): boolean {
  return group.rows.some((r) => sumNutrient(list, r.key) !== null);
}
