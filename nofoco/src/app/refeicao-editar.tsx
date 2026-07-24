import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { computeGoal } from '@/lib/goal';
import { mealItems, useDiary } from '@/store/diary';
import { findMeal, MEAL_EMOJIS, pctSum, suggestedPct, useMeals } from '@/store/meals';
import { useProfile } from '@/store/profile';

/** Cria uma refeição nova ou edita uma existente (quando vem `id`). */
export default function RefeicaoEditarScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const meals = useMeals((s) => s.meals);
  const addMeal = useMeals((s) => s.addMeal);
  const updateMeal = useMeals((s) => s.updateMeal);
  const removeMeal = useMeals((s) => s.removeMeal);
  const dropMeal = useDiary((s) => s.dropMeal);
  const days = useDiary((s) => s.days);
  const profile = useProfile((s) => s.profile);

  const existing = findMeal(meals, id);
  const editing = !!existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '🍎');
  const [hour, setHour] = useState(() => (existing?.time ?? '21:00').split(':')[0]);
  const [minute, setMinute] = useState(() => (existing?.time ?? '21:00').split(':')[1]);
  const [pct, setPct] = useState(existing?.pct ?? suggestedPct(meals));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const goal = computeGoal(profile);
  // excluir a refeição apaga o que foi lançado nela em TODOS os dias, não só no de hoje
  const itemCount = editing
    ? Object.values(days).reduce((acc, it) => acc + mealItems(it, existing.id).length, 0)
    : 0;

  // prévia do alvo: soma das % das outras refeições + a que está sendo editada agora
  const othersPct = pctSum(meals.filter((m) => m.id !== existing?.id));
  const previewKcal = Math.round((goal.kcal * pct) / (othersPct + pct || 1));

  const clamp = (v: string, max: number) => {
    const n = parseInt(v.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n)) return '';
    return String(Math.min(max, Math.max(0, n)));
  };

  const time = `${(hour || '0').padStart(2, '0')}:${(minute || '0').padStart(2, '0')}`;
  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const draft = { name: name.trim(), emoji, time, pct: Math.max(0, pct) };
    if (editing) updateMeal(existing.id, draft);
    else addMeal(draft);
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    dropMeal(existing.id);
    removeMeal(existing.id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={NoFoco.ink} />
        </Pressable>
        <Text style={styles.title}>{editing ? 'Editar refeição' : 'Nova refeição'}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Nome</Text>
        <View style={styles.card}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="ex.: Ceia"
            placeholderTextColor={NoFoco.soft}
            style={styles.nameInput}
            maxLength={28}
            autoFocus={!editing}
            returnKeyType="done"
          />
        </View>

        <Text style={styles.section}>Ícone</Text>
        <View style={styles.emojiWrap}>
          {MEAL_EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              style={[styles.emojiChip, emoji === e && styles.emojiOn]}>
              <Text style={{ fontSize: 19 }}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Horário</Text>
        <View style={styles.card}>
          <View style={styles.timeRow}>
            <TextInput
              value={hour}
              onChangeText={(t) => setHour(clamp(t, 23))}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={styles.timeInput}
            />
            <Text style={styles.timeColon}>:</Text>
            <TextInput
              value={minute}
              onChangeText={(t) => setMinute(clamp(t, 59))}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={styles.timeInput}
            />
            <Text style={styles.timeHint}>
              Usado para saber se você está no ritmo ao longo do dia
            </Text>
          </View>
        </View>

        <Text style={styles.section}>Fatia da meta diária</Text>
        <View style={styles.card}>
          <View style={styles.pctRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pctValue}>{pct}%</Text>
              <Text style={styles.pctKcal}>≈ {previewKcal} kcal nesta refeição</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => setPct((p) => Math.max(0, p - 5))} hitSlop={6} style={styles.stepBtn}>
                <Text style={styles.stepSign}>−</Text>
              </Pressable>
              <Pressable onPress={() => setPct((p) => Math.min(100, p + 5))} hitSlop={6} style={styles.stepBtn}>
                <Text style={styles.stepSign}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <Text style={styles.hint}>
          As porcentagens não precisam somar 100% — o app distribui proporcionalmente. Dá para
          reajustar todas de uma vez no Perfil.
        </Text>

        {editing && (
          <>
            <Text style={styles.section}>Zona de risco</Text>
            <Pressable onPress={() => setConfirmDelete(true)} style={styles.delete}>
              <Ionicons name="trash-outline" size={17} color={NoFoco.danger} />
              <Text style={styles.deleteText}>Excluir refeição</Text>
            </Pressable>
          </>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={[styles.cta, !canSave && styles.ctaOff]}>
        <Text style={styles.ctaText}>{editing ? 'Salvar alterações' : 'Criar refeição'}</Text>
      </Pressable>

      <ConfirmDialog
        visible={confirmDelete}
        destructive
        title={`Excluir ${existing?.name.toLowerCase() ?? 'esta refeição'}?`}
        message={
          itemCount > 0
            ? `${itemCount} ${itemCount === 1 ? 'item lançado sai' : 'itens lançados saem'} do diário junto com ela, em todos os dias.`
            : 'A refeição some da sua rotina. As outras não mudam.'
        }
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { color: NoFoco.ink, fontSize: 18, fontWeight: '800' },

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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  nameInput: { color: NoFoco.ink, fontSize: 16, fontWeight: '600', paddingVertical: 4 },

  emojiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOn: { backgroundColor: 'rgba(166,224,82,0.12)', borderColor: NoFoco.accent },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: {
    color: NoFoco.ink,
    fontSize: 24,
    fontWeight: '800',
    minWidth: 46,
    textAlign: 'center',
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    fontVariant: ['tabular-nums'],
  },
  timeColon: { color: NoFoco.soft, fontSize: 22, fontWeight: '800' },
  timeHint: { flex: 1, color: NoFoco.soft, fontSize: 11, lineHeight: 15, marginLeft: Spacing.md },

  pctRow: { flexDirection: 'row', alignItems: 'center' },
  pctValue: { color: NoFoco.ink, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pctKcal: { color: NoFoco.soft, fontSize: 11.5, marginTop: 2, fontVariant: ['tabular-nums'] },
  stepper: { flexDirection: 'row', gap: Spacing.sm },
  stepBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSign: { color: NoFoco.accent, fontSize: 24, fontWeight: '700', lineHeight: 28 },
  hint: { color: NoFoco.soft, fontSize: 11, lineHeight: 15, marginTop: Spacing.sm },

  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.danger,
    borderRadius: Radius.md,
    paddingVertical: 13,
  },
  deleteText: { color: NoFoco.danger, fontSize: 13, fontWeight: '700' },

  cta: {
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: NoFoco.onAccent, fontSize: 14, fontWeight: '800' },
});
