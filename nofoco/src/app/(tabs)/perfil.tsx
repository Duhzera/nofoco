import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { ACTIVITY, computeGoal, OBJECTIVES, type Activity, type Objective } from '@/lib/goal';
import { mealTarget } from '@/lib/pacing';
import { MEALS } from '@/store/diary';
import { splitSum, useProfile } from '@/store/profile';

export default function PerfilScreen() {
  const profile = useProfile((s) => s.profile);
  const split = useProfile((s) => s.split);
  const setProfile = useProfile((s) => s.setProfile);
  const setSplit = useProfile((s) => s.setSplit);
  const resetSplit = useProfile((s) => s.resetSplit);

  const goal = computeGoal(profile);
  const total = splitSum(split);

  const num = (text: string) => {
    const n = parseInt(text.replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      {/* meta calculada */}
      <View style={styles.goalCard}>
        <Text style={styles.goalLabel}>Sua meta diária</Text>
        <Text style={styles.goalKcal}>{goal.kcal.toLocaleString('pt-BR')}</Text>
        <Text style={styles.goalUnit}>kcal / dia</Text>
        <View style={styles.how}>
          <Text style={styles.howText}>
            TMB {goal.tmb.toLocaleString('pt-BR')} · TDEE {goal.tdee.toLocaleString('pt-BR')} ·{' '}
            {OBJECTIVES[profile.objective].short}
          </Text>
        </View>
        <View style={styles.goalMacros}>
          <MacroPill value={`${goal.carb}g`} label="Carbo" color={NoFoco.carb} />
          <MacroPill value={`${goal.protein}g`} label="Proteína" color={NoFoco.protein} />
          <MacroPill value={`${goal.fat}g`} label="Gordura" color={NoFoco.fat} />
        </View>
      </View>

      {/* objetivo */}
      <Text style={styles.section}>Objetivo</Text>
      <View style={styles.objGrid}>
        {(Object.keys(OBJECTIVES) as Objective[]).map((k) => {
          const on = profile.objective === k;
          return (
            <Pressable
              key={k}
              onPress={() => setProfile({ objective: k })}
              style={[styles.objChip, on && styles.objOn]}>
              <Text style={[styles.objText, on && styles.objTextOn]}>{OBJECTIVES[k].label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* dados */}
      <Text style={styles.section}>Seus dados</Text>
      <View style={styles.card}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Sexo</Text>
          <View style={styles.chips}>
            {(['M', 'F'] as const).map((sx) => (
              <Pressable
                key={sx}
                onPress={() => setProfile({ sex: sx })}
                style={[styles.chip, profile.sex === sx && styles.chipOn]}>
                <Text style={[styles.chipText, profile.sex === sx && styles.chipTextOn]}>
                  {sx === 'M' ? 'Masculino' : 'Feminino'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Field label="Idade" unit="anos" value={profile.age} onChange={(t) => setProfile({ age: num(t) })} />
        <Field label="Altura" unit="cm" value={profile.heightCm} onChange={(t) => setProfile({ heightCm: num(t) })} />
        <Field label="Peso" unit="kg" value={profile.weightKg} onChange={(t) => setProfile({ weightKg: num(t) })} last />
      </View>

      {/* atividade */}
      <Text style={styles.section}>Nível de atividade</Text>
      <View style={styles.actWrap}>
        {(Object.keys(ACTIVITY) as Activity[]).map((k) => {
          const on = profile.activity === k;
          return (
            <Pressable
              key={k}
              onPress={() => setProfile({ activity: k })}
              style={[styles.actChip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {ACTIVITY[k].label} ×{ACTIVITY[k].factor}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* distribuição por refeição */}
      <View style={styles.splitHeader}>
        <Text style={styles.section}>Distribuição por refeição</Text>
        <Text style={styles.reset} onPress={resetSplit}>
          Restaurar padrão
        </Text>
      </View>
      <View style={styles.card}>
        {MEALS.map((m, i) => (
          <View key={m.key} style={[styles.splitRow, i > 0 && styles.splitBorder]}>
            <Text style={styles.splitEmoji}>{m.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.splitName}>{m.name}</Text>
              <Text style={styles.splitKcal}>{mealTarget(goal.kcal, split, m.key)} kcal</Text>
            </View>
            <View style={styles.pctStepper}>
              <Text style={styles.pctBtn} onPress={() => setSplit(m.key, (split[m.key] ?? 0) - 5)}>
                −
              </Text>
              <Text style={styles.pctValue}>{split[m.key] ?? 0}%</Text>
              <Text style={styles.pctBtn} onPress={() => setSplit(m.key, (split[m.key] ?? 0) + 5)}>
                +
              </Text>
            </View>
          </View>
        ))}
        <View style={[styles.splitRow, styles.splitBorder, { justifyContent: 'space-between' }]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalValue, total !== 100 && { color: NoFoco.warning }]}>{total}%</Text>
        </View>
      </View>
      {total !== 100 && (
        <Text style={styles.hint}>
          A soma não é 100% — tudo bem, o app distribui proporcionalmente, mas 100% fica mais preciso.
        </Text>
      )}

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={16} color={NoFoco.soft} />
        <Text style={styles.disclaimerText}>
          Estimativas informativas (Mifflin-St Jeor). Não substituem acompanhamento de nutricionista ou médico.
        </Text>
      </View>
    </Screen>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
  last,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (t: string) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          value={String(value)}
          onChangeText={onChange}
          keyboardType="number-pad"
          style={styles.fieldInput}
          maxLength={3}
          selectTextOnFocus
        />
        <Text style={styles.fieldUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function MacroPill({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.macroPill}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroPillValue}>{value}</Text>
      <Text style={styles.macroPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: Spacing.md },
  title: { color: NoFoco.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  goalCard: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  goalLabel: { color: NoFoco.soft, fontSize: 12, fontWeight: '600' },
  goalKcal: { color: NoFoco.ink, fontSize: 40, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  goalUnit: { color: NoFoco.soft, fontSize: 12, marginTop: -2 },
  how: { backgroundColor: NoFoco.surface2, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 5, marginTop: Spacing.sm },
  howText: { color: NoFoco.soft, fontSize: 10.5, fontVariant: ['tabular-nums'] },
  goalMacros: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  macroPill: { alignItems: 'center', flexDirection: 'row', gap: 5, backgroundColor: NoFoco.surface2, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  macroDot: { width: 7, height: 7, borderRadius: 4 },
  macroPillValue: { color: NoFoco.ink, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  macroPillLabel: { color: NoFoco.soft, fontSize: 11 },

  section: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  objGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  objChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: NoFoco.surface,
  },
  objOn: { backgroundColor: 'rgba(166,224,82,0.1)', borderColor: NoFoco.accent },
  objText: { color: NoFoco.soft, fontSize: 12, fontWeight: '700' },
  objTextOn: { color: NoFoco.accent },

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
    minWidth: 44,
    textAlign: 'right',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  fieldUnit: { color: NoFoco.soft, fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
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

  actWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: NoFoco.surface,
  },

  splitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  reset: { color: NoFoco.accent, fontSize: 11.5, fontWeight: '700', marginBottom: Spacing.sm },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  splitBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: NoFoco.faint },
  splitEmoji: { fontSize: 18 },
  splitName: { color: NoFoco.ink, fontSize: 13, fontWeight: '600' },
  splitKcal: { color: NoFoco.soft, fontSize: 11, marginTop: 1, fontVariant: ['tabular-nums'] },
  pctStepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: NoFoco.surface2, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 4 },
  pctBtn: { color: NoFoco.accent, fontSize: 18, fontWeight: '700', width: 24, textAlign: 'center' },
  pctValue: { color: NoFoco.ink, fontSize: 13, fontWeight: '800', minWidth: 38, textAlign: 'center', fontVariant: ['tabular-nums'] },
  totalLabel: { color: NoFoco.soft, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { color: NoFoco.ink, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hint: { color: NoFoco.soft, fontSize: 11, lineHeight: 15, marginTop: Spacing.sm },

  disclaimer: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, backgroundColor: NoFoco.surface, borderRadius: Radius.md, padding: Spacing.md },
  disclaimerText: { flex: 1, color: NoFoco.soft, fontSize: 11, lineHeight: 16 },
});
