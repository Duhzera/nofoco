import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { todayKey } from '@/lib/date';
import {
  ACTIVITY,
  computeGoal,
  isAggressivePace,
  OBJECTIVES,
  safeMaxWeeklyLoss,
  WEEKLY_RATES,
  type Activity,
  type Objective,
  type Sex,
} from '@/lib/goal';
import { useProfile } from '@/store/profile';
import { parseKg, useWeight } from '@/store/weight';

/**
 * Primeira abertura (E1): coleta os dados que alimentam a meta e mostra o resultado
 * ao vivo, para a pessoa entender de onde vem o número antes de entrar no app.
 * Só aparece enquanto `onboarded` for falso (ver store/profile e os gates de navegação).
 */
export default function OnboardingScreen() {
  const setProfile = useProfile((s) => s.setProfile);
  const completeOnboarding = useProfile((s) => s.completeOnboarding);
  const setWeight = useWeight((s) => s.setWeight);

  const [sex, setSex] = useState<Sex>('M');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightText, setWeightText] = useState('');
  const [activity, setActivity] = useState<Activity>('moderado');
  const [objective, setObjective] = useState<Objective>('perder');
  const [weeklyRate, setWeeklyRate] = useState<number | undefined>(undefined);
  const [targetText, setTargetText] = useState('');

  const ageN = parseInt(age, 10) || 0;
  const heightN = parseInt(heightCm, 10) || 0;
  const weightN = parseKg(weightText);
  const targetN = parseInt(targetText.replace(/\D/g, ''), 10) || 0;

  const ready = ageN >= 10 && ageN <= 120 && heightN >= 100 && heightN <= 250 && weightN > 0;

  const goal = ready
    ? computeGoal({
        sex,
        age: ageN,
        heightCm: heightN,
        weightKg: weightN,
        activity,
        objective,
        weeklyRateKg: weeklyRate,
      })
    : null;

  const finish = () => {
    if (!ready) return;
    setProfile({
      sex,
      age: ageN,
      heightCm: heightN,
      weightKg: weightN,
      activity,
      objective,
      weeklyRateKg: weeklyRate,
      ...(targetN > 0 ? { targetWeightKg: targetN } : {}),
    });
    setWeight(todayKey(), weightN);
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const isAggressive = isAggressivePace(weeklyRate, weightN);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>NoFoco</Text>
          <Text style={styles.heroTitle}>Vamos montar seu plano</Text>
          <Text style={styles.heroSub}>
            Alguns dados rápidos e o app calcula sua meta de calorias e macros. Você pode ajustar tudo
            depois no Perfil.
          </Text>
        </View>

        <Text style={styles.section}>Qual seu objetivo?</Text>
        <View style={styles.grid}>
          {(Object.keys(OBJECTIVES) as Objective[]).map((k) => {
            const on = objective === k;
            return (
              <Pressable key={k} onPress={() => setObjective(k)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{OBJECTIVES[k].label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Sobre você</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Sexo</Text>
            <View style={styles.chipsInline}>
              {(['M', 'F'] as const).map((s) => (
                <Pressable key={s} onPress={() => setSex(s)} style={[styles.smallChip, sex === s && styles.chipOn]}>
                  <Text style={[styles.chipText, sex === s && styles.chipTextOn]}>
                    {s === 'M' ? 'Masculino' : 'Feminino'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <NumRow label="Idade" unit="anos" value={age} onChange={setAge} max={3} />
          <NumRow label="Altura" unit="cm" value={heightCm} onChange={setHeightCm} max={3} />
          <NumRow label="Peso atual" unit="kg" value={weightText} onChange={setWeightText} decimal last />
        </View>

        {/* Ritmo desejado quando o objetivo for perder */}
        {objective === 'perder' && (
          <>
            <Text style={styles.section}>Ritmo desejado</Text>
            <View style={styles.grid}>
              <Pressable
                onPress={() => setWeeklyRate(undefined)}
                style={[styles.chip, weeklyRate === undefined && styles.chipOn]}>
                <Text style={[styles.chipText, weeklyRate === undefined && styles.chipTextOn]}>
                  Automático
                </Text>
              </Pressable>
              {WEEKLY_RATES.map((r) => {
                const on = weeklyRate === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setWeeklyRate(r)}
                    style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {r.toLocaleString('pt-BR')} kg/sem
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {isAggressive && (
              <View style={styles.warn}>
                <Ionicons name="alert-circle-outline" size={16} color={NoFoco.warning} />
                <Text style={styles.warnText}>
                  Ritmo agressivo: para seu peso ({weightN} kg), perder mais de {safeMaxWeeklyLoss(weightN).toLocaleString('pt-BR')} kg/semana acelera a perda de massa magra e o efeito rebote. Recomendamos até 0,5 kg/sem.
                </Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.section}>Nível de atividade</Text>
        <View style={styles.grid}>
          {(Object.keys(ACTIVITY) as Activity[]).map((k) => {
            const on = activity === k;
            return (
              <Pressable key={k} onPress={() => setActivity(k)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{ACTIVITY[k].label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Peso alvo (opcional)</Text>
        <View style={styles.card}>
          <NumRow label="Quero chegar em" unit="kg" value={targetText} onChange={setTargetText} max={3} last />
        </View>

        {/* prévia da meta */}
        <View style={[styles.preview, !goal && styles.previewOff]}>
          {goal ? (
            <>
              <Text style={styles.previewLabel}>Sua meta diária ficaria em</Text>
              <Text style={styles.previewKcal}>{goal.kcal.toLocaleString('pt-BR')}</Text>
              <Text style={styles.previewUnit}>kcal / dia</Text>
              <View style={styles.previewMacros}>
                <PreviewMacro value={`${goal.carb}g`} label="Carbo" color={NoFoco.carb} />
                <PreviewMacro value={`${goal.protein}g`} label="Proteína" color={NoFoco.protein} />
                <PreviewMacro value={`${goal.fat}g`} label="Gordura" color={NoFoco.fat} />
                <PreviewMacro value={`${goal.fiber}g`} label="Fibras" color={NoFoco.micro} />
              </View>
            </>
          ) : (
            <Text style={styles.previewHint}>
              Preencha idade, altura e peso para ver sua meta.
            </Text>
          )}
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={15} color={NoFoco.soft} />
          <Text style={styles.disclaimerText}>
            Estimativa informativa (Mifflin-St Jeor). Não substitui nutricionista ou médico.
          </Text>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={finish} disabled={!ready} style={[styles.cta, !ready && styles.ctaOff]}>
          <Text style={styles.ctaText}>Criar meu plano</Text>
          <Ionicons name="arrow-forward" size={18} color={NoFoco.onAccent} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function NumRow({
  label,
  unit,
  value,
  onChange,
  max = 3,
  decimal,
  last,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (t: string) => void;
  max?: number;
  decimal?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(decimal ? t.replace(/[^\d.,]/g, '') : t.replace(/\D/g, ''))}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          placeholder="—"
          placeholderTextColor={NoFoco.soft}
          style={styles.fieldInput}
          maxLength={decimal ? 5 : max}
          selectTextOnFocus
        />
        <Text style={styles.fieldUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function PreviewMacro({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.previewMacro}>
      <View style={[styles.previewDot, { backgroundColor: color }]} />
      <Text style={styles.previewMacroValue}>{value}</Text>
      <Text style={styles.previewMacroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },

  hero: { paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  brand: { color: NoFoco.accent, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle: { color: NoFoco.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: Spacing.sm },
  heroSub: { color: NoFoco.soft, fontSize: 13, lineHeight: 19, marginTop: Spacing.sm },

  section: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: NoFoco.surface,
  },
  smallChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: NoFoco.surface2,
  },
  chipOn: { backgroundColor: 'rgba(166,224,82,0.12)', borderColor: NoFoco.accent },
  chipText: { color: NoFoco.soft, fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: NoFoco.accent },
  chipsInline: { flexDirection: 'row', gap: Spacing.sm },

  warn: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(242,163,60,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.warning,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  warnText: { flex: 1, color: NoFoco.warning, fontSize: 11.5, lineHeight: 16 },

  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  fieldBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: NoFoco.faint },
  fieldLabel: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '600' },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  fieldInput: {
    color: NoFoco.ink,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 54,
    textAlign: 'right',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  fieldUnit: { color: NoFoco.soft, fontSize: 12, fontWeight: '600' },

  preview: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.accent,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  previewOff: { borderColor: NoFoco.hair },
  previewLabel: { color: NoFoco.soft, fontSize: 12, fontWeight: '600' },
  previewKcal: { color: NoFoco.ink, fontSize: 40, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  previewUnit: { color: NoFoco.soft, fontSize: 12, marginTop: -2 },
  previewMacros: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  previewMacro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewDot: { width: 7, height: 7, borderRadius: 4 },
  previewMacroValue: { color: NoFoco.ink, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  previewMacroLabel: { color: NoFoco.soft, fontSize: 11 },
  previewHint: { color: NoFoco.soft, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },

  disclaimer: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, color: NoFoco.soft, fontSize: 11, lineHeight: 16 },

  footer: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: NoFoco.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: NoFoco.hair,
  },
  cta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: NoFoco.onAccent, fontSize: 15, fontWeight: '800' },
});
