/**
 * Suite de Testes do NoFoco (Node.js nativo)
 */

import { computeGoal, healthyWeightRange } from '../src/lib/goal.ts';
import { forecastToTarget, formatDuration } from '../src/lib/forecast.ts';
import { sumNutrient, formatNutrient, formatValue } from '../src/lib/nutrition.ts';
import { resolveServings } from '../src/data/servings.ts';
import { calculateRecipeNutrients, recipeToFood } from '../src/lib/recipe-calc.ts';

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 EXECUTANDO TESTES AUTOMATIZADOS DO NOFOCO');
console.log('======================================================\n');

// 1. METAS METABÓLICAS
console.log('--- 1. Testes de Metas Metabólicas (Mifflin-St Jeor) ---');
{
  const goalM = computeGoal({
    sex: 'M',
    age: 30,
    heightCm: 180,
    weightKg: 80,
    activity: 'sedentario',
    objective: 'perder',
  });

  assert(goalM.tmb === 1780, 'Cálculo TMB masculino correto (1780 kcal)');
  assert(goalM.tdee === 2136, 'Cálculo TDEE sedentário correto (2136 kcal)');
  assert(goalM.capped === true, 'Piso de segurança travou a meta na TMB');
  assert(goalM.kcal === 1780, 'Meta travada em 1780 kcal');
  assert(goalM.protein === 160, 'Proteína para perda = 2.0g/kg (160g)');

  const goalF = computeGoal({
    sex: 'F',
    age: 25,
    heightCm: 165,
    weightKg: 60,
    activity: 'moderado',
    objective: 'manter',
  });
  assert(goalF.tmb === 1345, 'Cálculo TMB feminino correto (1345 kcal)');
  assert(goalF.kcal === 2085, 'Meta manutenção feminina correta (2085 kcal)');
  assert(goalF.capped === false, 'Sem trava de piso em manutenção');

  const healthy = healthyWeightRange(180);
  assert(healthy.min === 60 && healthy.max === 81, 'Faixa de peso saudável para 180cm (60–81 kg)');
}

// 2. PREVISÃO DE PESO
console.log('\n--- 2. Testes de Previsão de Peso (Simulação Semana a Semana) ---');
{
  const forecast = forecastToTarget({
    sex: 'M',
    age: 28,
    heightCm: 178,
    weightKg: 90,
    activity: 'moderado',
    objective: 'perder',
    targetWeightKg: 80,
  });

  assert(forecast.kind === 'ok', 'Previsão calculada com sucesso');
  if (forecast.kind === 'ok') {
    assert(forecast.weeks > 10 && forecast.weeks < 60, `Prazo plausível (${forecast.weeks} semanas)`);
    assert(forecast.avgWeeklyKg > 0.2 && forecast.avgWeeklyKg < 1.0, `Ritmo médio seguro (${forecast.avgWeeklyKg.toFixed(2)} kg/sem)`);
  }

  const opposite = forecastToTarget({
    sex: 'M',
    age: 28,
    heightCm: 178,
    weightKg: 90,
    activity: 'moderado',
    objective: 'ganhar',
    targetWeightKg: 80,
  });
  assert(opposite.kind === 'sentido-oposto', 'Detecta objetivo e peso alvo em sentidos opostos');

  assert(formatDuration(4) === 'cerca de 4 semanas', 'Formatação em semanas');
  assert(formatDuration(20).includes('meses'), 'Formatação em meses');
}

// 3. MEDIDAS CASEIRAS
console.log('\n--- 3. Testes de Medidas Caseiras & Detecção Inteligente ---');
{
  const monsterFood = {
    id: 'off-7898938890113',
    name: 'Monster Energy - Ultra Fiesta Mango',
    brand: 'MONSTER',
    source: 'Open Food Facts',
    emoji: '🛒',
    kind: 'marca',
    liquid: true,
    per100: { kcal: 3, carb: 1.4, protein: 0, fat: 0, fiber: 0, sodium: 75 },
    unitGrams: 200,
    unitLabel: 'porção (200 ml)',
  };

  const monsterServings = resolveServings(monsterFood);
  assert(monsterServings.length >= 2, `Monster possui ${monsterServings.length} opções de porção`);
  assert(monsterServings[0].grams === 473, `Primeira opção padrão é a lata inteira de 473 ml (obtido: ${monsterServings[0].grams} ml)`);
  assert(monsterServings.some((s) => s.grams === 200), 'Opção secundária inclui o copo de 200 ml');

  const butterFood = {
    id: 'manteiga-com-sal',
    name: 'Manteiga com sal',
    source: 'TACO',
    emoji: '🧈',
    kind: 'alimento',
    per100: { kcal: 720, carb: 0, protein: 0.8, fat: 80, fiber: 0, sodium: 600 },
    unitGrams: 100,
    unitLabel: '100 g',
  };

  const butterServings = resolveServings(butterFood);
  assert(butterServings.some((s) => s.label.includes('colher de sopa') && s.grams === 10), 'Manteiga ganha colher de sopa (10g)');
  assert(butterServings.some((s) => s.label.includes('colher de chá') && s.grams === 5), 'Manteiga ganha colher de chá (5g)');
  assert(butterServings.some((s) => s.label.includes('ponta de faca') && s.grams === 3), 'Manteiga ganha ponta de faca (3g)');
}

