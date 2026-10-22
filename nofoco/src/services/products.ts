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
import { rememberFood, type Food, type Nutrients, type Serving } from '@/data/foods';
import { supabase } from '@/services/supabase';
import { useCustomFoods } from '@/store/custom-foods';

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

/** Extrai a quantidade total da embalagem (ex.: 473 ml, 350 ml, 90 g) de product_quantity, quantity ou nome. */
function parsePackageQuantity(product: any): number | null {
  const pq = Number(product.product_quantity);
  if (Number.isFinite(pq) && pq > 0 && pq <= 10000) return Math.round(pq);

  const q = String(product.quantity ?? '').trim();
  const m = q.match(/(\d+(?:[.,]\d+)?)\s*(ml|g|cl|l|kg)\b/i);
  if (m) {
    let val = parseFloat(m[1].replace(',', '.'));
    const u = m[2].toLowerCase();
    if (u === 'l' || u === 'kg') val *= 1000;
    else if (u === 'cl') val *= 10;
    if (Number.isFinite(val) && val > 0 && val <= 10000) return Math.round(val);
  }

  // Tenta extrair do título ou marca (ex: "Monster Energy 473ml", "Refrigerante 350ml")
  const fullText = `${product.product_name ?? ''} ${product.product_name_pt ?? ''} ${product.brands ?? ''}`.toLowerCase();
  const titleMatch = fullText.match(/\b(250|269|310|330|350|355|473|500|600|1000|1500|2000)\s*(ml|g|l)\b/i);
  if (titleMatch) {
    let val = parseFloat(titleMatch[1]);
    if (titleMatch[2].toLowerCase() === 'l') val *= 1000;
    return Math.round(val);
  }

  // Padrões conhecidos no Brasil onde o OFF costuma deixar a quantidade em branco
  if (fullText.includes('monster')) {
    return 473;
  }
  if (fullText.includes('red bull') || fullText.includes('redbull')) {
    return 250;
  }

  return null;
}

function foodFromOFF(code: string, product: any): Food {
  const brand = typeof product.brands === 'string' ? product.brands.split(',')[0]?.trim() : undefined;
  const per100 = nutrientsFromOFF(product.nutriments ?? {});
  per100.kcal = reconcileKcal(per100.kcal, per100.carb, per100.protein, per100.fat);

  const liquid = isLiquid(product);
  const unit = liquid ? 'ml' : 'g';

  const sq = Number(product.serving_quantity);
  const hasServing = Number.isFinite(sq) && sq > 0 && sq <= 2000;
  const servingGrams = hasServing ? Math.round(sq) : null;
  const pkgGrams = parsePackageQuantity(product);

  const extraServings: Serving[] = [];
  let unitGrams = 100;
  let unitLabel = `100 ${unit}`;

  // Se for produto de dose individual/consumo direto (lata/garrafa <= 600ml ou pacote/barra <= 150g),
  // o consumidor espera que "1 unidade" seja a lata/embalagem inteira (ex.: Monster 473 ml).
  const isSingleServe = pkgGrams && (liquid ? pkgGrams <= 600 : pkgGrams <= 150);

  if (isSingleServe && pkgGrams) {
    unitGrams = pkgGrams;
    const containerName = liquid ? (pkgGrams >= 250 && pkgGrams <= 500 ? 'lata' : 'garrafa') : 'unidade';
    unitLabel = `${containerName} (${pkgGrams} ${unit})`;

    extraServings.push({
      id: 'embalagem',
      label: `1 ${containerName} (${pkgGrams} ${unit})`,
      grams: pkgGrams,
    });

    if (servingGrams && servingGrams !== pkgGrams) {
      extraServings.push({
        id: 'porcao-anvisa',
        label: `copo / porção (${servingGrams} ${unit})`,
        grams: servingGrams,
      });
    }
  } else if (servingGrams) {
    // Embalagem maior (ex.: garrafa de 2 litros, pote de manteiga 500g): a porção da tabela é a padrão
    unitGrams = servingGrams;
    unitLabel = `porção (${servingGrams} ${unit})`;

    extraServings.push({
      id: 'porcao',
      label: `porção (${servingGrams} ${unit})`,
      grams: servingGrams,
    });

    if (pkgGrams && pkgGrams !== servingGrams) {
      extraServings.push({
        id: 'embalagem-total',
        label: `embalagem inteira (${pkgGrams} ${unit})`,
        grams: pkgGrams,
      });
    }
  } else if (pkgGrams) {
    unitGrams = pkgGrams;
    unitLabel = `embalagem (${pkgGrams} ${unit})`;
    extraServings.push({
      id: 'embalagem',
      label: `embalagem (${pkgGrams} ${unit})`,
      grams: pkgGrams,
    });
  }

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
    barcode: code,
    extraServings: extraServings.length > 0 ? extraServings : undefined,
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
    barcode: row.barcode ? String(row.barcode) : undefined,
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

  // 0) Alimentos cadastrados localmente pelo usuário (cache local instantâneo e offline)
  try {
    const custom = useCustomFoods
      .getState()
      .customFoods.find((f) => f.barcode === code || f.id === `barcode-${code}`);
    if (custom) {
      rememberFood(custom);
      return custom;
    }
  } catch {
    // se a store não tiver pronta, segue para as próximas fontes
  }

  // 1) Open Food Facts ao vivo (prioriza para trazer as porções e correções mais recentes)
  try {
    const res = await fetch(`${OFF_ENDPOINT}/${code}.json?fields=${OFF_FIELDS}`);
    const json = await res.json();
    if (json?.status === 1 && json.product) {
      const food = foodFromOFF(code, json.product);
      if (hasNutrition(food)) {
        rememberFood(food);
        if (supabase) {
          void supabase.from('products').upsert(rowFromFood(code, food, json.product.image_url));
        }
        return food;
      }
    }
  } catch {
    // rede fora / erro -> fallback no cache
  }

  // 2) cache próprio (Supabase)
  if (supabase) {
    const { data } = await supabase.from('products').select('*').eq('barcode', code).maybeSingle();
    if (data) {
      const food = foodFromRow(data);
      if (hasNutrition(food)) {
        rememberFood(food);
        return food;
      }
    }
  }

  return null;
}
