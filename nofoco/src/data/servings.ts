/**
 * Medidas caseiras padronizadas (IBGE, Tabela da USP e ANVISA).
 *
 * Fornece opções rápidas de porção (colher de sopa, fatia, concha, lata, copo)
 * para alimentos genéricos (TACO) e produtos de código de barras.
 */
import type { Food, Serving } from '@/data/foods';

type MeasureRule = {
  /** Palavras-chave no nome do alimento ou marca (todas em minúsculas). */
  keywords: string[];
  /** Se true, a primeira medida desta regra assume prioridade como unidade padrão. */
  preferFirst?: boolean;
  servings: Serving[];
};

const RULES: MeasureRule[] = [
  // Monster Energy e energéticos em lata grande (no Brasil a lata clássica é 473 ml)
  {
    keywords: ['monster', 'ultra fiesta', 'energy drink', 'energetico', 'energético', 'red bull', 'redbull', 'bally', 'tnt energy'],
    preferFirst: true,
    servings: [
      { id: 'lata-473', label: '1 lata (473ml)', grams: 473 },
      { id: 'copo-200', label: 'copo / porção (200ml)', grams: 200 },
      { id: 'lata-269', label: 'lata compacta (269ml)', grams: 269 },
      { id: 'lata-350', label: 'lata padrão (350ml)', grams: 350 },
    ],
  },
  // Manteiga, margarina e pastas untáveis
  {
    keywords: ['manteiga', 'margarina'],
    servings: [
      { id: 'colher-sopa', label: 'colher de sopa (10g)', grams: 10 },
      { id: 'colher-cha', label: 'colher de chá (5g)', grams: 5 },
      { id: 'ponta-faca', label: 'ponta de faca (3g)', grams: 3 },
    ],
  },
  // Requeijão, maionese, cream cheese e patês
  {
    keywords: ['requeijao', 'requeijão', 'maionese', 'cream cheese', 'pate', 'patê', 'pasta de amendoim'],
    servings: [
      { id: 'colher-sopa', label: 'colher de sopa (20g)', grams: 20 },
      { id: 'colher-sobremesa', label: 'colher de sobremesa (12g)', grams: 12 },
      { id: 'colher-cha', label: 'colher de chá (7g)', grams: 7 },
    ],
  },
  // Óleos e azeites
  {
    keywords: ['azeite', 'oleo', 'óleo'],
    servings: [
      { id: 'colher-sopa', label: 'colher de sopa (13ml)', grams: 13 },
      { id: 'colher-sobremesa', label: 'colher de sobremesa (8ml)', grams: 8 },
      { id: 'colher-cha', label: 'colher de chá (4ml)', grams: 4 },
      { id: 'fio', label: 'fio de azeite (5ml)', grams: 5 },
    ],
  },
  // Arroz e risotos
  {
    keywords: ['arroz', 'risoto'],
    servings: [
      { id: 'colher-servir', label: 'colher de servir (45g)', grams: 45 },
      { id: 'colher-sopa-cheia', label: 'colher de sopa cheia (25g)', grams: 25 },
      { id: 'xicara', label: 'xícara de chá (150g)', grams: 150 },
    ],
  },
  // Feijão, lentilha e grão-de-bico
  {
    keywords: ['feijao', 'feijão', 'lentilha', 'grao-de-bico', 'grão-de-bico', 'grao de bico'],
    servings: [
      { id: 'concha-media', label: 'concha média (130g)', grams: 130 },
      { id: 'concha-pequena', label: 'concha pequena (85g)', grams: 85 },
      { id: 'concha-grande', label: 'concha grande (180g)', grams: 180 },
      { id: 'colher-sopa', label: 'colher de sopa (25g)', grams: 25 },
    ],
  },
  // Pães
  {
    keywords: ['pao', 'pão', 'torrada', 'brioche', 'croissant'],
    servings: [
      { id: 'fatia', label: 'fatia média (25g)', grams: 25 },
      { id: 'fatia-grossa', label: 'fatia grossa (40g)', grams: 40 },
      { id: 'unidade-frances', label: 'unidade (50g)', grams: 50 },
    ],
  },
  // Queijos
  {
    keywords: ['queijo', 'mussarela', 'mucarela', 'muçarela', 'prato', 'parmesao', 'parmesão', 'provolone', 'ricota', 'minas'],
    servings: [
      { id: 'fatia-media', label: 'fatia média (30g)', grams: 30 },
      { id: 'pedaco-pequeno', label: 'pedaço pequeno (25g)', grams: 25 },
      { id: 'colher-ralado', label: 'colher de sopa ralado (10g)', grams: 10 },
    ],
  },
  // Carnes, bifes e frango
  {
    keywords: ['frango', 'carne', 'bife', 'alcatra', 'patinho', 'peito de frango', 'sobrecoxa', 'coxa', 'peixe', 'salmao', 'salmão', 'tilapia', 'tilápia'],
    servings: [
      { id: 'file-medio', label: 'filé/bife médio (120g)', grams: 120 },
      { id: 'file-pequeno', label: 'filé pequeno (80g)', grams: 80 },
      { id: 'file-grande', label: 'filé grande (160g)', grams: 160 },
      { id: 'colher-picado', label: 'colher de sopa picado (25g)', grams: 25 },
    ],
  },
  // Ovos
  {
    keywords: ['ovo', 'ovos', 'omelete'],
    servings: [
      { id: 'un-media', label: '1 unidade média (50g)', grams: 50 },
      { id: 'un-grande', label: '1 unidade grande (60g)', grams: 60 },
      { id: 'duas-un', label: '2 unidades (100g)', grams: 100 },
    ],
  },
  // Farinhas, aveia, cereais e pós (whey)
  {
    keywords: ['aveia', 'farinha', 'granola', 'cereal', 'whey', 'proteina em po', 'proteína em pó'],
    servings: [
      { id: 'colher-sopa', label: 'colher de sopa (15g)', grams: 15 },
      { id: 'colher-sobremesa', label: 'colher de sobremesa (10g)', grams: 10 },
      { id: 'scoop', label: 'dosador / scoop (30g)', grams: 30 },
      { id: 'xicara', label: 'xícara (80g)', grams: 80 },
    ],
  },
  // Açúcar e mel
  {
    keywords: ['acucar', 'açúcar', 'mel', 'melado', 'leite condensado'],
    servings: [
      { id: 'colher-sopa', label: 'colher de sopa (15g)', grams: 15 },
      { id: 'colher-sobremesa', label: 'colher de sobremesa (10g)', grams: 10 },
      { id: 'colher-cha', label: 'colher de chá (5g)', grams: 5 },
    ],
  },
  // Bebidas, sucos, leite e café
  {
    keywords: ['leite', 'suco', 'cafe', 'café', 'cha', 'chá', 'agua', 'água', 'refrigerante', 'coca', 'pepsi', 'guarana', 'guaraná', 'fanta', 'sprite'],
    servings: [
      { id: 'copo-padrao', label: 'copo (200ml)', grams: 200 },
      { id: 'copo-americano', label: 'copo americano (190ml)', grams: 190 },
      { id: 'caneca', label: 'caneca (300ml)', grams: 300 },
      { id: 'lata-padrao', label: 'lata (350ml)', grams: 350 },
      { id: 'xicara-cafe', label: 'xícara de café (50ml)', grams: 50 },
    ],
  },
];

