import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { macrosForGrams, searchFoods, type Food } from '@/data/foods';
import {
  calculateRecipeNutrients,
  useRecipes,
  type RecipeIngredient,
} from '@/store/recipes';

const EMOJI_OPTIONS = ['🍰', '🍲', '🥗', '🥧', '🍞', '🥣', '🥪', '🍕', '🥘', '🍪'];

export default function ReceitaCriarScreen() {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const recipes = useRecipes((s) => s.recipes);
  const addRecipe = useRecipes((s) => s.addRecipe);
  const updateRecipe = useRecipes((s) => s.updateRecipe);

  const existing = editId ? recipes.find((r) => r.id === editId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '🍰');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(existing?.ingredients ?? []);
  const [servingGrams, setServingGrams] = useState(existing?.servingGrams ? String(existing.servingGrams) : '100');
  const [servingLabel, setServingLabel] = useState(existing?.servingLabel ?? 'fatia');
  const [customTotalGrams, setCustomTotalGrams] = useState<string | null>(
    existing?.totalGrams ? String(existing.totalGrams) : null,
  );

  // Modal para adicionar ingrediente
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [ingredientGrams, setIngredientGrams] = useState('100');

  // Soma de peso dos ingredientes
  const rawSumWeight = useMemo(
    () => ingredients.reduce((sum, item) => sum + item.grams, 0),
    [ingredients],
  );

  const totalWeight = customTotalGrams && Number(customTotalGrams) > 0
    ? Number(customTotalGrams)
    : rawSumWeight || 100;

  const { totals, per100 } = useMemo(
    () => calculateRecipeNutrients(ingredients, totalWeight),
    [ingredients, totalWeight],
  );

  const searchResults = useMemo(() => searchFoods(searchQuery), [searchQuery]);

  const handleAddIngredient = () => {
    if (!selectedFood) return;
    const g = parseInt(ingredientGrams.replace(/\D/g, ''), 10) || 100;
    const macros = macrosForGrams(selectedFood, g);

    const newIng: RecipeIngredient = {
      id: `ing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      foodId: selectedFood.id,
      name: selectedFood.name,
      emoji: selectedFood.emoji,
      grams: g,
      macros,
    };

    setIngredients((prev) => [...prev, newIng]);
    setSelectedFood(null);
    setIngredientGrams('100');
    setSearchQuery('');
    setModalOpen(false);
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const sGrams = parseInt(servingGrams.replace(/\D/g, ''), 10) || 100;

    const data = {
      name: name.trim(),
      emoji,
      totalGrams: totalWeight,
      servingGrams: sGrams,
      servingLabel: servingLabel.trim() || 'porção',
      ingredients,
      totals,
      per100,
    };

    if (existing) {
      updateRecipe(existing.id, data);
    } else {
      addRecipe(data);
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={NoFoco.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>{existing ? 'Editar Receita' : 'Nova Receita'}</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Nome e Emoji */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Nome do Prato / Receita</Text>
          <View style={styles.nameRow}>
            <Text style={styles.emojiDisplay}>{emoji}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Bolo de Chocolate, Salmão com Legumes"
              placeholderTextColor={NoFoco.soft}
              style={styles.nameInput}
            />
          </View>

          {/* Seleção rápida de emoji */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiList}>
            {EMOJI_OPTIONS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiBtn, emoji === e && styles.emojiBtnOn]}>
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Ingredientes */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Ingredientes ({ingredients.length})</Text>
          <Pressable style={styles.addIngBtn} onPress={() => setModalOpen(true)}>
            <Ionicons name="add" size={16} color={NoFoco.onAccent} />
            <Text style={styles.addIngBtnText}>Adicionar</Text>
          </Pressable>
        </View>

        {ingredients.length === 0 ? (
          <View style={styles.emptyIngCard}>
            <Text style={styles.emptyIngText}>
              Nenhum ingrediente adicionado ainda. Toque em "+ Adicionar" para compor sua receita.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {ingredients.map((ing, i) => (
              <View key={ing.id} style={[styles.ingRow, i > 0 && styles.ingBorder]}>
                <Text style={styles.ingEmoji}>{ing.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ingName} numberOfLines={1}>
                    {ing.name}
                  </Text>
                  <Text style={styles.ingSub}>
                    {ing.grams} g · {ing.macros.kcal} kcal
                  </Text>
                </View>
                <Pressable onPress={() => handleRemoveIngredient(ing.id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color={NoFoco.soft} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Rendimento e Porção */}
        <Text style={styles.sectionTitle}>Rendimento & Porções</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Peso Final Cozido / Assado</Text>
              <Text style={styles.fieldHelp}>
                Soma crua: {rawSumWeight} g {customTotalGrams ? '(ajustado)' : ''}
              </Text>
            </View>
            <View style={styles.fieldInputWrap}>
              <TextInput
                value={customTotalGrams ?? (rawSumWeight > 0 ? String(rawSumWeight) : '')}
                onChangeText={(t) => setCustomTotalGrams(t)}
                keyboardType="number-pad"
                placeholder={String(rawSumWeight || 100)}
                placeholderTextColor={NoFoco.soft}
                style={styles.fieldInput}
              />
              <Text style={styles.fieldUnit}>g</Text>
            </View>
          </View>

          <View style={[styles.fieldRow, styles.fieldBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Tamanho de 1 Porção</Text>
              <Text style={styles.fieldHelp}>Peso de 1 fatia ou unidade</Text>
            </View>
            <View style={styles.fieldInputWrap}>
              <TextInput
                value={servingGrams}
                onChangeText={setServingGrams}
                keyboardType="number-pad"
                placeholder="100"
                placeholderTextColor={NoFoco.soft}
                style={styles.fieldInput}
              />
              <Text style={styles.fieldUnit}>g</Text>
            </View>
          </View>

          <View style={[styles.fieldRow, styles.fieldBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Nome da Porção</Text>
              <Text style={styles.fieldHelp}>Ex.: fatia, porção, pedaço, xícara</Text>
            </View>
            <View style={styles.fieldInputWrap}>
              <TextInput
                value={servingLabel}
                onChangeText={setServingLabel}
                placeholder="fatia"
                placeholderTextColor={NoFoco.soft}
                style={[styles.fieldInput, { minWidth: 80 }]}
              />
            </View>
          </View>
        </View>

        {/* Resumo Nutricional */}
        <Text style={styles.sectionTitle}>Densidade Nutricional (por 100 g)</Text>
        <View style={styles.donutRow}>
          <MacroCell value={`${per100.kcal}`} label="kcal" color={NoFoco.kcal} />
          <MacroCell value={`${per100.carb}g`} label="Carbo" color={NoFoco.carb} />
          <MacroCell value={`${per100.protein}g`} label="Prot" color={NoFoco.protein} />
          <MacroCell value={`${per100.fat}g`} label="Gord" color={NoFoco.fat} />
        </View>

        <Text style={styles.totalHint}>
          Receita inteira ({totalWeight} g): {totals.kcal} kcal · {totals.carb}g C · {totals.protein}g P · {totals.fat}g G
        </Text>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Salvar */}
      <Pressable
        style={[styles.cta, (!name.trim() || ingredients.length === 0) && styles.ctaOff]}
        onPress={handleSave}
        disabled={!name.trim() || ingredients.length === 0}>
        <Text style={styles.ctaText}>
          {existing ? 'Salvar Alterações' : 'Salvar Receita'}
        </Text>
      </Pressable>

      {/* Modal de busca de ingrediente */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolher Ingrediente</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={NoFoco.ink} />
              </Pressable>
            </View>

            {selectedFood ? (
              <View style={styles.selectedWrap}>
                <Text style={styles.selectedName}>
                  {selectedFood.emoji} {selectedFood.name}
                </Text>
                <Text style={styles.selectedSub}>{selectedFood.source}</Text>

                <View style={styles.amountBox}>
                  <Text style={styles.amountLabel}>Quantidade deste ingrediente:</Text>
                  <View style={styles.fieldInputWrap}>
                    <TextInput
                      value={ingredientGrams}
                      onChangeText={setIngredientGrams}
                      keyboardType="number-pad"
                      autoFocus
                      style={styles.amountInput}
                    />
                    <Text style={styles.fieldUnit}>g</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setSelectedFood(null)}>
                    <Text style={styles.cancelBtnText}>Trocar</Text>
                  </Pressable>
                  <Pressable style={styles.confirmBtn} onPress={handleAddIngredient}>
                    <Text style={styles.confirmBtnText}>Adicionar Ingrediente</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color={NoFoco.soft} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Buscar alimento (ex: farinha, ovo, açúcar)..."
                    placeholderTextColor={NoFoco.soft}
                    style={styles.searchInput}
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color={NoFoco.soft} />
                    </Pressable>
                  )}
                </View>

                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable style={styles.searchItem} onPress={() => setSelectedFood(item)}>
                      <Text style={styles.searchItemEmoji}>{item.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchItemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.searchItemSub}>
                          {item.brand ?? item.source} · {item.per100.kcal} kcal / 100g
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={NoFoco.soft} />
                    </Pressable>
                  )}
                />
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function MacroCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.macroCell}>
      <Text style={styles.macroValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={[styles.macroTick, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { color: NoFoco.ink, fontSize: 18, fontWeight: '800' },

  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  cardLabel: { color: NoFoco.soft, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: Spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  emojiDisplay: { fontSize: 26 },
  nameInput: {
    flex: 1,
    color: NoFoco.ink,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
  },
  emojiList: { marginTop: Spacing.sm, flexDirection: 'row' },
  emojiBtn: {
    padding: 6,
    borderRadius: Radius.md,
    marginRight: 6,
    backgroundColor: NoFoco.surface2,
  },
  emojiBtnOn: { backgroundColor: 'rgba(166,224,82,0.2)', borderWidth: 1, borderColor: NoFoco.accent },
  emojiText: { fontSize: 20 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    color: NoFoco.soft,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: NoFoco.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  addIngBtnText: { color: NoFoco.onAccent, fontSize: 11.5, fontWeight: '800' },

  emptyIngCard: {
    backgroundColor: NoFoco.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
  },
  emptyIngText: { color: NoFoco.soft, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },

  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  ingBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: NoFoco.hair },
  ingEmoji: { fontSize: 20, marginRight: Spacing.sm },
  ingName: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '700' },
  ingSub: { color: NoFoco.soft, fontSize: 11.5, marginTop: 1 },

  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  fieldBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: NoFoco.hair },
  fieldLabel: { color: NoFoco.ink, fontSize: 13, fontWeight: '700' },
  fieldHelp: { color: NoFoco.soft, fontSize: 11, marginTop: 1 },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  fieldInput: {
    color: NoFoco.ink,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 50,
    textAlign: 'right',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  fieldUnit: { color: NoFoco.soft, fontSize: 13, fontWeight: '700' },

  donutRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  macroCell: { alignItems: 'center', flex: 1 },
  macroValue: { color: NoFoco.ink, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  macroLabel: { color: NoFoco.soft, fontSize: 10, fontWeight: '600', marginTop: 2 },
  macroTick: { width: 20, height: 4, borderRadius: 3, marginTop: 6 },
  totalHint: { color: NoFoco.soft, fontSize: 11, textAlign: 'center', marginTop: Spacing.sm },

  cta: {
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: NoFoco.onAccent, fontSize: 14, fontWeight: '800' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: NoFoco.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    height: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { color: NoFoco.ink, fontSize: 16, fontWeight: '800' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, color: NoFoco.ink, fontSize: 13.5, padding: 0 },

  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NoFoco.hair,
  },
  searchItemEmoji: { fontSize: 20, marginRight: Spacing.sm },
  searchItemName: { color: NoFoco.ink, fontSize: 13, fontWeight: '700' },
  searchItemSub: { color: NoFoco.soft, fontSize: 11, marginTop: 1 },

  selectedWrap: { paddingVertical: Spacing.md },
  selectedName: { color: NoFoco.ink, fontSize: 16, fontWeight: '800' },
  selectedSub: { color: NoFoco.soft, fontSize: 12, marginTop: 2 },
  amountBox: {
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: { color: NoFoco.ink, fontSize: 13, fontWeight: '600' },
  amountInput: {
    color: NoFoco.ink,
    fontSize: 22,
    fontWeight: '800',
    minWidth: 60,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.md,
  },
  cancelBtnText: { color: NoFoco.soft, fontSize: 13.5, fontWeight: '700' },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.md,
  },
  confirmBtnText: { color: NoFoco.onAccent, fontSize: 13.5, fontWeight: '800' },
});
