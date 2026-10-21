import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { rememberFood } from '@/data/foods';
import {
  calculateRecipeNutrients,
  recipeToFood,
  type Recipe,
  type RecipeIngredient,
} from '@/lib/recipe-calc';

export {
  calculateRecipeNutrients,
  recipeToFood,
  type Recipe,
  type RecipeIngredient,
};

type RecipesState = {
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => string;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  getRecipe: (id: string) => Recipe | undefined;
};

export const useRecipes = create<RecipesState>()(
  persist(
    (set, get) => ({
      recipes: [],

      addRecipe: (data) => {
        const id = `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const recipe: Recipe = {
          ...data,
          id,
          createdAt: new Date().toISOString(),
        };
        const food = recipeToFood(recipe);
        rememberFood(food);
        set((state) => ({ recipes: [recipe, ...state.recipes] }));
        return id;
      },

      updateRecipe: (id, patch) => {
        set((state) => {
          const recipes = state.recipes.map((r) => {
            if (r.id !== id) return r;
            const updated = { ...r, ...patch };
            const food = recipeToFood(updated);
            rememberFood(food);
            return updated;
          });
          return { recipes };
        });
      },

      deleteRecipe: (id) => {
        set((state) => ({ recipes: state.recipes.filter((r) => r.id !== id) }));
      },

      getRecipe: (id) => get().recipes.find((r) => r.id === id),
    }),
    {
      name: 'nofoco-recipes',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.recipes) {
          state.recipes.forEach((r) => recipeToFood(r));
        }
      },
    },
  ),
);
