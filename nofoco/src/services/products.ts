/**
 * Fonte de produtos por código de barras — pronta para o leitor plugar.
 *
 * O leitor (a implementar) só precisa chamar `lookupProduct(codigo)`:
 *   const food = await lookupProduct(barcode);
 *   if (food) router.push({ pathname: '/porcao', params: { id: food.id, meal, voltarPara } });
 *   else      // fallback: produto não encontrado → busca/cadastro manual
 *
 * Estratégia (ver PLANEJAMENTO_APP.md §4.4.1): não guardamos milhões de produtos no
 * app. Buscamos assim, em ordem:
 *   1. nossa tabela `products` no Supabase (cache compartilhado, cresce com o uso);
 *   2. Open Food Facts ao vivo (API pública, ~3 mi de produtos, sem chave);
 * e, quando acha no OFF, grava de volta no Supabase (só se logado — RLS exige auth).
 * O produto é "lembrado" em runtime (data/foods) para a tela de porção resolvê-lo.
 *
 * Unidades do OFF: valores por 100 g; minerais/vitaminas vêm em GRAMAS
 * (ex.: sodium_100g 0.074 = 74 mg), então convertemos. Campos ausentes viram
 * `undefined` — nossa regra "não sabemos ≠ zero".
 * Atribuição: Open Food Facts (ODbL) — exibir crédito onde os dados aparecerem.
 */
import { rememberFood, type Food, type Nutrients } from '@/data/foods';
import { supabase } from '@/services/supabase';

const OFF_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_FIELDS = 'code,product_name,product_name_pt,brands,image_url,nutriments';

/** número válido (com fator de conversão) ou undefined se ausente. */
function opt(v: unknown, factor = 1): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.round(v * factor * 100) / 100;
}
/** campo obrigatório: cai para 0 quando ausente. */
function req(v: unknown, factor = 1): number {
  return opt(v, factor) ?? 0;
}

type OFFNutriments = Record<string, number | undefined>;

/** Converte o `nutriments` do Open Food Facts no nosso `Nutrients` (por 100 g). */
function nutrientsFromOFF(n: OFFNutriments): Nutrients {
  // sódio: usa sodium_100g (g→mg); se faltar, estima do sal (salt/2,5).
  const sodium = opt(n['sodium_100g'], 1000) ?? opt(n['salt_100g'], 400) ?? 0;
  return {
    kcal: req(n['energy-kcal_100g']),
    carb: req(n['carbohydrates_100g']),
    protein: req(n['proteins_100g']),
    fat: req(n['fat_100g']),
    fiber: req(n['fiber_100g']),
    sodium,

    sugar: opt(n['sugars_100g']),
    satFat: opt(n['saturated-fat_100g']),
    transFat: opt(n['trans-fat_100g']),
    monoFat: opt(n['monounsaturated-fat_100g']),
    polyFat: opt(n['polyunsaturated-fat_100g']),
    cholesterol: opt(n['cholesterol_100g'], 1000),

    potassium: opt(n['potassium_100g'], 1000),
    calcium: opt(n['calcium_100g'], 1000),
    iron: opt(n['iron_100g'], 1000),
    magnesium: opt(n['magnesium_100g'], 1000),
    zinc: opt(n['zinc_100g'], 1000),

    vitA: opt(n['vitamin-a_100g'], 1_000_000),
    vitC: opt(n['vitamin-c_100g'], 1000),
    vitD: opt(n['vitamin-d_100g'], 1_000_000),
  };
}

function foodFromOFF(code: string, product: any): Food {
  const brand = typeof product.brands === 'string' ? product.brands.split(',')[0]?.trim() : undefined;
  return {
    id: `off-${code}`,
    name: product.product_name_pt || product.product_name || `Produto ${code}`,
    brand: brand || undefined,
    source: 'Open Food Facts',
    emoji: '🛒',
    kind: 'marca',
    per100: nutrientsFromOFF(product.nutriments ?? {}),
    unitGrams: 100,
    unitLabel: 'porção (100 g)',
  };
}

/** Linha da tabela `products` (Supabase) → Food. */
function foodFromRow(row: any): Food {
  return {
    id: `off-${row.barcode}`,
    name: row.name,
    brand: row.brand ?? undefined,
    source: row.source ?? 'Open Food Facts',
    emoji: '🛒',
    kind: 'marca',
    liquid: row.liquid ?? undefined,
    per100: row.per100 as Nutrients,
    unitGrams: row.unit_grams ?? 100,
    unitLabel: row.unit_label ?? 'porção (100 g)',
  };
}

/** Food → linha para gravar no cache Supabase. */
function rowFromFood(barcode: string, food: Food, imageUrl?: string) {
  return {
    barcode,
    name: food.name,
    brand: food.brand ?? null,
    per100: food.per100,
    liquid: food.liquid ?? false,
    source: food.source,
    image_url: imageUrl ?? null,
  };
}

/**
 * Resolve um código de barras em um `Food`, ou `null` se não existir em lugar nenhum.
 * Nunca lança — em erro de rede/tabela, apenas segue para a próxima fonte.
 */
export async function lookupProduct(barcode: string): Promise<Food | null> {
  const code = barcode.replace(/\D/g, '').trim();
  if (!code) return null;

  // 1) cache próprio (Supabase) — leitura é pública; se a tabela não existir, ignora
  if (supabase) {
    const { data } = await supabase.from('products').select('*').eq('barcode', code).maybeSingle();
    if (data) {
      const food = foodFromRow(data);
      rememberFood(food);
      return food;
    }
  }

  // 2) Open Food Facts ao vivo
  try {
    const res = await fetch(`${OFF_ENDPOINT}/${code}.json?fields=${OFF_FIELDS}`);
    const json = await res.json();
    if (json?.status === 1 && json.product) {
      const food = foodFromOFF(code, json.product);
      rememberFood(food);
      // grava no cache para todos (só funciona logado — RLS restringe escrita a authenticated)
      if (supabase) {
        void supabase.from('products').upsert(rowFromFood(code, food, json.product.image_url));
      }
      return food;
    }
  } catch {
    // rede fora / resposta inválida → cai no fallback do chamador
  }

  return null;
}
