/**
 * Foto com IA (E5): manda a foto do prato para análise e recebe os alimentos estimados.
 *
 * Modo produção: chama a Edge Function `analisar-foto` no Supabase (chave oculta no servidor).
 * Modo direto/desenvolvimento: se `EXPO_PUBLIC_GEMINI_API_KEY` estiver configurada, chama a API do Gemini diretamente.
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
  confidence: 'alta' | 'media' | 'baixa' | number;
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

const SYSTEM_PROMPT = `Você é um nutricionista especialista em culinária brasileira e na Tabela Brasileira de Composição de Alimentos (TACO).
Você analisa fotos de comida e estima os alimentos presentes no prato.

Regras:
1. Identifique cada alimento visível separadamente (arroz branco, feijão carioca, filé de frango grelhado, salada de alface e tomate...).
2. Estime o peso da porção em gramas com base em referências visuais (tamanho relativo ao prato, talheres, copo, mão).
3. Os valores nutricionais em "per100" são SEMPRE por 100 g do alimento (base TACO/IBGE), e NÃO da porção inteira.
4. "confidence" deve ser "alta", "media" ou "baixa".
5. Se a foto NÃO for de comida ou refeição, retorne a lista vazia e preencha "aviso" com uma mensagem amigável explicando o motivo.`;

/** Chamada direta ao Google Gemini (ideal para testes locais e desenvolvimento rápido). */
async function analisarComGeminiDireto(base64: string, mediaType: string, apiKey: string): Promise<VisionResult> {
  const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mediaType, data: cleanBase64 } },
              { text: 'Identifique os alimentos deste prato, estimando o peso da porção em gramas e a composição nutricional por 100g.' },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: {
            type: 'OBJECT',
            required: ['items'],
            properties: {
              items: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  required: ['name', 'grams', 'confidence', 'per100'],
                  properties: {
                    name: { type: 'STRING' },
                    grams: { type: 'NUMBER' },
                    confidence: { type: 'STRING', enum: ['alta', 'media', 'baixa'] },
                    per100: {
                      type: 'OBJECT',
                      required: ['kcal', 'carb', 'protein', 'fat'],
                      properties: {
                        kcal: { type: 'NUMBER' },
                        carb: { type: 'NUMBER' },
                        protein: { type: 'NUMBER' },
                        fat: { type: 'NUMBER' },
                        fiber: { type: 'NUMBER' },
                        sodium: { type: 'NUMBER' },
                      },
                    },
                  },
                },
              },
              aviso: { type: 'STRING' },
            },
          },
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          // Suporta tanto `{ items: [...] }` quanto array direto `[...]`
          const rawItems: RawItem[] = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.items)
            ? parsed.items
            : [];

          const items = rawItems
            .filter((r) => r?.name && Number.isFinite(r.grams) && r.grams > 0)
            .map((r) => {
              let conf: 'alta' | 'media' | 'baixa' = 'alta';
              if (r.confidence === 'alta' || r.confidence === 'media' || r.confidence === 'baixa') {
                conf = r.confidence;
              } else if (typeof r.confidence === 'number') {
                conf = r.confidence >= 0.8 ? 'alta' : r.confidence >= 0.5 ? 'media' : 'baixa';
              }
              return { food: toFood(r), grams: Math.round(r.grams), confidence: conf };
            });

          if (items.length === 0) {
            return { kind: 'sem-comida', aviso: parsed.aviso ?? 'Não identifiquei comida nesta foto.' };
          }
          return { kind: 'ok', items, aviso: parsed.aviso };
        }
      }
    } catch (e) {
      console.warn(`Tentativa com ${model} falhou:`, e);
    }
  }

  return { kind: 'erro', message: 'Não foi possível analisar a imagem pelo Gemini. Tente novamente.' };
}

export async function analisarFoto(base64: string, mediaType = 'image/jpeg'): Promise<VisionResult> {
  const directKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  // 1. Em desenvolvimento ou se a chave direta estiver presente, usa Gemini direto com máxima velocidade
  if (directKey) {
    const res = await analisarComGeminiDireto(base64, mediaType, directKey);
    if (res.kind === 'ok' || res.kind === 'sem-comida') {
      return res;
    }
  }

  // 2. Tenta via Edge Function do Supabase (quando publicada no servidor)
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('analisar-foto', {
        body: { image: base64, mediaType },
      });

      if (!error && data && !data.error) {
        const rawItems: RawItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : [];

        const items = rawItems
          .filter((r) => r?.name && Number.isFinite(r.grams) && r.grams > 0)
          .map((r) => ({ food: toFood(r), grams: Math.round(r.grams), confidence: (r.confidence as 'alta') ?? 'alta' }));

        if (items.length === 0) {
          return { kind: 'sem-comida', aviso: data.aviso ?? 'Não identifiquei comida nesta foto.' };
        }
        return { kind: 'ok', items, aviso: data.aviso };
      }
    } catch {
      // continua para erro
    }
  }

  return { kind: 'erro', message: 'Serviço de IA não configurado no Supabase.' };
}
