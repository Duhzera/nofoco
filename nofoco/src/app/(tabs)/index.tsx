import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalorieGauge } from '@/components/ui/calorie-gauge';
import { Card } from '@/components/ui/card';
import { CoachBanner } from '@/components/ui/coach-banner';
import { MacroBar } from '@/components/ui/macro-bar';
import { Screen } from '@/components/ui/screen';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { computeGoal } from '@/lib/goal';
import { dayPacing, mealTarget, nowMinutes } from '@/lib/pacing';
import { dayMacros, kcalByMeal, MEALS, useDiary } from '@/store/diary';
import { useProfile } from '@/store/profile';

const WEEK = [
  { d: 'S', n: 19 },
  { d: 'T', n: 20 },
  { d: 'Q', n: 21 },
  { d: 'Q', n: 22, today: true },
  { d: 'S', n: 23 },
  { d: 'S', n: 24 },
  { d: 'D', n: 25 },
];

export default function DiarioScreen() {
  const items = useDiary((s) => s.items);
  const profile = useProfile((s) => s.profile);
  const split = useProfile((s) => s.split);

  const goal = computeGoal(profile);
  const day = dayMacros(items);
  const byMeal = kcalByMeal(items);
  const pace = dayPacing(goal.kcal, split, byMeal, nowMinutes());

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Diário</Text>
          <Text style={styles.subtitle}>Hoje, 22 de maio</Text>
        </View>
        <View style={styles.iconBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color={NoFoco.ink} />
        </View>
      </View>

      <View style={styles.week}>
        {WEEK.map((it, i) => (
          <View key={i} style={styles.day}>
            <Text style={[styles.dayLetter, it.today && { color: NoFoco.accent }]}>{it.d}</Text>
            <View style={[styles.dayNum, it.today && styles.dayNumOn]}>
              <Text style={[styles.dayNumTxt, it.today && { color: NoFoco.onAccent }]}>{it.n}</Text>
            </View>
          </View>
        ))}
      </View>

      <Card style={{ alignItems: 'center', paddingBottom: Spacing.md }}>
        <CalorieGauge consumed={day.kcal} goal={goal.kcal} />
      </Card>

      <View style={{ marginTop: Spacing.md }}>
        <CoachBanner status={pace.status} message={pace.message} />
      </View>

      <View style={styles.macros}>
        <MacroBar label="Carbo" consumed={day.carb} goal={goal.carb} color={NoFoco.carb} />
        <MacroBar label="Proteína" consumed={day.protein} goal={goal.protein} color={NoFoco.protein} />
        <MacroBar label="Gordura" consumed={day.fat} goal={goal.fat} color={NoFoco.fat} />
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Refeições</Text>
        <Text style={styles.link} onPress={() => router.push('/adicionar')}>
          + Adicionar
        </Text>
      </View>

      {MEALS.map((m) => {
        const consumed = byMeal[m.key];
        const target = mealTarget(goal.kcal, split, m.key);
        const over = consumed > target * 1.1;
        return (
          <Pressable
            key={m.key}
            style={styles.meal}
            onPress={() => router.push({ pathname: '/refeicao', params: { key: m.key } })}>
            <View style={styles.mealIcon}>
              <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mealName}>{m.name}</Text>
              <Text style={styles.mealMeta}>
                {m.time} · <Text style={{ color: over ? NoFoco.warning : NoFoco.ink }}>{consumed}</Text>
                {' / '}
                {target} kcal
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={NoFoco.soft} />
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  title: { color: NoFoco.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: NoFoco.soft, fontSize: 12.5, marginTop: 2 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  day: { alignItems: 'center', gap: 6 },
  dayLetter: { color: NoFoco.soft, fontSize: 11, fontWeight: '600' },
  dayNum: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  dayNumOn: { backgroundColor: NoFoco.accent },
  dayNumTxt: { color: NoFoco.ink, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  macros: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  link: { color: NoFoco.accent, fontSize: 12.5, fontWeight: '700' },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: NoFoco.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealName: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '700' },
  mealMeta: { color: NoFoco.soft, fontSize: 11, marginTop: 1, fontVariant: ['tabular-nums'] },
});
