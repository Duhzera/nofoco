import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { WeightEvolution } from '@/components/ui/weight-evolution';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { addDays, todayKey, weekdayInitial } from '@/lib/date';
import { computeGoal } from '@/lib/goal';
import { dayItems, dayMacros, useDiary } from '@/store/diary';
import { useMeals } from '@/store/meals';
import { useProfile } from '@/store/profile';
import { latestWeight, useWeight } from '@/store/weight';

const DAYS = 7;

export default function RelatoriosScreen() {
  const days = useDiary((s) => s.days);
  const meals = useMeals((s) => s.meals);
  const profile = useProfile((s) => s.profile);
  const log = useWeight((s) => s.log);

  const currentKg = latestWeight(log) ?? profile.weightKg;
  const goal = computeGoal({ ...profile, weightKg: currentKg });

  // últimos 7 dias (mais antigo → hoje), com o kcal consumido em cada um
  const today = todayKey();
  const series = Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(today, -(DAYS - 1 - i));
    return { date, kcal: dayMacros(dayItems(days, date), meals).kcal };
  });

  const registered = series.filter((d) => d.kcal > 0);
  const avg = registered.length
    ? Math.round(registered.reduce((a, d) => a + d.kcal, 0) / registered.length)
    : 0;
  const maxScale = Math.max(goal.kcal, ...series.map((d) => d.kcal), 1);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios</Text>
      </View>

      {/* calorias — últimos 7 dias */}
      <Text style={styles.section}>Calorias · últimos 7 dias</Text>
      <View style={styles.card}>
        {registered.length === 0 ? (
          <Text style={styles.empty}>
            Registre refeições no diário para ver aqui quanto você consumiu a cada dia, comparado à sua
            meta.
          </Text>
        ) : (
          <>
            <View style={styles.chart}>
              {series.map((d) => {
                const h = Math.round((d.kcal / maxScale) * 100);
                const over = d.kcal > goal.kcal * 1.05;
                const isToday = d.date === today;
                return (
                  <View key={d.date} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      {/* linha da meta */}
                      <View
                        style={[styles.goalLine, { bottom: `${(goal.kcal / maxScale) * 100}%` }]}
                      />
                      <View
                        style={[
                          styles.bar,
                          { height: `${h}%`, backgroundColor: over ? NoFoco.warning : NoFoco.kcal },
                          d.kcal === 0 && styles.barEmpty,
                        ]}
                      />
                    </View>
                    <Text style={[styles.barDay, isToday && { color: NoFoco.accent }]}>
                      {weekdayInitial(d.date)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDash]} />
                <Text style={styles.legendText}>meta {goal.kcal.toLocaleString('pt-BR')} kcal</Text>
              </View>
              <Text style={styles.legendText}>
                média {avg.toLocaleString('pt-BR')} kcal · {registered.length}/{DAYS} dias
              </Text>
            </View>
          </>
        )}
      </View>

      {/* evolução de peso */}
      <Text style={styles.section}>Evolução de peso</Text>
      <WeightEvolution />

      <View style={{ height: Spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: Spacing.md },
  title: { color: NoFoco.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  section: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  empty: { color: NoFoco.soft, fontSize: 12.5, lineHeight: 18 },

  chart: { flexDirection: 'row', height: 130, alignItems: 'flex-end', gap: Spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: {
    width: '100%',
    height: 110,
    justifyContent: 'flex-end',
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: Radius.sm, minHeight: 2 },
  barEmpty: { backgroundColor: NoFoco.hair },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: NoFoco.accent,
    opacity: 0.6,
  },
  barDay: { color: NoFoco.soft, fontSize: 10, fontWeight: '600' },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDash: { width: 14, height: 2, backgroundColor: NoFoco.accent, opacity: 0.6 },
  legendText: { color: NoFoco.soft, fontSize: 11, fontVariant: ['tabular-nums'] },
});
