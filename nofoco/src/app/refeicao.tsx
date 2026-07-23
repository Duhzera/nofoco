import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachBanner } from '@/components/ui/coach-banner';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { computeGoal } from '@/lib/goal';
import { mealAdvice } from '@/lib/pacing';
import { kcalByMeal, mealDef, sumMacros, useDiary, type MealKey } from '@/store/diary';
import { useProfile } from '@/store/profile';

export default function RefeicaoScreen() {
  const { key } = useLocalSearchParams<{ key: MealKey }>();
  const def = mealDef(key);
  const items = useDiary((s) => s.items[key] ?? []);
  const allItems = useDiary((s) => s.items);
  const removeItem = useDiary((s) => s.removeItem);
  const profile = useProfile((s) => s.profile);
  const split = useProfile((s) => s.split);
  const totals = sumMacros(items);

  const goal = computeGoal(profile);
  const advice = mealAdvice(goal.kcal, split, kcalByMeal(allItems), key);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={NoFoco.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>{def.name}</Text>
          <Text style={styles.sub}>{def.time}</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {/* resumo da refeição */}
      <View style={styles.summary}>
        <Cell value={`${totals.kcal}`} label="kcal" color={NoFoco.kcal} />
        <Cell value={`${totals.carb}g`} label="Carbo" color={NoFoco.carb} />
        <Cell value={`${totals.protein}g`} label="Prot" color={NoFoco.protein} />
        <Cell value={`${totals.fat}g`} label="Gord" color={NoFoco.fat} />
      </View>

      <View style={{ marginBottom: Spacing.md }}>
        <CoachBanner status={advice.status} message={advice.message} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Text style={{ fontSize: 26 }}>{def.emoji}</Text>
            </View>
            <Text style={styles.emptyTitle}>Nada por aqui ainda</Text>
            <Text style={styles.emptyDesc}>Adicione o primeiro alimento desta refeição.</Text>
          </View>
        ) : (
          items.map((it) => (
            <View key={it.id} style={styles.item}>
              <View style={styles.itemIcon}>
                <Text style={{ fontSize: 17 }}>{it.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {it.name}
                </Text>
                <Text style={styles.itemMeta}>{it.portionLabel}</Text>
              </View>
              <Text style={styles.itemKcal}>{it.macros.kcal}</Text>
              <Pressable onPress={() => removeItem(key, it.id)} hitSlop={8} style={styles.trash}>
                <Ionicons name="trash-outline" size={17} color={NoFoco.soft} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        style={styles.cta}
        onPress={() => router.push({ pathname: '/pesquisar', params: { meal: key } })}>
        <Ionicons name="add" size={20} color={NoFoco.onAccent} />
        <Text style={styles.ctaText}>Adicionar alimento</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Cell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.cellLabel}>{label}</Text>
      <View style={[styles.cellTick, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { color: NoFoco.ink, fontSize: 18, fontWeight: '800' },
  sub: { color: NoFoco.soft, fontSize: 11.5, marginTop: 1 },

  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cell: { alignItems: 'center', flex: 1 },
  cellValue: { color: NoFoco.ink, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cellLabel: { color: NoFoco.soft, fontSize: 10, fontWeight: '600', marginTop: 2 },
  cellTick: { width: 20, height: 4, borderRadius: 3, marginTop: 6 },

  list: { paddingBottom: Spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NoFoco.faint,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '600' },
  itemMeta: { color: NoFoco.soft, fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] },
  itemKcal: { color: NoFoco.ink, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  trash: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: NoFoco.ink, fontSize: 15, fontWeight: '700', marginTop: Spacing.sm },
  emptyDesc: { color: NoFoco.soft, fontSize: 12.5, textAlign: 'center', maxWidth: 240 },

  cta: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  ctaText: { color: NoFoco.onAccent, fontSize: 14, fontWeight: '800' },
});
