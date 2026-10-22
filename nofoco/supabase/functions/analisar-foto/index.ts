/**
 * Edge Function: analisa foto de prato (estimativa) OU foto de tabela nutricional (leitura de rótulo).
 * Roda no servidor (Supabase) para manter a chave da IA segura.
 */

const SYSTEM_PROMPT_PRATO = `Você é um nutricionista especialista em culinária brasileira e na Tabela Brasileira de Composição de Alimentos (TACO).
Você analisa fotos de comida e estima os alimentos presentes no prato.

Regras:
1. Identifique cada alimento visível separadamente (arroz branco, feijão carioca, filé de frango grelhado, salada de alface e tomate...).
2. Estime o peso da porção em gramas com base em referências visuais (tamanho relativo ao prato, talheres, copo, mão).
3. Os valores nutricionais em "per100" são SEMPRE por 100 g do alimento (base TACO/IBGE), e NÃO da porção inteira.
4. "confidence" deve ser "alta", "media" ou "baixa".
5. Se a foto NÃO for de comida ou refeição, retorne a lista "items" vazia e preencha "aviso" com uma mensagem amigável explicando o motivo.`;

const SYSTEM_PROMPT_TABELA = `Você é um nutricionista especialista em leitura de rótulos e tabelas de informação nutricional brasileiras (padrão ANVISA e internacional).
Analise a imagem da embalagem ou da tabela nutricional e extraia com precisão os dados.

Regras fundamentais:
1. "name": Nome do produto alimentício visível.
2. "brand": Nome da marca se visível.
3. "servingGrams": Peso da porção de referência em gramas (ou ml) descrita na tabela (ex: 30g). Se não achar, use 100.
4. "servingLabel": Descrição da porção descrita na embalagem (ex: "2 biscoitos (30g)").
5. "liquid": true se for bebida/líquido.
6. "per100": Valores normalizados para 100g (ou 100ml). Se o rótulo só tiver dados por porção, calcule a regra de três para 100g: (valor / porção) * 100.
7. Se não for rótulo ou tabela nutricional, preencha "aviso".`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!geminiKey && !anthropicKey) {
    return json(
      { error: 'Chave de IA (GEMINI_API_KEY ou ANTHROPIC_API_KEY) não configurada no servidor Supabase.' },
      500,
    );
  }

  try {
    const { image, mediaType = 'image/jpeg', type = 'prato' } = await req.json();
    if (!image) return json({ error: 'Envie a imagem em base64 no campo "image".' }, 400);

    const cleanBase64 = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const isTabela = type === 'tabela' || type === 'label';

    if (geminiKey) {
      const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let lastError = '';

      for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

        const geminiBody = isTabela
          ? {
              system_instruction: { parts: [{ text: SYSTEM_PROMPT_TABELA }] },
              contents: [
                {
                  parts: [
                    { inline_data: { mime_type: mediaType, data: cleanBase64 } },
                    { text: 'Extraia os dados da tabela nutricional e do produto normalizados por 100g.' },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: 'application/json',
                response_schema: {
                  type: 'OBJECT',
                  required: ['servingGrams', 'per100'],
                  properties: {
                    name: { type: 'STRING' },
                    brand: { type: 'STRING' },
                    servingGrams: { type: 'NUMBER' },
                    servingLabel: { type: 'STRING' },
                    liquid: { type: 'BOOLEAN' },
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
            }
          : {
              system_instruction: { parts: [{ text: SYSTEM_PROMPT_PRATO }] },
              contents: [
                {
                  parts: [
                    { inline_data: { mime_type: mediaType, data: cleanBase64 } },
                    { text: 'Identifique os alimentos deste prato, estimando a porção em gramas e os nutrientes por 100g.' },
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
          body: JSON.stringify(geminiBody),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            try {
              return json(JSON.parse(rawText));
            } catch {
              return json({ error: 'Resposta da IA não veio em JSON válido.', raw: rawText }, 500);
            }
          }
        } else {
          lastError = await res.text();
        }
      }

      return json({ error: 'Todos os modelos Gemini falharam.', details: lastError }, 502);
    }

    return json({ error: 'Nenhum provedor de IA disponível.' }, 500);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: 'Falha interna ao processar imagem.', details: message }, 500);
  }
});