/**
 * Remove acentos e caracteres especiais para comparação flexível.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Retorna as medidas caseiras aplicáveis para um alimento,
 * combinando `extraServings` pré-definidas (ex.: de código de barras)
 * com as regras do catálogo nacional.
 */
export function resolveServings(food: Food): Serving[] {
  const result: Serving[] = [];
  const seenGrams = new Set<number>();

  // 1) Medidas específicas do alimento (ex.: Open Food Facts ou Curated)
  if (food.extraServings && food.extraServings.length > 0) {
    for (const s of food.extraServings) {
      if (!seenGrams.has(s.grams)) {
        result.push(s);
        seenGrams.add(s.grams);
      }
    }
  }

  // 2) Busca nas regras do catálogo examinando nome E marca
  const fullText = normalize(`${food.name} ${food.brand ?? ''}`);
  let matchedRule: MeasureRule | null = null;

  for (const rule of RULES) {
    const matches = rule.keywords.some((k) => fullText.includes(normalize(k)));
    if (matches) {
      matchedRule = rule;
      break;
    }
  }

  // Se a regra tem preferFirst (ex: Monster quer lata 473ml no topo), adiciona primeiro
  if (matchedRule && matchedRule.preferFirst) {
    for (const s of matchedRule.servings) {
      if (!seenGrams.has(s.grams)) {
        result.push(s);
        seenGrams.add(s.grams);
      }
    }
  }

  // 3) A porção padrão da comida
  if (food.unitGrams > 0 && !seenGrams.has(food.unitGrams)) {
    result.push({
      id: 'default',
      label: food.unitLabel || `${food.unitGrams} ${food.liquid ? 'ml' : 'g'}`,
      grams: food.unitGrams,
    });
    seenGrams.add(food.unitGrams);
  }

  // Se a regra não tinha preferFirst, adiciona as medidas caseiras agora
  if (matchedRule && !matchedRule.preferFirst) {
    for (const s of matchedRule.servings) {
      if (!seenGrams.has(s.grams)) {
        result.push(s);
        seenGrams.add(s.grams);
      }
    }
  }

  return result;
}
