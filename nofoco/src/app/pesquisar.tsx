import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { searchFoods, unitKcal, type Food } from '@/data/foods';
import type { MealKey } from '@/store/diary';

const FILTERS = ['Todos', 'Alimentos', 'Refeições', 'Marcas'] as const;

export default function PesquisarScreen() {
  const { meal } = useLocalSearchParams<{ meal?: MealKey }>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Todos');

  const results = useMemo(() => {
    let list = searchFoods(query);
    if (filter === 'Alimentos') list = list.filter((f) => f.kind === 'alimento');
    if (filter === 'Marcas') list = list.filter((f) => f.kind === 'marca');
    if (filter === 'Refeições') list = list.filter((f) => f.kind === 'refeicao');
    return list;
  }, [query, filter]);

  const openFood = (f: Food) =>
    router.push({ pathname: '/porcao', params: { id: f.id, ...(meal ? { meal } : {}) } });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={NoFoco.ink} />
        </Pressable>
        <Text style={styles.title}>Pesquisar</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={NoFoco.soft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Busque, ex.: pão de queijo"
          placeholderTextColor={NoFoco.soft}
          style={styles.input}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={NoFoco.soft} />
          </Pressable>
        )}
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipOn]}>
            <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={results}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum alimento encontrado.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.res} onPress={() => openFood(item)}>
            <View style={styles.resIcon}>
              <Text style={{ fontSize: 17 }}>{item.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.resMeta} numberOfLines={1}>
                {item.brand ?? item.source} · 1 {item.unitLabel} · {unitKcal(item)} kcal
              </Text>
            </View>
            <View style={styles.addCircle}>
              <Ionicons name="add" size={18} color={NoFoco.accent} />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  title: { color: NoFoco.ink, fontSize: 18, fontWeight: '800' },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  input: { flex: 1, color: NoFoco.ink, fontSize: 15, height: '100%' },
  filters: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: NoFoco.surface2,
  },
  chipOn: { backgroundColor: NoFoco.accent },
  chipText: { color: NoFoco.soft, fontSize: 11.5, fontWeight: '700' },
  chipTextOn: { color: NoFoco.onAccent },
  list: { paddingBottom: Spacing.xxl },
  empty: { color: NoFoco.soft, textAlign: 'center', marginTop: Spacing.xxl, fontSize: 13 },
  res: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NoFoco.faint,
  },
  resIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resName: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '600' },
  resMeta: { color: NoFoco.soft, fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] },
  addCircle: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
