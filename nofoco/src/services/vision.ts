/**
 * Foto com IA (E5): manda a foto do prato para a Edge Function `analisar-foto`
 * e recebe os alimentos estimados.
 *
 * A chave da Anthropic vive só no servidor (ver supabase/functions/analisar-foto).
 * Aqui só trafega a imagem. Requer login — a função usa o token da sessão.
 */
import { rememberFood, type Food, type Nutrients } from '@/data/foods';
import { supabase } from '@/services/supabase';

/** Item estimado pela IA, já no formato que a tela de porção entende. */
export type GuessedItem = {
  food: Food;
  grams: number;
  confidence: 'alta' | 'media' | 'baixa';
};

export type VisionResult =
  | { kind: 'ok'; items: GuessedItem[]; aviso?: string }
  | { kind: 'sem-comida'; aviso: string }
  | { kind: 'erro'; message: string };

type RawItem = {
  name: string;
  grams: number;
  confidence: 'alta' | 'media' | 'baixa';
  per100: Partial<Nutrients> & { kcal: number; carb: number; protein: number; fat: number };
};

let seq = 0;

/** Item da IA → Food (id volátil; `rememberFood` deixa a porção resolvê-lo). */
function toFood(raw: RawItem): Food {
  const p = raw.per100;
  const food: Food = {
    id: `ia-${Date.now().toString(36)}-${seq++}`,
    name: raw.name,
    source: 'Estimativa por foto (IA)',
    emoji: '📷',
    kind: 'refeicao',
    per100: {
      kcal: Math.round(p.kcal ?? 0),
      carb: p.carb ?? 0,
      protein: p.protein ?? 0,
      fat: p.fat ?? 0,
      fiber: p.fiber ?? 0,
      sodium: Math.round(p.sodium ?? 0),
    },
    unitGrams: Math.max(1, Math.round(raw.grams || 100)),
    unitLabel: `porção estimada (${Math.round(raw.grams || 100)} g)`,
  };
  rememberFood(food);
  return food;
}

export async function analisarFoto(base64: string, mediaType = 'image/jpeg'): Promise<VisionResult> {
  if (!supabase) return { kind: 'erro', message: 'Backend não configurado.' };

  const { data, error } = await supabase.functions.invoke('analisar-foto', {
    body: { image: base64, mediaType },
  });

  if (error) {
    return { kind: 'erro', message: 'Não consegui falar com o servidor. Tente de novo.' };
  }
  if (data?.error) return { kind: 'erro', message: data.error };

  const raw: RawItem[] = Array.isArray(data?.items) ? data.items : [];
  const items = raw
    .filter((r) => r?.name && Number.isFinite(r.grams) && r.grams > 0)
    .map((r) => ({ food: toFood(r), grams: Math.round(r.grams), confidence: r.confidence ?? 'baixa' }));

  if (items.length === 0) {
    return { kind: 'sem-comida', aviso: data?.aviso ?? 'Não identifiquei comida nesta foto.' };
  }
  return { kind: 'ok', items, aviso: data?.aviso };
}
