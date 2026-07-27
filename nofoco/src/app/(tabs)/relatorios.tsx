import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Screen } from '@/components/ui/screen';
import { WeightEvolution } from '@/components/ui/weight-evolution';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { addDays, dayNumber, formatDayTitle, formatRange, todayKey, type DayKey } from '@/lib/date';
import { computeGoal } from '@/lib/goal';
import { sumNutrient } from '@/lib/nutrition';
import { dayItems, dayMacros, kcalByMeal, sumMacros, useDiary, type DiaryDays } from '@/store/diary';
import { useMeals, type Meal } from '@/store/meals';
import { useProfile } from '@/store/profile';
import { latestWeight, useWeight } from '@/store/weight';

type Mode = 'dia' | 'semana' | 'mes';

const MODES: { key: Mode; label: string }[] = [
  { key: 'dia', label: 'Diário' },
  { key: 'semana', label: 'Semanal' },
  { key: 'mes', label: 'Mensal' },
];

/** Referências diárias aproximadas para os micros (% atingido da recomendação). */
const RDA = { fiber: 25, calcium: 1000, iron: 14, vitC: 90 };

type Agg = {
  n: number;
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
  fiber: number;
  calcium: number;
  iron: number;
  vitC: number;
};

/** Média por dia registrado dentro da janela (dias sem nada não contam). */
function aggregate(days: DiaryDays, meals: Meal[], windowKeys: DayKey[]): Agg | null {
  const tot = { kcal: 0, carb: 0, protein: 0, fat: 0, fiber: 0, calcium: 0, iron: 0, vitC: 0 };
  let n = 0;
  for (const key of windowKeys) {
    const items = meals.flatMap((m) => days[key]?.[m.id] ?? []);
    if (items.length === 0) continue;
    n += 1;
    const m = sumMacros(items);
    tot.kcal += m.kcal;
    tot.carb += m.carb;
    tot.protein += m.protein;
    tot.fat += m.fat;
    tot.fiber += m.fiber;
    const nut = items.map((i) => i.macros);
    tot.calcium += sumNutrient(nut, 'calcium')?.value ?? 0;
    tot.iron += sumNutrient(nut, 'iron')?.value ?? 0;
    tot.vitC += sumNutrient(nut, 'vitC')?.value ?? 0;
  }
  if (n === 0) return null;
  return {
    n,
    kcal: Math.round(tot.kcal / n),
    carb: Math.round(tot.carb / n),
    protein: Math.round(tot.protein / n),
    fat: Math.round(tot.fat / n),
    fiber: tot.fiber / n,
    calcium: tot.calcium / n,
    iron: tot.iron / n,
    vitC: tot.vitC / n,
  };
}

