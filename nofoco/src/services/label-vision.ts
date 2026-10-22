/**
 * Leitura de Tabela Nutricional por IA (Gemini Vision).
 * Analisa a foto do rótulo/tabela de informação nutricional de um alimento e extrai:
 * - Nome do produto e marca
 * - Porção de referência (ex: "30g (2 biscoitos)")
 * - Valores normalizados por 100g (kcal, carbo, proteína, gordura, fibra, sódio, açúcar, gorduras saturadas/trans)
 */
import type { Food, Nutrients } from '@/data/foods';
import { supabase } from '@/services/supabase';

export type ScannedLabelData = {
  name: string;
  brand?: string;
  servingGrams: number;
  servingLabel: string;
  liquid?: boolean;
  per100: {
    kcal: number;
    carb: number;
    protein: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar?: number;
    satFat?: number;
    transFat?: number;
  };
};

export type LabelVisionResult =
  | { kind: 'ok'; data: ScannedLabelData; aviso?: string }
  | { kind: 'sem-tabela'; aviso: string }
  | { kind: 'erro'; message: string };

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function labelToFood(data: ScannedLabelData, barcode?: string): Food {
  const id = barcode ? `barcode-${barcode}` : `label-${Date.now().toString(36)}`;
  const unitGrams = Math.max(1, Math.round(data.servingGrams || 100));
  const unitLabel = data.servingLabel?.trim() || `porção (${unitGrams} ${data.liquid ? 'ml' : 'g'})`;

  return {
    id,
    name: data.name?.trim() || 'Alimento Rótulo',
    brand: data.brand?.trim() || undefined,
    source: barcode ? 'Código de barras / Rótulo' : 'Rótulo Nutricional (IA)',
    emoji: data.liquid ? '🥤' : '🏷️',
    kind: data.brand ? 'marca' : 'alimento',
    liquid: Boolean(data.liquid),
    per100: {
      kcal: Math.round(data.per100.kcal ?? 0),
      carb: round1(data.per100.carb ?? 0),
      protein: round1(data.per100.protein ?? 0),
      fat: round1(data.per100.fat ?? 0),
      fiber: round1(data.per100.fiber ?? 0),
      sodium: Math.round(data.per100.sodium ?? 0),
      sugar: data.per100.sugar !== undefined ? round1(data.per100.sugar) : undefined,
      satFat: data.per100.satFat !== undefined ? round1(data.per100.satFat) : undefined,
      transFat: data.per100.transFat !== undefined ? round1(data.per100.transFat) : undefined,
    },
    unitGrams,
    unitLabel,
    barcode: barcode ? barcode.trim() : undefined,
  };
}

const LABEL_SYSTEM_PROMPT = `Você é um nutricionista especialista em leitura de rótulos e tabelas de informação nutricional de alimentos brasileiras (padrão ANVISA e internacional).
Analise a imagem da embalagem ou da tabela nutricional e extraia com precisão os dados.

Regras fundamentais:
1. "name": Extraia o nome do produto visível no rótulo (ex: "Biscoito Recheado Chocolate", "Iogurte Grego Tradicional", "Barra de Proteína"). Se não houver nome claro, use uma descrição precisa do alimento.
2. "brand": Nome da marca do fabricante se visível (ex: "Nestlé", "Bauducco", "Danone").
3. "servingGrams": Peso da porção de referência em gramas (ou ml para líquidos) descrita na tabela (ex: se a porção for "30g (2 biscoitos)", "servingGrams" é 30). Se não encontrar, use 100.
4. "servingLabel": Texto da porção descrita na embalagem (ex: "2 biscoitos (30g)", "1 copo (200ml)", "1 fatia (50g)").
5. "liquid": true se for líquido/bebida (leite, suco, refrigerante), false se for sólido.
6. "per100": Os valores nutricionais DEVEM SER NORMALIZADOS PARA 100g (ou 100ml).
   - Se a tabela do rótulo já tiver a coluna "100 g", use diretamente os valores dela!
   - Se a tabela informar apenas valores por porção (ex: 150 kcal para 30g), calcule a regra de três para 100g: (valor / porção) * 100.
   - "kcal": valor energético em kcal por 100g.
   - "carb": carboidratos em gramas por 100g.
   - "protein": proteínas em gramas por 100g.
   - "fat": gorduras totais em gramas por 100g.
   - "fiber": fibras alimentares em gramas por 100g.
   - "sodium": sódio em miligramas (mg) por 100g (atenção: mg, não g).
   - "sugar": açúcares totais em gramas por 100g (se informado).
   - "satFat": gorduras saturadas em gramas por 100g (se informado).
   - "transFat": gorduras trans em gramas por 100g (se informado).
7. Se a imagem NÃO contiver uma tabela nutricional nem um rótulo com nutrientes legíveis, retorne "aviso" explicando e deixe "name" vazio.`;

