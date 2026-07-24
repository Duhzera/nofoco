import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalorieGauge } from '@/components/ui/calorie-gauge';
import { Card } from '@/components/ui/card';
import { CoachBanner } from '@/components/ui/coach-banner';
import { MacroBar } from '@/components/ui/macro-bar';
import { Screen } from '@/components/ui/screen';
import { WeekStrip } from '@/components/ui/week-strip';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { formatDayTitle, isToday } from '@/lib/date';
import { computeGoal } from '@/lib/goal';
import { dayPacing, mealTarget, nowMinutes } from '@/lib/pacing';
import { dayItems, dayMacros, kcalByMeal, useDiary } from '@/store/diary';
import { useDay } from '@/store/day';
import { useMeals } from '@/store/meals';
import { useProfile } from '@/store/profile';

export default function DiarioScreen() {
  const days = useDiary((s) => s.days);
  const profile = useProfile((s) => s.profile);
  const meals = useMeals((s) => s.meals);
  const date = useDay((s) => s.date);
  const setDate = useDay((s) => s.setDate);
  const shiftDays = useDay((s) => s.shiftDays);
  const goToday = useDay((s) => s.goToday);
  const [editingMeals, setEditingMeals] = useState(false);

  const today = isToday(date);
  const items = dayItems(days, date);
  const goal = computeGoal(profile);
  const day = dayMacros(items, meals);
  const byMeal = kcalByMeal(items, meals);
  const pace = dayPacing(goal.kcal, meals, byMeal, nowMinutes(), today);

  // dias com algum lançamento — viram um pontinho na tira
  const registered = new Set(
    Object.entries(days)
      .filter(([, it]) => Object.values(it).some((list) => list.length > 0))
      .map(([key]) => key),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Diário</Text>
          <Text style={styles.subtitle}>{formatDayTitle(date)}</Text>
        </View>
        {!today && (
          <Pressable onPress={goToday} style={styles.todayBtn}>
            <Ionicons name="today-outline" size={14} color={NoFoco.onAccent} />
            <Text style={styles.todayBtnText}>Hoje</Text>
          </Pressable>
        )}
      </View>

      <WeekStrip
        selected={date}
        onSelect={setDate}
        onShiftWeek={(w) => shiftDays(w * 7)}
        registered={registered}
      />

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
        <View style={styles.sectionActions}>
          <Text style={styles.link} onPress={() => setEditingMeals((v) => !v)}>
            {editingMeals ? 'Concluir' : 'Editar'}
          </Text>
          <Text style={styles.link} onPress={() => router.push('/refeicao-editar')}>
            + Nova
          </Text>
        </View>
      </View>

      {editingMeals && (
        <Text style={styles.editHint}>
          Toque numa refeição para renomear, mudar o horário ou excluir.
        </Text>
      )}

      {meals.map((m) => {
        const consumed = byMeal[m.id] ?? 0;
        const target = mealTarget(goal.kcal, meals, m.id);
        const over = consumed > target * 1.1;
        return (
          <Pressable
            key={m.id}
            style={[styles.meal, editingMeals && styles.mealEditing]}
            onPress={() =>
              router.push(
                editingMeals
                  ? { pathname: '/refeicao-editar', params: { id: m.id } }
                  : { pathname: '/refeicao', params: { key: m.id } },
              )
            }>
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
            <Ionicons
              name={editingMeals ? 'create-outline' : 'chevron-forward'}
              size={18}
              color={editingMeals ? NoFoco.accent : NoFoco.soft}
            />
          </Pressable>
        );
      })}

      {meals.length === 0 && (
        <Pressable style={styles.emptyMeals} onPress={() => router.push('/refeicao-editar')}>
          <Ionicons name="add-circle-outline" size={20} color={NoFoco.accent} />
          <Text style={styles.emptyMealsText}>
            Você não tem nenhuma refeição. Crie a primeira para começar a registrar.
          </Text>
        </Pressable>
      )}
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
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  todayBtnText: { color: NoFoco.onAccent, fontSize: 12, fontWeight: '800' },
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
  sectionActions: { flexDirection: 'row', gap: Spacing.lg },
  link: { color: NoFoco.accent, fontSize: 12.5, fontWeight: '700' },
  editHint: { color: NoFoco.soft, fontSize: 11.5, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  emptyMeals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: NoFoco.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderStyle: 'dashed',
    padding: Spacing.lg,
  },
  emptyMealsText: { flex: 1, color: NoFoco.soft, fontSize: 12.5, lineHeight: 17 },
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
  mealEditing: { borderColor: NoFoco.accent, borderStyle: 'dashed' },
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
