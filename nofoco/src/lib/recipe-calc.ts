import { rememberFood, type Food, type Nutrients } from '@/data/foods';

export type RecipeIngredient = {
  id: string; // id do ingrediente na receita
  foodId: string;
  name: string;
  emoji: string;
  grams: number;
  macros: Nutrients;
};

export type Recipe = {
  id: string;
  name: string;
  emoji: string;
  /** Peso total do preparo final (padrão: soma dos ingredientes; ajustável pós-cozimento). */
  totalGrams: number;
  /** Peso de 1 porção/fatia. */
  servingGrams: number;
  /** Nome da porção (ex: 'fatia', 'porção', 'pedaço'). */
  servingLabel: string;
  ingredients: RecipeIngredient[];
  totals: Nutrients;
  per100: Nutrients;
  createdAt: string;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Calcula os totais e a densidade por 100 g da receita.
 */
export function calculateRecipeNutrients(
  ingredients: RecipeIngredient[],
  totalWeight: number,
): { totals: Nutrients; per100: Nutrients } {
  const totals: Nutrients = {
    kcal: 0,
    carb: 0,
    protein: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    sugar: 0,
  };

  for (const item of ingredients) {
    totals.kcal += item.macros.kcal || 0;
    totals.carb += item.macros.carb || 0;
    totals.protein += item.macros.protein || 0;
    totals.fat += item.macros.fat || 0;
    totals.fiber += item.macros.fiber || 0;
    totals.sodium += item.macros.sodium || 0;
    if (item.macros.sugar !== undefined) {
      totals.sugar = (totals.sugar || 0) + item.macros.sugar;
    }
  }

  const w = Math.max(1, totalWeight);
  const factor = 100 / w;

  const per100: Nutrients = {
    kcal: Math.round(totals.kcal * factor),
    carb: round1(totals.carb * factor),
    protein: round1(totals.protein * factor),
    fat: round1(totals.fat * factor),
    fiber: round1(totals.fiber * factor),
    sodium: Math.round(totals.sodium * factor),
    sugar: totals.sugar !== undefined ? round1(totals.sugar * factor) : undefined,
  };

  return { totals, per100 };
}

/** Converte uma Receita em um Food padrão reconhecido por todo o app. */
export function recipeToFood(recipe: Recipe): Food {
  const food: Food = {
    id: recipe.id,
    name: recipe.name,
    source: 'Minha Receita',
    emoji: recipe.emoji || '🍲',
    kind: 'refeicao',
    per100: recipe.per100,
    unitGrams: recipe.servingGrams || 100,
    unitLabel: `${recipe.servingLabel} (${recipe.servingGrams || 100} g)`,
    extraServings: [
      {
        id: 'porcao',
        label: `${recipe.servingLabel} (${recipe.servingGrams || 100} g)`,
        grams: recipe.servingGrams || 100,
      },
      {
        id: 'receita-toda',
        label: `receita inteira (${recipe.totalGrams} g)`,
        grams: recipe.totalGrams,
      },
    ],
  };
  rememberFood(food);
  return food;
}
