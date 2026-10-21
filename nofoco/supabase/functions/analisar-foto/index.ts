/**
 * Edge Function: estima os alimentos de uma foto de prato usando Google Gemini Vision (ou Anthropic Claude).
 *
 * Roda no servidor (Supabase) para que a chave de API da IA NUNCA fique no app mobile.
 *
 * Como configurar no Supabase:
 * 1. Obtenha sua chave gratuita do Gemini em: https://aistudio.google.com/
 * 2. Configure o segredo no Supabase:
 *    npx supabase secrets set GEMINI_API_KEY=AIzaSy...
 * 3. Faça o deploy da função:
 *    npx supabase functions deploy analisar-foto
 */

const SYSTEM_PROMPT = `Você é um nutricionista especialista em culinária brasileira e na Tabela Brasileira de Composição de Alimentos (TACO).
Você analisa fotos de comida e estima os alimentos presentes no prato.

Regras:
1. Identifique cada alimento visível separadamente (arroz branco, feijão carioca, filé de frango grelhado, salada de alface e tomate...).
2. Estime o peso da porção em gramas com base em referências visuais (tamanho relativo ao prato, talheres, copo, mão).
3. Os valores nutricionais em "per100" são SEMPRE por 100 g do alimento (base TACO/IBGE), e NÃO da porção inteira.
4. "confidence" deve ser "alta" para alimentos óbvios (arroz, ovo, frango), "media" para preparações mistas, e "baixa" se estiver encoberto ou difícil de distinguir.
5. Se a foto NÃO for de comida ou refeição, retorne a lista "items" vazia e preencha "aviso" com uma mensagem amigável explicando o motivo.`;

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
    const { image, mediaType = 'image/jpeg' } = await req.json();
    if (!image) return json({ error: 'Envie a imagem em base64 no campo "image".' }, 400);

    // Limpa prefixos data:image/...;base64, se houver
    const cleanBase64 = image.replace(/^data:image\/[a-z]+;base64,/, '');

    // ─────────────────────────────────────────────────────────────
    // 1. Prioridade: Google Gemini (Gemini 1.5 Flash / 2.0 Flash)
    // ─────────────────────────────────────────────────────────────
    if (geminiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

      const geminiBody = {
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mediaType,
                  data: cleanBase64,
                },
              },
              {
                text: 'Que alimentos estão neste prato? Estime peso da porção em gramas e composição por 100g.',
              },
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
                    name: { type: 'STRING', description: 'Nome do alimento em português' },
                    grams: { type: 'NUMBER', description: 'Peso estimado da porção em gramas' },
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
                        sodium: { type: 'NUMBER', description: 'Sódio em mg por 100g' },
                      },
                    },
                  },
                },
              },
              aviso: { type: 'STRING', description: 'Mensagem explicativa se a foto não for comida' },
            },
          },
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Erro na API do Gemini:', errText);
        return json({ error: `Erro na API do Gemini: ${res.statusText}` }, 502);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return json({ error: 'Resposta vazia da IA.' }, 502);

      const parsed = JSON.parse(rawText);
      return json(parsed);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Fallback: Anthropic Claude
    // ─────────────────────────────────────────────────────────────
    const { default: Anthropic } = await import('npm:@anthropic-ai/sdk@0.72.0');
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: cleanBase64 },
            },
            { type: 'text', text: 'Que alimentos estão neste prato? Estime peso e nutrição em JSON.' },
          ],
        },
      ],
    });

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return json({ error: 'Resposta vazia do modelo.' }, 502);
    return json(JSON.parse(block.text));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Falha desconhecida';
    console.error('analisar-foto error:', message);
    return json({ error: `Falha ao analisar a foto: ${message}` }, 500);
  }
});
