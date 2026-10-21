import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { FOODS, getFood, searchFoods, type Food } from '@/data/foods';
import { useDiary, type DiaryDays } from '@/store/diary';
import { useFavorites } from '@/store/favorites';
import { useRecipes, type Recipe } from '@/store/recipes';

type Tab = 'favoritos' | 'recentes' | 'receitas' | 'taco';

const TABS: Record<Tab, { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  favoritos: { id: 'favoritos', label: 'Favoritos', icon: 'star' },
  recentes: { id: 'recentes', label: 'Recentes', icon: 'time-outline' },
  receitas: { id: 'receitas', label: 'Receitas', icon: 'restaurant-outline' },
  taco: { id: 'taco', label: 'Base TACO', icon: 'book-outline' },
};

function getRecentFoods(days: DiaryDays): Food[] {
  const seen = new Set<string>();
  const foods: Food[] = [];
  const sortedDates = Object.keys(days).sort().reverse();

  for (const date of sortedDates) {
    const dayData = days[date] ?? {};
    for (const mealKey of Object.keys(dayData)) {
      const items = dayData[mealKey] ?? [];
      for (const it of items) {
        if (it.foodId && !seen.has(it.foodId)) {
          seen.add(it.foodId);
          const f = getFood(it.foodId);
          if (f) foods.push(f);
        }
      }
    }
  }
  return foods.slice(0, 40);
}

