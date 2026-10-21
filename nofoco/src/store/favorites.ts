import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type FavoritesState = {
  favorites: string[]; // foodId list
  toggleFavorite: (foodId: string) => void;
  isFavorite: (foodId: string) => boolean;
};

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (foodId: string) => {
        const current = get().favorites;
        if (current.includes(foodId)) {
          set({ favorites: current.filter((id) => id !== foodId) });
        } else {
          set({ favorites: [foodId, ...current] });
        }
      },
      isFavorite: (foodId: string) => get().favorites.includes(foodId),
    }),
    {
      name: 'nofoco-favorites',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