async function analisarTabelaComGeminiDireto(
  base64: string,
  mediaType: string,
  apiKey: string,
): Promise<LabelVisionResult> {
  const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        system_instruction: { parts: [{ text: LABEL_SYSTEM_PROMPT }] },
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mediaType, data: cleanBase64 } },
              {
                text: 'Leia esta tabela nutricional e extraia o nome do produto, porção e valores normalizados para 100g.',
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: {
            type: 'OBJECT',
            required: ['servingGrams', 'per100'],
            properties: {
              name: { type: 'STRING', description: 'Nome do produto alimentício' },
              brand: { type: 'STRING', description: 'Marca do produto se visível' },
              servingGrams: { type: 'NUMBER', description: 'Peso da porção de referência em g ou ml' },
              servingLabel: { type: 'STRING', description: 'Descrição da porção no rótulo' },
              liquid: { type: 'BOOLEAN', description: 'Verdadeiro se for bebida/líquido' },
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
                  sugar: { type: 'NUMBER' },
                  satFat: { type: 'NUMBER' },
                  transFat: { type: 'NUMBER' },
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
          if (parsed.aviso && (!parsed.per100 || !parsed.name)) {
            return { kind: 'sem-tabela', aviso: parsed.aviso };
          }
          if (parsed.per100) {
            return {
              kind: 'ok',
              data: {
                name: parsed.name || 'Alimento Rótulo',
                brand: parsed.brand || undefined,
                servingGrams: Number(parsed.servingGrams) || 100,
                servingLabel: parsed.servingLabel || `${Number(parsed.servingGrams) || 100}g`,
                liquid: Boolean(parsed.liquid),
                per100: {
                  kcal: Number(parsed.per100.kcal) || 0,
                  carb: Number(parsed.per100.carb) || 0,
                  protein: Number(parsed.per100.protein) || 0,
                  fat: Number(parsed.per100.fat) || 0,
                  fiber: Number(parsed.per100.fiber) || 0,
                  sodium: Number(parsed.per100.sodium) || 0,
                  sugar: parsed.per100.sugar !== undefined ? Number(parsed.per100.sugar) : undefined,
                  satFat: parsed.per100.satFat !== undefined ? Number(parsed.per100.satFat) : undefined,
                  transFat: parsed.per100.transFat !== undefined ? Number(parsed.per100.transFat) : undefined,
                },
              },
              aviso: parsed.aviso,
            };
          }
        }
      }
    } catch (e) {
      console.warn(`Tentativa de leitura de tabela com ${model} falhou:`, e);
    }
  }

  return { kind: 'erro', message: 'Não foi possível ler a tabela nutricional pela imagem.' };
}

export async function analisarTabelaNutricional(
  base64: string,
  mediaType = 'image/jpeg',
): Promise<LabelVisionResult> {
  const directKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  // 1. Tenta direto via Gemini se chave local configurada
  if (directKey) {
    const res = await analisarTabelaComGeminiDireto(base64, mediaType, directKey);
    if (res.kind === 'ok' || res.kind === 'sem-tabela') {
      return res;
    }
  }

  // 2. Fallback via Edge Function Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('analisar-foto', {
        body: { image: base64, mediaType, type: 'tabela' },
      });

      if (!error && data && data.per100) {
        return {
          kind: 'ok',
          data: {
            name: data.name || 'Alimento Rótulo',
            brand: data.brand || undefined,
            servingGrams: Number(data.servingGrams) || 100,
            servingLabel: data.servingLabel || `${Number(data.servingGrams) || 100}g`,
            liquid: Boolean(data.liquid),
            per100: {
              kcal: Number(data.per100.kcal) || 0,
              carb: Number(data.per100.carb) || 0,
              protein: Number(data.per100.protein) || 0,
              fat: Number(data.per100.fat) || 0,
              fiber: Number(data.per100.fiber) || 0,
              sodium: Number(data.per100.sodium) || 0,
              sugar: data.per100.sugar !== undefined ? Number(data.per100.sugar) : undefined,
              satFat: data.per100.satFat !== undefined ? Number(data.per100.satFat) : undefined,
              transFat: data.per100.transFat !== undefined ? Number(data.per100.transFat) : undefined,
            },
          },
          aviso: data.aviso,
        };
      }
    } catch {
      // segue para erro padrão
    }
  }

  return {
    kind: 'erro',
    message: 'Não foi possível ler a tabela nutricional desta foto. Tente uma foto mais nítida ou com melhor iluminação.',
  };
}