// 4. MOTOR DE RECEITAS
console.log('\n--- 4. Testes do Motor de Receitas Caseiras ---');
{
  const ingredients = [
    {
      id: '1',
      foodId: 'farinha',
      name: 'Farinha de Trigo',
      emoji: '🌾',
      grams: 200,
      macros: { kcal: 728, carb: 150, protein: 20, fat: 2, fiber: 5, sodium: 4 },
    },
    {
      id: '2',
      foodId: 'acucar',
      name: 'Açúcar refinado',
      emoji: '🍬',
      grams: 150,
      macros: { kcal: 580, carb: 150, protein: 0, fat: 0, fiber: 0, sodium: 1 },
    },
    {
      id: '3',
      foodId: 'manteiga',
      name: 'Manteiga',
      emoji: '🧈',
      grams: 50,
      macros: { kcal: 360, carb: 0, protein: 0.4, fat: 40, fiber: 0, sodium: 300 },
    },
    {
      id: '4',
      foodId: 'ovos',
      name: 'Ovos',
      emoji: '🥚',
      grams: 100,
      macros: { kcal: 143, carb: 0.7, protein: 12.6, fat: 9.5, fiber: 0, sodium: 140 },
    },
  ];

  // Caso A: cru (500g)
  const resCru = calculateRecipeNutrients(ingredients, 500);
  assert(resCru.totals.kcal === 1811, 'Soma total de calorias exata (1811 kcal)');
  assert(resCru.totals.carb === 300.7, 'Soma de carboidratos exata (300.7 g)');
  assert(resCru.per100.kcal === 362, 'Cálculo por 100g do bolo cru exato (362 kcal)');

  // Caso B: assado (450g)
  const resAssado = calculateRecipeNutrients(ingredients, 450);
  assert(resAssado.totals.kcal === 1811, 'Calorias totais preservadas');
  assert(resAssado.per100.kcal === 402, `Densidade por 100g aumentou pós-evaporação (402 kcal / 100g)`);

  const recipeFood = recipeToFood({
    id: 'rec-bolo-teste',
    name: 'Bolo de Chocolate Caseiro',
    emoji: '🍰',
    totalGrams: 450,
    servingGrams: 90,
    servingLabel: 'fatia',
    ingredients,
    totals: resAssado.totals,
    per100: resAssado.per100,
    createdAt: new Date().toISOString(),
  });

  assert(recipeFood.kind === 'refeicao', 'Receita converte em Food válido');
  assert(recipeFood.unitGrams === 90, 'Unidade padrão assume a fatia de 90g');
  assert(recipeFood.extraServings?.some((s) => s.grams === 450), 'Opção de receita inteira disponível (450g)');

  // Validação: "quero comer 200g do bolo"
  const macros200g = {
    kcal: Math.round((recipeFood.per100.kcal * 200) / 100),
    carb: Math.round((recipeFood.per100.carb * 200) / 100),
  };
  assert(macros200g.kcal === 804, `Consumo de 200g do bolo calculado com precisão: ${macros200g.kcal} kcal`);
}

// 5. TABELA NUTRICIONAL (undefined != 0)
console.log('\n--- 5. Testes da Tabela Nutricional (Regra undefined ≠ 0) ---');
{
  const item1 = { kcal: 100, carb: 10, protein: 5, fat: 2, fiber: 1, sodium: 50, sugar: undefined };
  const item2 = { kcal: 150, carb: 20, protein: 8, fat: 3, fiber: 2, sodium: 70, sugar: 5 };

  const sumCarb = sumNutrient([item1, item2], 'carb');
  assert(sumCarb !== null && sumCarb.value === 30, 'Soma carboidrato exata (30g)');
  assert(sumCarb.complete === true, 'Carboidrato marcado como completo');

  const sumSugar = sumNutrient([item1, item2], 'sugar');
  assert(sumSugar !== null && sumSugar.value === 5, 'Soma açúcar preserva valor presente');
  assert(sumSugar.complete === false, 'Açúcar marcado como incompleto (apenas 1 item informou)');
  assert(formatNutrient(sumSugar, 'g').includes('5 g'), 'Formatação de nutriente correta');
  assert(formatValue(undefined, 'g') === '—', 'Formatação de valor ausente vira travessão "—"');
}

console.log('\n======================================================');
console.log(`🏁 RESULTADO FINAL: ${passed} PASSARAM | ${failed} FALHARAM`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
