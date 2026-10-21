import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionTable } from '@/components/ui/nutrition-table';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { getFood, macrosForGrams, type Food, type Serving } from '@/data/foods';
import { resolveServings } from '@/data/servings';
import { nowMinutes } from '@/lib/pacing';
import { lookupProduct } from '@/services/products';
import { useDay } from '@/store/day';
import { dayItems, mealItems, newItemId, useDiary, type DiaryItem } from '@/store/diary';
import { findMeal, timeToMinutes, useMeals, type MealId } from '@/store/meals';

type Mode = 'unid' | 'g';

/** Formata contagem de unidades (0,5 · 1 · 1,5) sem ".0". */
function fmtUnits(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('pt-BR');
}

/** Sem refeição indicada, chuta a mais próxima do horário atual. */
function nearestMealId(meals: { id: MealId; time: string }[]): MealId | undefined {
  if (meals.length === 0) return undefined;
  const now = nowMinutes();
  return meals.reduce((best, m) =>
    Math.abs(timeToMinutes(m.time) - now) < Math.abs(timeToMinutes(best.time) - now) ? m : best,
  ).id;
}

export default function PorcaoScreen() {
  const {
    id,
    meal: mealParam,
    edit: editId,
    voltarPara,
  } = useLocalSearchParams<{ id: string; meal?: string; edit?: string; voltarPara?: string }>();

  const [asyncFood, setAsyncFood] = useState<Food | null>(null);

  // Busca do alimento em memória ou carrega se for acesso direto via URL
  useEffect(() => {
    if (!getFood(id) && id?.startsWith('off-')) {
      const code = id.replace('off-', '');
      lookupProduct(code).then((f) => {
        if (f) setAsyncFood(f);
      });
    }
  }, [id]);

  const food = getFood(id) ?? asyncFood;

  const addItem = useDiary((s) => s.addItem);
  const saveItem = useDiary((s) => s.saveItem);
  const days = useDiary((s) => s.days);
  const meals = useMeals((s) => s.meals);
  const date = useDay((s) => s.date);

  const allItems = dayItems(days, date);

  /** Item já lançado que estamos reeditando (quando veio `edit`). */
  const existing = editId ? mealItems(allItems, mealParam ?? '').find((i) => i.id === editId) : undefined;
  const editing = !!existing;

  const servings = useMemo(() => (food ? resolveServings(food) : []), [food]);

  const [selectedServingId, setSelectedServingId] = useState<string>(() => servings[0]?.id ?? 'default');

  const [mode, setMode] = useState<Mode>(() =>
    existing && !existing.portionLabel.includes(' un') && !existing.portionLabel.includes('colher') ? 'g' : 'unid',
  );

  const activeServing = servings.find((s) => s.id === selectedServingId) ?? servings[0];
  const currentUnitGrams = activeServing?.grams || food?.unitGrams || 100;

  const [grams, setGrams] = useState(existing?.grams ?? currentUnitGrams);

  // Sincroniza a porção inicial sempre que um alimento carregar
  useEffect(() => {
    if (!existing && servings.length > 0) {
      const first = servings[0];
      setSelectedServingId(first.id);
      setGrams(first.grams);
    }
  }, [id, servings.length]);

  const [meal, setMeal] = useState<MealId | undefined>(
    () => (mealParam && findMeal(meals, mealParam)?.id) || nearestMealId(meals),
  );

  const macros = useMemo(() => (food ? macrosForGrams(food, grams) : null), [food, grams]);

  if (!food || !macros) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Carregando alimento...</Text>
      </SafeAreaView>
    );
  }

  // pedimos para editar, mas o item não está mais lá (excluído, ou recarga da página)
  if (editId && !existing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={NoFoco.ink} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title}>Item não encontrado</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
        <Text style={styles.hint}>
          Este item não está mais na refeição. Volte e adicione novamente, se quiser.
        </Text>
      </SafeAreaView>
    );
  }

  const unit = food.liquid ? 'ml' : 'g';
  const units = currentUnitGrams > 0 ? grams / currentUnitGrams : 1;

  const onSelectServing = (s: Serving) => {
    setSelectedServingId(s.id);
    setMode('unid');
    setGrams(s.grams);
  };

  const step = (dir: number) => {
    if (mode === 'unid') {
      const u = Math.max(0.5, units + dir * 0.5);
      setGrams(Math.round(u * currentUnitGrams));
    } else {
      setGrams(Math.max(5, grams + dir * 5));
    }
  };

  const onTypeGrams = (text: string) => {
    const n = parseInt(text.replace(/\D/g, ''), 10);
    setGrams(Number.isFinite(n) ? n : 0);
  };

  const switchMode = (m: Mode) => setMode(m);

  const handleSave = () => {
    if (!meal) return;
    let portionLabel: string;
    if (mode === 'unid') {
      const count = fmtUnits(units);
      if (activeServing && activeServing.label) {
        portionLabel = `${count} ${activeServing.label}`;
      } else {
        portionLabel = `${count} un (${grams} ${unit})`;
      }
    } else {
      portionLabel = `${grams} ${unit}`;
    }

    const item: DiaryItem = {
      id: existing?.id ?? newItemId(),
      foodId: food.id,
      name: food.name,
      emoji: food.emoji,
      grams,
      portionLabel,
      macros,
    };

    if (existing && mealParam) saveItem(date, mealParam, meal, item);
    else addItem(date, meal, item);

    // quem veio da refeição volta para ela; quem veio do FAB volta ao diário
    if (editing || voltarPara === 'refeicao') {
      router.dismissTo({ pathname: '/refeicao', params: { key: meal } });
    } else if (router.canDismiss()) {
      router.dismissAll();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Rótulo da unidade exibido no valor principal (ex: "lata", "colher", "un")
  const unitName = activeServing?.label
    ? activeServing.label.replace(/^1\s+/, '').split(' ')[0]
    : 'un';

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
          <Text style={styles.sub}>
            {food.brand ?? food.source} · {editing ? 'editando o lançamento' : 'ajuste a porção'}
          </Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

        {/* Chips de medidas caseiras rápidas */}
        {servings.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servingsScroll}
            style={styles.servingsWrap}>
            {servings.map((s) => {
              const isSelected = mode === 'unid' && s.id === selectedServingId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => onSelectServing(s)}
                  style={[styles.servingChip, isSelected && styles.servingChipOn]}>
                  <Text style={[styles.servingChipText, isSelected && styles.servingChipTextOn]}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* stepper grande */}
        <View style={styles.stepper}>
          <Pressable style={styles.stepBtn} onPress={() => step(-1)} hitSlop={6}>
            <Text style={styles.stepSign}>−</Text>
          </Pressable>

          <View style={styles.valueBox}>
            {mode === 'unid' ? (
              <>
                <Text style={styles.valueMain}>
                  {fmtUnits(units)} {unitName}
                </Text>
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
                <Text style={styles.valueSub}>≈ {fmtUnits(units)} {unitName}</Text>
              </>
            )}
          </View>

          <Pressable style={styles.stepBtn} onPress={() => step(1)} hitSlop={6}>
            <Text style={styles.stepSign}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          {mode === 'unid'
            ? `${activeServing?.label ?? `${currentUnitGrams} ${unit}`} · toque em ${food.liquid ? 'Mililitros' : 'Gramas'} para digitar o valor`
            : `Digite o valor exato · ou use os botões + / −`}
        </Text>

        {/* macros ao vivo */}
        <View style={styles.donutRow}>
          <MacroCell value={`${macros.kcal}`} label="kcal" color={NoFoco.kcal} />
          <MacroCell value={`${macros.carb}g`} label="Carbo" color={NoFoco.carb} />
          <MacroCell value={`${macros.protein}g`} label="Prot" color={NoFoco.protein} />
          <MacroCell value={`${macros.fat}g`} label="Gord" color={NoFoco.fat} />
        </View>

        {/* tabela completa desta porção */}
        <View style={{ marginTop: Spacing.lg }}>
          <NutritionTable sources={[macros]} label="Tabela nutricional completa" />
        </View>

        {/* seletor de refeição */}
        <Text style={styles.section}>Adicionar em qual refeição?</Text>
        {meals.length === 0 ? (
          <Text style={styles.noMeals}>
            Nenhuma refeição cadastrada. Vá ao Diário e adicione pelo menos uma.
          </Text>
        ) : (
          <View style={styles.meals}>
            {meals.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setMeal(m.id)}
                style={[styles.mealChip, meal === m.id && styles.mealOn]}>
                <Text style={[styles.mealText, meal === m.id && styles.mealTextOn]}>{m.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <Pressable style={[styles.cta, !meal && styles.ctaOff]} onPress={handleSave} disabled={!meal}>
        <Text style={styles.ctaText}>
          {!meal
            ? 'Escolha uma refeição'
            : editing
              ? `Salvar ${macros.kcal} kcal no ${findMeal(meals, meal)?.name ?? 'diário'}`
              : `Adicionar ${macros.kcal} kcal ao ${findMeal(meals, meal)?.name ?? 'diário'}`}
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

  servingsWrap: { marginTop: Spacing.sm },
  servingsScroll: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: 2 },
  servingChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
  },
  servingChipOn: {
    backgroundColor: 'rgba(166,224,82,0.15)',
    borderColor: NoFoco.accent,
  },
  servingChipText: {
    color: NoFoco.soft,
    fontSize: 12,
    fontWeight: '600',
  },
  servingChipTextOn: {
    color: NoFoco.accent,
    fontWeight: '700',
  },

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
  noMeals: { color: NoFoco.soft, fontSize: 12.5, lineHeight: 17 },
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
  ctaOff: { opacity: 0.4 },
  ctaText: { color: NoFoco.onAccent, fontSize: 14, fontWeight: '800' },
});
