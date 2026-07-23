import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { getFood, macrosForGrams } from '@/data/foods';
import { MEALS, mealDef, newItemId, useDiary, type DiaryItem, type MealKey } from '@/store/diary';

type Mode = 'unid' | 'g';

/** Formata contagem de unidades (0,5 · 1 · 1,5) sem ".0". */
function fmtUnits(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('pt-BR');
}

export default function PorcaoScreen() {
  const { id, meal: mealParam } = useLocalSearchParams<{ id: string; meal?: MealKey }>();
  const food = getFood(id);
  const addItem = useDiary((s) => s.addItem);

  const [mode, setMode] = useState<Mode>('unid');
  const [grams, setGrams] = useState(food?.unitGrams ?? 100);
  const [meal, setMeal] = useState<MealKey>(mealParam ?? 'almoco');

  const macros = useMemo(() => (food ? macrosForGrams(food, grams) : null), [food, grams]);

  if (!food || !macros) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Alimento não encontrado</Text>
      </SafeAreaView>
    );
  }

  const unit = food.liquid ? 'ml' : 'g';
  const units = grams / food.unitGrams;

  const step = (dir: number) => {
    if (mode === 'unid') {
      const u = Math.max(0.5, units + dir * 0.5);
      setGrams(Math.round(u * food.unitGrams));
    } else {
      setGrams(Math.max(5, grams + dir * 5));
    }
  };

  const onTypeGrams = (text: string) => {
    const n = parseInt(text.replace(/\D/g, ''), 10);
    setGrams(Number.isFinite(n) ? n : 0);
  };

  const switchMode = (m: Mode) => setMode(m);

  const handleAdd = () => {
    const portionLabel =
      mode === 'unid' ? `${fmtUnits(units)} un (${grams} ${unit})` : `${grams} ${unit}`;
    const item: DiaryItem = {
      id: newItemId(),
      foodId: food.id,
      name: food.name,
      emoji: food.emoji,
      grams,
      portionLabel,
      macros,
    };
    addItem(meal, item);
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={NoFoco.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title} numberOfLines={1}>
            {food.name}
          </Text>
          <Text style={styles.sub}>{food.brand ?? food.source} · ajuste a porção</Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      {/* alternador Unidade / Gramas */}
      <View style={styles.toggle}>
        <Pressable style={[styles.toggleBtn, mode === 'unid' && styles.toggleOn]} onPress={() => switchMode('unid')}>
          <Text style={[styles.toggleText, mode === 'unid' && styles.toggleTextOn]}>Unidade</Text>
        </Pressable>
        <Pressable style={[styles.toggleBtn, mode === 'g' && styles.toggleOn]} onPress={() => switchMode('g')}>
          <Text style={[styles.toggleText, mode === 'g' && styles.toggleTextOn]}>
            {food.liquid ? 'Mililitros' : 'Gramas'}
          </Text>
        </Pressable>
      </View>

      {/* stepper grande */}
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => step(-1)} hitSlop={6}>
          <Text style={styles.stepSign}>−</Text>
        </Pressable>

        <View style={styles.valueBox}>
          {mode === 'unid' ? (
            <>
              <Text style={styles.valueMain}>{fmtUnits(units)} un</Text>
              <Text style={styles.valueSub}>
                {grams} {unit}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.gramInputRow}>
                <TextInput
                  value={grams ? String(grams) : ''}
                  onChangeText={onTypeGrams}
                  keyboardType="number-pad"
                  style={styles.gramInput}
                  maxLength={4}
                  selectTextOnFocus
                />
                <Text style={styles.gramUnit}>{unit}</Text>
              </View>
              <Text style={styles.valueSub}>≈ {fmtUnits(units)} un</Text>
            </>
          )}
        </View>

        <Pressable style={styles.stepBtn} onPress={() => step(1)} hitSlop={6}>
          <Text style={styles.stepSign}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        {mode === 'unid'
          ? `1 ${food.unitLabel} ≈ ${food.unitGrams} ${unit} · toque em ${food.liquid ? 'Mililitros' : 'Gramas'} para o valor exato`
          : `Digite o peso exato · ajuste de 5 em 5 ${unit}`}
      </Text>

      {/* macros ao vivo */}
      <View style={styles.donutRow}>
        <MacroCell value={`${macros.kcal}`} label="kcal" color={NoFoco.kcal} />
        <MacroCell value={`${macros.carb}g`} label="Carbo" color={NoFoco.carb} />
        <MacroCell value={`${macros.protein}g`} label="Prot" color={NoFoco.protein} />
        <MacroCell value={`${macros.fat}g`} label="Gord" color={NoFoco.fat} />
      </View>

      {/* micros ao vivo */}
      <Text style={styles.section}>Também nesta porção</Text>
      <View style={styles.microCard}>
        <MicroRow label="Açúcares" value={`${macros.sugar} g`} color={NoFoco.fat} first />
        <MicroRow label="Fibras" value={`${macros.fiber} g`} color={NoFoco.micro} />
        <MicroRow label="Sódio" value={`${macros.sodium} mg`} color={NoFoco.soft} />
      </View>

      {/* refeição */}
      <Text style={styles.section}>Refeição</Text>
      <View style={styles.meals}>
        {MEALS.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => setMeal(m.key)}
            style={[styles.mealChip, meal === m.key && styles.mealOn]}>
            <Text style={[styles.mealText, meal === m.key && styles.mealTextOn]}>{m.name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <Pressable style={styles.cta} onPress={handleAdd}>
        <Text style={styles.ctaText}>
          Adicionar {macros.kcal} kcal ao {mealDef(meal).name}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

function MacroCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.macroCell}>
      <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={[styles.macroTick, { backgroundColor: color }]} />
    </View>
  );
}

