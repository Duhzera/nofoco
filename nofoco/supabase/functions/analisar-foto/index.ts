/**
 * Edge Function: estima os alimentos de uma foto de prato (E5 do plano, §4.5).
 *
 * Roda no servidor (Supabase) para a chave da Anthropic NUNCA ir no app — num APK
 * qualquer um extrairia a chave e gastaria os créditos. O app manda a imagem em
 * base64 e recebe de volta uma lista de itens estimados.
 *
 * Deploy:  npx supabase functions deploy analisar-foto
 * Segredo: npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.72.0';

const MODEL = 'claude-opus-5';

const SYSTEM = `Você analisa fotos de comida e estima o que há no prato.

Regras:
- Liste cada alimento visível separadamente (arroz, feijão, bife, salada...).
- Estime o peso em gramas pela referência visual (prato, talher, mão).
- Os valores nutricionais são por 100 g do alimento, não da porção.
- Use dados de composição de alimentos brasileiros (padrão TACO) quando servir.
- Se a foto não for comida, devolva items vazio e explique em "aviso".
- É estimativa: prefira errar para menos a inventar precisão.`;

/** Formato fixo da resposta — evita ter que adivinhar texto livre. */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'grams', 'confidence', 'per100'],
        properties: {
          name: { type: 'string', description: 'nome do alimento em português' },
          grams: { type: 'number', description: 'peso estimado da porção em gramas' },
          confidence: { type: 'string', enum: ['alta', 'media', 'baixa'] },
          per100: {
            type: 'object',
            additionalProperties: false,
            required: ['kcal', 'carb', 'protein', 'fat'],
            properties: {
              kcal: { type: 'number' },
              carb: { type: 'number' },
              protein: { type: 'number' },
              fat: { type: 'number' },
              fiber: { type: 'number' },
              sodium: { type: 'number', description: 'mg por 100 g' },
            },
          },
        },
      },
    },
    aviso: { type: 'string', description: 'observação quando a foto está ruim ou não é comida' },
  },
};

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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' }, 500);

  try {
    const { image, mediaType } = await req.json();
    if (!image) return json({ error: 'Envie a imagem em base64 no campo "image".' }, 400);

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: image },
            },
            { type: 'text', text: 'Que alimentos estão neste prato? Estime peso e nutrição.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return json({ error: 'Não consegui analisar esta imagem.' }, 422);
    }

    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'Resposta vazia do modelo.' }, 502);

    return json(JSON.parse(text.text));
  } catch (e) {
    console.error('analisar-foto:', e);
    return json({ error: 'Falha ao analisar a foto.' }, 500);
  }
});