export default function RelatoriosScreen() {
  const days = useDiary((s) => s.days);
  const meals = useMeals((s) => s.meals);
  const profile = useProfile((s) => s.profile);
  const log = useWeight((s) => s.log);
  const [mode, setMode] = useState<Mode>('semana');

  const currentKg = latestWeight(log) ?? profile.weightKg;
  const goal = computeGoal({ ...profile, weightKg: currentKg });

  const today = todayKey();
  const span = mode === 'dia' ? 1 : mode === 'semana' ? 7 : 30;
  const windowKeys = Array.from({ length: span }, (_, i) => addDays(today, -(span - 1 - i)));
  const agg = aggregate(days, meals, windowKeys);

  // barras: por refeição no modo Diário; por dia no Semanal/Mensal
  const bars =
    mode === 'dia'
      ? meals.map((m) => ({ label: m.emoji, value: kcalByMeal(dayItems(days, today), meals)[m.id] ?? 0 }))
      : windowKeys.map((key) => ({ label: String(dayNumber(key)), value: dayMacros(dayItems(days, key), meals).kcal }));

  const maxScale =
    mode === 'dia'
      ? Math.max(...bars.map((b) => b.value), 1)
      : Math.max(goal.kcal, ...bars.map((b) => b.value), 1);

  const rangeLabel =
    mode === 'dia' ? formatDayTitle(today) : formatRange(windowKeys[0], windowKeys[windowKeys.length - 1]);
  const avgLabel = mode === 'dia' ? 'hoje' : 'média';
  const suffix = mode === 'dia' ? 'de hoje' : mode === 'semana' ? 'média semanal' : 'média mensal';

  // macros em % das calorias
  const kc = (agg?.carb ?? 0) * 4;
  const kp = (agg?.protein ?? 0) * 4;
  const kf = (agg?.fat ?? 0) * 9;
  const macroTot = kc + kp + kf || 1;
  const pctCarb = Math.round((kc / macroTot) * 100);
  const pctProt = Math.round((kp / macroTot) * 100);
  const pctFat = Math.round((kf / macroTot) * 100);

  const micros = agg
    ? [
        { label: 'Fibra', pct: Math.round((agg.fiber / RDA.fiber) * 100) },
        { label: 'Cálcio', pct: Math.round((agg.calcium / RDA.calcium) * 100) },
        { label: 'Ferro', pct: Math.round((agg.iron / RDA.iron) * 100) },
        { label: 'Vit. C', pct: Math.round((agg.vitC / RDA.vitC) * 100) },
      ]
    : [];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios</Text>
        <Text style={styles.subtitle}>{rangeLabel}</Text>
      </View>

      {/* seletor de período */}
      <View style={styles.seg}>
        {MODES.map((m) => {
          const on = mode === m.key;
          return (
            <Pressable key={m.key} onPress={() => setMode(m.key)} style={[styles.segBtn, on && styles.segOn]}>
              <Text style={[styles.segText, on && styles.segTextOn]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {!agg ? (
        <View style={styles.card}>
          <Text style={styles.empty}>
            {mode === 'dia'
              ? 'Você ainda não registrou nada hoje. Lance suas refeições no diário para ver o resumo aqui.'
              : 'Sem registros neste período. Assim que você lançar refeições no diário, os gráficos aparecem aqui.'}
          </Text>
        </View>
      ) : (
        <>
          {/* calorias */}
          <View style={styles.secRow}>
            <Text style={styles.secTitle}>Calorias</Text>
            <Text style={styles.secNum}>
              {avgLabel} {agg.kcal.toLocaleString('pt-BR')} kcal
            </Text>
          </View>
          <View style={styles.chart}>
            {bars.map((b, i) => (
              <View key={i} style={styles.col}>
                <View style={styles.colFillWrap}>
                  <View style={[styles.colFill, { height: `${Math.round((b.value / maxScale) * 100)}%` }]} />
                </View>
                <Text style={styles.colLabel} numberOfLines={1}>
                  {mode === 'mes' && i % 5 !== 0 && i !== bars.length - 1 ? '' : b.label}
                </Text>
              </View>
            ))}
          </View>

          {/* macros */}
          <View style={styles.secRow}>
            <Text style={styles.secTitle}>Macros — {suffix}</Text>
          </View>
          <View style={styles.donutBox}>
            <MacroDonut carb={agg.carb} protein={agg.protein} fat={agg.fat} />
            <View style={styles.dleg}>
              <LegendRow color={NoFoco.carb} label="Carboidratos" value={`${pctCarb}% · ${agg.carb}g`} />
              <LegendRow color={NoFoco.protein} label="Proteínas" value={`${pctProt}% · ${agg.protein}g`} />
              <LegendRow color={NoFoco.fat} label="Gorduras" value={`${pctFat}% · ${agg.fat}g`} />
            </View>
          </View>

          {/* micros */}
          <View style={styles.secRow}>
            <Text style={styles.secTitle}>Micros — {suffix}</Text>
          </View>
          <View style={styles.card}>
            {micros.map((mi, i) => (
              <View key={mi.label} style={[styles.microLine, i > 0 && { marginTop: Spacing.md }]}>
                <Text style={styles.microLabel}>{mi.label}</Text>
                <View style={styles.microTrack}>
                  <View style={[styles.microFill, { width: `${Math.min(100, mi.pct)}%` }]} />
                </View>
                <Text style={styles.microPct}>{mi.pct}%</Text>
              </View>
            ))}
            <Text style={styles.microNote}>% da recomendação diária (referência geral).</Text>
          </View>
        </>
      )}

      {/* evolução de peso */}
      <Text style={styles.section}>Evolução de peso</Text>
      <WeightEvolution />

      <View style={{ height: Spacing.xl }} />
    </Screen>
  );
}

function MacroDonut({ carb, protein, fat }: { carb: number; protein: number; fat: number }) {
  const size = 76;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;

  const kc = carb * 4;
  const kp = protein * 4;
  const kf = fat * 9;
  const tot = kc + kp + kf || 1;
  const fc = kc / tot;
  const fp = kp / tot;
  const ff = kf / tot;

  // pequeno respiro entre segmentos (em fração da volta) para o corte ficar visível
  const gap = fc > 0 && fp > 0 && ff > 0 ? 0.008 : 0;
  const seg = (frac: number, offsetFrac: number, color: string, key: string) => (
    <Circle
      key={key}
      cx={cx}
      cy={cy}
      r={r}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="butt"
      fill="none"
      strokeDasharray={`${Math.max(0, (frac - gap) * C)} ${C}`}
      strokeDashoffset={-offsetFrac * C}
    />
  );

  // sem rotação por transform (evita o aviso transform-origin no react-native-svg web);
  // os segmentos começam às 3h e seguem no sentido horário — proporções idênticas.
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke={NoFoco.surface2} strokeWidth={stroke} fill="none" />
      {seg(fc, 0, NoFoco.carb, 'c')}
      {seg(fp, fc, NoFoco.protein, 'p')}
      {seg(ff, fc + fp, NoFoco.fat, 'f')}
    </Svg>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legRow}>
      <View style={[styles.legDot, { backgroundColor: color }]} />
      <Text style={styles.legLabel}>{label}</Text>
      <Text style={styles.legValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: Spacing.md },
  title: { color: NoFoco.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: NoFoco.soft, fontSize: 12.5, marginTop: 2 },

  seg: {
    flexDirection: 'row',
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.sm },
  segOn: { backgroundColor: NoFoco.accent },
  segText: { color: NoFoco.soft, fontSize: 12, fontWeight: '700' },
  segTextOn: { color: NoFoco.onAccent },

  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  empty: { color: NoFoco.soft, fontSize: 12.5, lineHeight: 18 },

  secRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  secTitle: {
    color: NoFoco.soft,
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  secNum: { color: NoFoco.accent, fontSize: 11.5, fontWeight: '800', fontVariant: ['tabular-nums'] },

  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 5,
    height: 140,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
  },
  col: { flex: 1, alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' },
  colFillWrap: { width: '64%', flex: 1, justifyContent: 'flex-end' },
  colFill: { width: '100%', backgroundColor: NoFoco.kcal, borderRadius: 4, minHeight: 3 },
  colLabel: { color: NoFoco.soft, fontSize: 9, fontWeight: '600', fontVariant: ['tabular-nums'] },

  donutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  dleg: { flex: 1, gap: 7 },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legDot: { width: 9, height: 9, borderRadius: 3 },
  legLabel: { flex: 1, color: NoFoco.ink, fontSize: 11.5 },
  legValue: { color: NoFoco.soft, fontSize: 11.5, fontWeight: '700', fontVariant: ['tabular-nums'] },

  microLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  microLabel: { width: 60, color: NoFoco.soft, fontSize: 11.5 },
  microTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: NoFoco.surface2, overflow: 'hidden' },
  microFill: { height: '100%', backgroundColor: NoFoco.micro, borderRadius: 3 },
  microPct: { width: 36, textAlign: 'right', color: NoFoco.micro, fontSize: 11.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  microNote: { color: NoFoco.soft, fontSize: 10, marginTop: Spacing.md },

  section: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});