export default function AlimentosScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('favoritos');
  const [search, setSearch] = useState('');

  const favorites = useFavorites((s) => s.favorites);
  const toggleFavorite = useFavorites((s) => s.toggleFavorite);
  const isFavorite = useFavorites((s) => s.isFavorite);

  const days = useDiary((s) => s.days);
  const recipes = useRecipes((s) => s.recipes);

  // Alimentos favoritos resolvidos
  const favoriteFoods = useMemo(() => {
    return favorites.map((id) => getFood(id)).filter((f): f is Food => !!f);
  }, [favorites]);

  // Alimentos recentes do diário
  const recentFoods = useMemo(() => getRecentFoods(days), [days]);

  // Se houver busca digitada, busca em toda a base
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return searchFoods(search);
  }, [search]);

  const onOpenFood = (food: Food) => {
    router.push({ pathname: '/porcao', params: { id: food.id } });
  };

  const onOpenRecipe = (recipe: Recipe) => {
    router.push({ pathname: '/porcao', params: { id: recipe.id } });
  };

  const onEditRecipe = (recipe: Recipe) => {
    router.push({ pathname: '/receita-criar', params: { id: recipe.id } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Alimentos</Text>
      </View>

      {/* Barra de Busca Geral */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={NoFoco.soft} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar em todos os alimentos e receitas..."
          placeholderTextColor={NoFoco.soft}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={NoFoco.soft} />
          </Pressable>
        )}
      </View>

      {/* Se houver busca, exibe os resultados da busca */}
      {search.trim().length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Nenhum alimento encontrado para "{search}".</Text>
            </View>
          }
          renderItem={({ item }) => (
            <FoodCard
              food={item}
              isFav={isFavorite(item.id)}
              onToggleFav={() => toggleFavorite(item.id)}
              onPress={() => onOpenFood(item)}
            />
          )}
        />
      ) : (
        <>
          {/* Seletor de Abas */}
          <View style={styles.tabsRow}>
            {(['favoritos', 'recentes', 'receitas', 'taco'] as Tab[]).map((tabKey) => {
              const on = activeTab === tabKey;
              return (
                <Pressable
                  key={tabKey}
                  onPress={() => setActiveTab(tabKey)}
                  style={[styles.tabBtn, on && styles.tabBtnOn]}>
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>
                    {TABS[tabKey].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Conteúdo da Aba Ativa */}
          {activeTab === 'favoritos' && (
            <FlatList
              data={favoriteFoods}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Ionicons name="star-outline" size={42} color={NoFoco.soft} />
                  <Text style={styles.emptyTitle}>Nenhum alimento favoritado</Text>
                  <Text style={styles.emptySub}>
                    Toque no ícone de estrela de qualquer alimento para deixá-lo salvo aqui e lançar rápido no diário.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <FoodCard
                  food={item}
                  isFav={true}
                  onToggleFav={() => toggleFavorite(item.id)}
                  onPress={() => onOpenFood(item)}
                />
              )}
            />
          )}

          {activeTab === 'recentes' && (
            <FlatList
              data={recentFoods}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Ionicons name="time-outline" size={42} color={NoFoco.soft} />
                  <Text style={styles.emptyTitle}>Sem histórico recente</Text>
                  <Text style={styles.emptySub}>
                    Os alimentos que você registrar no seu diário aparecerão aqui automaticamente.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <FoodCard
                  food={item}
                  isFav={isFavorite(item.id)}
                  onToggleFav={() => toggleFavorite(item.id)}
                  onPress={() => onOpenFood(item)}
                />
              )}
            />
          )}

          {activeTab === 'receitas' && (
            <View style={{ flex: 1 }}>
              {/* Botão de Nova Receita */}
              <View style={styles.recipeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recipeHeaderText}>Pratos e Receitas Caseiras</Text>
                  <Text style={styles.recipeHeaderSub}>Calcule porções de bolos, shakes e preparos</Text>
                </View>
                <Pressable
                  style={styles.newRecipeBtn}
                  onPress={() => router.push('/receita-criar')}>
                  <Ionicons name="add" size={18} color={NoFoco.onAccent} />
                  <Text style={styles.newRecipeBtnText}>Nova Receita</Text>
                </Pressable>
              </View>

              <FlatList
                data={recipes}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyCard}>
                    <Ionicons name="restaurant-outline" size={42} color={NoFoco.soft} />
                    <Text style={styles.emptyTitle}>Nenhuma receita criada</Text>
                    <Text style={styles.emptySub}>
                      Crie suas receitas personalizadas (ex: bolo de chocolate, tortas, sopas) somando os ingredientes para o app calcular a porção exata.
                    </Text>
                    <Pressable
                      style={[styles.newRecipeBtn, { marginTop: Spacing.md, paddingHorizontal: Spacing.lg }]}
                      onPress={() => router.push('/receita-criar')}>
                      <Text style={styles.newRecipeBtnText}>Criar Primeira Receita</Text>
                    </Pressable>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable style={styles.recipeCard} onPress={() => onOpenRecipe(item)}>
                    <Text style={styles.recipeEmoji}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipeTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.recipeSub}>
                        1 {item.servingLabel} ({item.servingGrams}g) ≈ {Math.round((item.per100.kcal * item.servingGrams) / 100)} kcal
                      </Text>
                      <View style={styles.recipeMacros}>
                        <Text style={[styles.recipeMacroPill, { color: NoFoco.carb }]}>
                          {Math.round((item.per100.carb * item.servingGrams) / 100)}g C
                        </Text>
                        <Text style={[styles.recipeMacroPill, { color: NoFoco.protein }]}>
                          {Math.round((item.per100.protein * item.servingGrams) / 100)}g P
                        </Text>
                        <Text style={[styles.recipeMacroPill, { color: NoFoco.fat }]}>
                          {Math.round((item.per100.fat * item.servingGrams) / 100)}g G
                        </Text>
                      </View>
                    </View>
                    <Pressable onPress={() => onEditRecipe(item)} hitSlop={10} style={{ padding: 4 }}>
                      <Ionicons name="create-outline" size={20} color={NoFoco.soft} />
                    </Pressable>
                  </Pressable>
                )}
              />
            </View>
          )}

          {activeTab === 'taco' && (
            <FlatList
              data={FOODS}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <FoodCard
                  food={item}
                  isFav={isFavorite(item.id)}
                  onToggleFav={() => toggleFavorite(item.id)}
                  onPress={() => onOpenFood(item)}
                />
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function FoodCard({
  food,
  isFav,
  onToggleFav,
  onPress,
}: {
  food: Food;
  isFav: boolean;
  onToggleFav: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.foodCard} onPress={onPress}>
      <Text style={styles.foodEmoji}>{food.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.foodName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.foodSub}>
          {food.brand ?? food.source} · {food.per100.kcal} kcal / 100{food.liquid ? 'ml' : 'g'}
        </Text>
      </View>
      <Pressable onPress={onToggleFav} hitSlop={10} style={styles.starBtn}>
        <Ionicons
          name={isFav ? 'star' : 'star-outline'}
          size={20}
          color={isFav ? NoFoco.warning : NoFoco.soft}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  title: { color: NoFoco.ink, fontSize: 22, fontWeight: '800' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, color: NoFoco.ink, fontSize: 13.5, padding: 0 },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  tabBtnOn: { backgroundColor: NoFoco.accent },
  tabText: { color: NoFoco.soft, fontSize: 11.5, fontWeight: '700' },
  tabTextOn: { color: NoFoco.onAccent },

  listContent: { paddingBottom: Spacing.xl },

  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  foodEmoji: { fontSize: 22, marginRight: Spacing.sm },
  foodName: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '700' },
  foodSub: { color: NoFoco.soft, fontSize: 11.5, marginTop: 2 },
  starBtn: { padding: 4 },

  emptyWrap: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: NoFoco.soft, fontSize: 13, textAlign: 'center' },

  emptyCard: {
    backgroundColor: NoFoco.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    marginTop: Spacing.md,
  },
  emptyTitle: { color: NoFoco.ink, fontSize: 15, fontWeight: '800', marginTop: Spacing.md },
  emptySub: { color: NoFoco.soft, fontSize: 12, textAlign: 'center', lineHeight: 17, marginTop: Spacing.xs },

  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  recipeHeaderText: { color: NoFoco.ink, fontSize: 13, fontWeight: '700' },
  recipeHeaderSub: { color: NoFoco.soft, fontSize: 11, marginTop: 1 },
  newRecipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: NoFoco.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  newRecipeBtnText: { color: NoFoco.onAccent, fontSize: 12, fontWeight: '800' },

  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  recipeEmoji: { fontSize: 24, marginRight: Spacing.md },
  recipeTitle: { color: NoFoco.ink, fontSize: 14, fontWeight: '800' },
  recipeSub: { color: NoFoco.soft, fontSize: 11.5, marginTop: 2 },
  recipeMacros: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  recipeMacroPill: { fontSize: 11, fontWeight: '700' },
});
