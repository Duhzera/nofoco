import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoachBanner } from '@/components/ui/coach-banner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MacroBar } from '@/components/ui/macro-bar';
import { NutritionTable } from '@/components/ui/nutrition-table';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { formatDayTitle, isToday } from '@/lib/date';
import { computeGoal } from '@/lib/goal';
import { mealAdvice, mealMacroTarget } from '@/lib/pacing';
import { dayItems, kcalByMeal, mealItems, sumMacros, useDiary } from '@/store/diary';
import { useDay } from '@/store/day';
import { findMeal, useMeals } from '@/store/meals';
import { useProfile } from '@/store/profile';

/** O que o diálogo de confirmação está prestes a apagar. */
type Pending = { kind: 'one'; id: string; name: string } | { kind: 'many' } | { kind: 'all' };

export default function RefeicaoScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const meals = useMeals((s) => s.meals);
  const def = findMeal(meals, key);
  const days = useDiary((s) => s.days);
  const removeItems = useDiary((s) => s.removeItems);
  const clearMeal = useDiary((s) => s.clearMeal);
  const profile = useProfile((s) => s.profile);
  const date = useDay((s) => s.date);

  const allItems = dayItems(days, date);
  const today = isToday(date);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);

  const items = mealItems(allItems, key);
  const totals = sumMacros(items);
  const goal = computeGoal(profile);

  // ids selecionados que ainda existem (um item pode ter sumido por outro caminho)
  const marked = selected.filter((id) => items.some((i) => i.id === id));

  const exitSelection = () => {
    setSelecting(false);
    setSelected([]);
  };

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const startSelection = (id: string) => {
    setSelecting(true);
    setSelected([id]);
  };

  const confirmText = (): { title: string; message: string; confirmLabel: string } => {
    if (pending?.kind === 'one') {
      return {
        title: 'Excluir este item?',
        message: `“${pending.name}” sai desta refeição. Dá para adicionar de novo depois.`,
        confirmLabel: 'Excluir',
      };
    }
    if (pending?.kind === 'many') {
      return {
        title: `Excluir ${marked.length} ${marked.length === 1 ? 'item' : 'itens'}?`,
        message: 'Eles saem desta refeição. Dá para adicionar de novo depois.',
        confirmLabel: 'Excluir',
      };
    }
    return {
      title: `Limpar ${def?.name.toLowerCase() ?? 'a refeição'}?`,
      message:
        items.length === 1
          ? 'O único item desta refeição será removido. As outras refeições não mudam.'
          : `Os ${items.length} itens desta refeição serão removidos. As outras refeições não mudam.`,
      confirmLabel: 'Limpar tudo',
    };
  };

  const handleConfirm = () => {
    if (!pending) return;
    if (pending.kind === 'one') removeItems(date, key, [pending.id]);
    else if (pending.kind === 'many') removeItems(date, key, marked);
    else clearMeal(date, key);
    setPending(null);
    exitSelection();
  };

  // a refeição pode ter sido excluída enquanto esta tela estava aberta
  if (!def) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={NoFoco.ink} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title}>Refeição</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Esta refeição não existe mais</Text>
          <Text style={styles.emptyDesc}>Ela pode ter sido excluída. Volte ao diário.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const target = mealMacroTarget(goal, meals, key);
  const advice = mealAdvice(goal.kcal, meals, kcalByMeal(allItems, meals), key, today);
  const overKcal = totals.kcal > target.kcal * 1.1;
  const kcalFraction = target.kcal > 0 ? Math.min(1, totals.kcal / target.kcal) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={NoFoco.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>{def.name}</Text>
          <Text style={styles.sub}>
            {today ? `${def.time} · ${def.pct}% da meta do dia` : formatDayTitle(date)}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/refeicao-editar', params: { id: key } })}
          hitSlop={10}
          style={styles.iconBtn}>
          <Ionicons name="create-outline" size={19} color={NoFoco.soft} />
        </Pressable>
      </View>

      {/* meta da refeição: calorias e macros */}
      <View style={styles.summary}>
        <View style={styles.kcalRow}>
          <Text style={styles.kcalValue}>
            <Text style={overKcal ? { color: NoFoco.warning } : undefined}>{totals.kcal}</Text>
            <Text style={styles.kcalTarget}> / {target.kcal} kcal</Text>
          </Text>
          <Text style={styles.kcalLeft}>
            {target.kcal - totals.kcal >= 0
              ? `restam ${target.kcal - totals.kcal}`
              : `${totals.kcal - target.kcal} acima`}
          </Text>
        </View>
        <View style={styles.kcalTrack}>
          <View
            style={[
              styles.kcalFill,
              { width: `${kcalFraction * 100}%`, backgroundColor: overKcal ? NoFoco.warning : NoFoco.kcal },
            ]}
          />
        </View>

        <View style={styles.macroRow}>
          <MacroBar label="Carbo" consumed={totals.carb} goal={target.carb} color={NoFoco.carb} />
          <MacroBar label="Proteína" consumed={totals.protein} goal={target.protein} color={NoFoco.protein} />
          <MacroBar label="Gordura" consumed={totals.fat} goal={target.fat} color={NoFoco.fat} />
        </View>
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
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                {selecting
                  ? `${marked.length} ${marked.length === 1 ? 'selecionado' : 'selecionados'}`
                  : `Itens (${items.length})`}
              </Text>
              <View style={styles.listActions}>
                {selecting ? (
                  <>
                    <Text
                      style={styles.link}
                      onPress={() =>
                        setSelected(marked.length === items.length ? [] : items.map((i) => i.id))
                      }>
                      {marked.length === items.length ? 'Nenhum' : 'Todos'}
                    </Text>
                    <Text style={styles.linkMuted} onPress={exitSelection}>
                      Cancelar
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.link} onPress={() => setSelecting(true)}>
                      Selecionar
                    </Text>
                    <Text style={styles.linkDanger} onPress={() => setPending({ kind: 'all' })}>
                      Limpar
                    </Text>
                  </>
                )}
              </View>
            </View>

            {items.map((it) => {
              const on = marked.includes(it.id);
              return (
                <Pressable
                  key={it.id}
                  style={[styles.item, on && styles.itemOn]}
                  onLongPress={() => startSelection(it.id)}
                  onPress={() =>
                    selecting
                      ? toggle(it.id)
                      : router.push({
                          pathname: '/porcao',
                          params: { id: it.foodId, meal: key, edit: it.id },
                        })
                  }>
                  {selecting ? (
                    <Ionicons
                      name={on ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={on ? NoFoco.accent : NoFoco.soft}
                    />
                  ) : (
                    <View style={styles.itemIcon}>
                      <Text style={{ fontSize: 17 }}>{it.emoji}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={styles.itemMeta}>{it.portionLabel}</Text>
                  </View>
                  <Text style={styles.itemKcal}>{it.macros.kcal}</Text>
                  {!selecting && (
                    <Pressable
                      onPress={() => setPending({ kind: 'one', id: it.id, name: it.name })}
                      hitSlop={8}
                      style={styles.trash}>
                      <Ionicons name="trash-outline" size={17} color={NoFoco.soft} />
                    </Pressable>
                  )}
                </Pressable>
              );
            })}

            {!selecting && (
              <Text style={styles.tip}>
                Toque num item para ajustar a porção · segure para selecionar vários.
              </Text>
            )}

            <View style={{ marginTop: Spacing.lg }}>
              <NutritionTable
                sources={items.map((it) => it.macros)}
                label={`Tabela nutricional · ${def.name.toLowerCase()}`}
              />
            </View>
          </>
        )}
      </ScrollView>

      {selecting ? (
        <Pressable
          style={[styles.cta, styles.ctaDanger, marked.length === 0 && styles.ctaOff]}
          disabled={marked.length === 0}
          onPress={() => setPending({ kind: 'many' })}>
          <Ionicons name="trash-outline" size={18} color={NoFoco.ink} />
          <Text style={[styles.ctaText, styles.ctaTextDanger]}>
            {marked.length === 0 ? 'Selecione itens para excluir' : `Excluir ${marked.length}`}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.cta}
          onPress={() =>
            router.push({
              pathname: '/adicionar',
              params: { meal: key, voltarPara: 'refeicao' },
            })
          }>
          <Ionicons name="add" size={20} color={NoFoco.onAccent} />
          <Text style={styles.ctaText}>Adicionar alimento</Text>
        </Pressable>
      )}

      <ConfirmDialog
        visible={pending !== null}
        destructive
        {...confirmText()}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { color: NoFoco.ink, fontSize: 18, fontWeight: '800' },
  sub: { color: NoFoco.soft, fontSize: 11.5, marginTop: 1 },

  summary: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  kcalValue: { color: NoFoco.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  kcalTarget: { color: NoFoco.soft, fontSize: 14, fontWeight: '600' },
  kcalLeft: { color: NoFoco.soft, fontSize: 11.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  kcalTrack: {
    height: 7,
    borderRadius: Radius.sm,
    backgroundColor: NoFoco.surface2,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  kcalFill: { height: '100%', borderRadius: Radius.sm },
  macroRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },

  list: { paddingBottom: Spacing.lg },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  listTitle: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  listActions: { flexDirection: 'row', gap: Spacing.lg },
  link: { color: NoFoco.accent, fontSize: 12.5, fontWeight: '700' },
  linkMuted: { color: NoFoco.soft, fontSize: 12.5, fontWeight: '700' },
  linkDanger: { color: NoFoco.danger, fontSize: 12.5, fontWeight: '700' },
  tip: { color: NoFoco.soft, fontSize: 11, marginTop: Spacing.md, lineHeight: 15 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: -Spacing.sm,
    borderRadius: Radius.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NoFoco.faint,
  },
  itemOn: { backgroundColor: 'rgba(166,224,82,0.08)' },
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
  ctaDanger: { backgroundColor: NoFoco.danger },
  ctaTextDanger: { color: NoFoco.ink },
  ctaOff: { opacity: 0.45 },
});
