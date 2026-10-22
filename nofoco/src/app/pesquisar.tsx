import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { searchFoods, unitKcal, type Food } from '@/data/foods';
import type { MealId } from '@/store/meals';

const FILTERS = ['Todos', 'Alimentos', 'Refeições', 'Marcas'] as const;

export default function PesquisarScreen() {
  const { meal, voltarPara } = useLocalSearchParams<{ meal?: MealId; voltarPara?: string }>();
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
    router.push({
      pathname: '/porcao',
      params: { id: f.id, ...(meal ? { meal } : {}), ...(voltarPara ? { voltarPara } : {}) },
    });

  const openTabelaFoto = () =>
    router.push({
      pathname: '/tabela-foto' as any,
      params: { ...(meal ? { meal } : {}), ...(voltarPara ? { voltarPara } : {}) },
    });

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
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>
              {query.trim().length > 0
                ? `Nenhum alimento encontrado para "${query}".`
                : 'Nenhum alimento encontrado.'}
            </Text>
            <Pressable style={styles.emptyCta} onPress={openTabelaFoto}>
              <Ionicons name="camera-outline" size={18} color={NoFoco.onAccent} />
              <Text style={styles.emptyCtaText}>Fotografar Tabela Nutricional</Text>
            </Pressable>
            <Text style={styles.emptySub}>
              Tire uma foto da tabela no rótulo para a IA cadastrar automaticamente.
            </Text>
          </View>
        }
        ListFooterComponent={
          results.length > 0 && query.trim().length > 1 ? (
            <Pressable style={styles.footerCta} onPress={openTabelaFoto}>
              <View style={styles.footerCtaIcon}>
                <Ionicons name="document-text-outline" size={18} color={NoFoco.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.footerCtaTitle}>Não encontrou a marca certa?</Text>
                <Text style={styles.footerCtaSub}>Fotografe a tabela nutricional do rótulo</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={NoFoco.soft} />
            </Pressable>
          ) : null
        }
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
  empty: { color: NoFoco.soft, textAlign: 'center', fontSize: 13 },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: NoFoco.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    marginTop: Spacing.md,
  },
  emptyCtaText: { color: NoFoco.onAccent, fontSize: 13, fontWeight: '700' },
  emptySub: { color: NoFoco.soft, fontSize: 11.5, textAlign: 'center', maxWidth: 260 },
  footerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  footerCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCtaTitle: { color: NoFoco.ink, fontSize: 13, fontWeight: '700' },
  footerCtaSub: { color: NoFoco.soft, fontSize: 11, marginTop: 2 },
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