function MicroRow({ label, value, color, first }: { label: string; value: string; color: string; first?: boolean }) {
  return (
    <View style={[styles.microRow, !first && styles.microBorder]}>
      <Text style={styles.microLabel}>{label}</Text>
      <Text style={[styles.microValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { color: NoFoco.ink, fontSize: 18, fontWeight: '800' },
  sub: { color: NoFoco.soft, fontSize: 11.5, marginTop: 1 },

  toggle: { flexDirection: 'row', backgroundColor: NoFoco.surface2, borderRadius: Radius.md, padding: 3, marginTop: Spacing.sm },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.sm },
  toggleOn: { backgroundColor: NoFoco.accent },
  toggleText: { color: NoFoco.soft, fontSize: 12.5, fontWeight: '700' },
  toggleTextOn: { color: NoFoco.onAccent },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSign: { color: NoFoco.accent, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  valueBox: { flex: 1, alignItems: 'center' },
  valueMain: { color: NoFoco.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  valueSub: { color: NoFoco.soft, fontSize: 11.5, marginTop: 2, fontVariant: ['tabular-nums'] },
  gramInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  gramInput: {
    color: NoFoco.ink,
    fontSize: 24,
    fontWeight: '800',
    minWidth: 54,
    textAlign: 'center',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  gramUnit: { color: NoFoco.soft, fontSize: 14, fontWeight: '700' },
  hint: { color: NoFoco.soft, fontSize: 11, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 15 },

  donutRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  macroCell: { alignItems: 'center', flex: 1 },
  macroValue: { color: NoFoco.ink, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  macroLabel: { color: NoFoco.soft, fontSize: 10, fontWeight: '600', marginTop: 2 },
  macroTick: { width: 20, height: 4, borderRadius: 3, marginTop: 6 },

  section: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  microCard: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
  },
  microRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md },
  microBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: NoFoco.faint },
  microLabel: { color: NoFoco.ink, fontSize: 13 },
  microValue: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },

  meals: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  mealChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
  },
  mealOn: { backgroundColor: 'rgba(166,224,82,0.1)', borderColor: NoFoco.accent },
  mealText: { color: NoFoco.soft, fontSize: 12, fontWeight: '700' },
  mealTextOn: { color: NoFoco.accent },

  cta: { backgroundColor: NoFoco.accent, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', marginBottom: Spacing.sm },
  ctaText: { color: NoFoco.onAccent, fontSize: 14, fontWeight: '800' },
});
