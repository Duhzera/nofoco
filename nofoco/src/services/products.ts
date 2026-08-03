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
const OFF_FIELDS =
  'code,product_name,product_name_pt,brands,image_url,nutriments,' +
  'serving_size,serving_quantity,serving_quantity_unit,product_quantity,product_quantity_unit,quantity';

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

/**
 * kcal fisicamente impossível (>900/100 g — nem gordura pura passa disso) ou ausente
 * costuma ser dado errado no OFF (colaborativo). Nesses casos recalcula pelos macros
 * (4/4/9), que quase sempre está certo (ex.: manteiga com "7000" vira ~729 pela gordura).
 */
function reconcileKcal(reported: number, carb: number, protein: number, fat: number): number {
  const fromMacros = Math.round(4 * (carb || 0) + 4 * (protein || 0) + 9 * (fat || 0));
  const ok = (v: number) => v > 0 && v <= 900;
  if (ok(reported)) return reported;
  if (ok(fromMacros)) return fromMacros;
  return Math.min(reported || fromMacros || 0, 900);
}

/** Tem nutrição usável? (produto do OFF pode existir com a tabela toda vazia.) */
function hasNutrition(food: Food): boolean {
  const p = food.per100;
  return p.kcal > 0 || p.carb > 0 || p.protein > 0 || p.fat > 0;
}

/** Detecta se o produto é líquido (usa ml em vez de g) pelos campos do OFF. */
function isLiquid(product: any): boolean {
  const unit = String(product.serving_quantity_unit ?? product.product_quantity_unit ?? '').toLowerCase();
  if (unit === 'ml' || unit === 'cl' || unit === 'l') return true;
  const text = `${product.serving_size ?? ''} ${product.quantity ?? ''}`.toLowerCase();
  return /\d\s*(ml|cl|litro|liter)\b|\b\d+\s*l\b/.test(text);
}

/** Nome do produto, evitando lixo do OFF (vazio, só número, curto demais). */
function pickName(product: any, code: string): string {
  const good = (s: string) => s.trim().length >= 3 && !/^[\d.,\s]+$/.test(s);
  const pt = String(product.product_name_pt ?? '').trim();
  const en = String(product.product_name ?? '').trim();
  if (good(pt)) return pt;
  if (good(en)) return en;
  return en || pt || `Produto ${code}`;
}

function foodFromOFF(code: string, product: any): Food {
  const brand = typeof product.brands === 'string' ? product.brands.split(',')[0]?.trim() : undefined;
  const per100 = nutrientsFromOFF(product.nutriments ?? {});
  per100.kcal = reconcileKcal(per100.kcal, per100.carb, per100.protein, per100.fat);

  const liquid = isLiquid(product);
  const unit = liquid ? 'ml' : 'g';

  // usa a porção real do rótulo como "1 unidade" (ex.: 20 g, 200 ml); senão, 100 g/ml.
  const sq = Number(product.serving_quantity);
  const hasServing = Number.isFinite(sq) && sq > 0 && sq <= 1500;
  const unitGrams = hasServing ? Math.round(sq) : 100;
  const unitLabel = hasServing ? `porção (${unitGrams} ${unit})` : `100 ${unit}`;

  return {
    id: `off-${code}`,
    name: pickName(product, code),
    brand: brand || undefined,
    source: 'Open Food Facts',
    emoji: '🛒',
    kind: 'marca',
    liquid,
    per100,
    unitGrams,
    unitLabel,
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
    unit_grams: food.unitGrams,
    unit_label: food.unitLabel,
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
      if (hasNutrition(food)) {
        rememberFood(food);
        return food;
      }
      // linha antiga sem nutrição → tenta o OFF de novo (pode ter sido preenchido)
    }
  }

  // 2) Open Food Facts ao vivo
  try {
    const res = await fetch(`${OFF_ENDPOINT}/${code}.json?fields=${OFF_FIELDS}`);
    const json = await res.json();
    if (json?.status === 1 && json.product) {
      const food = foodFromOFF(code, json.product);
      // produto existe mas sem nutrição usável → trata como "não encontrado"
      if (!hasNutrition(food)) return null;
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
