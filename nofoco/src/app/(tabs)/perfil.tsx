import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { Screen } from '@/components/ui/screen';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { formatFullDate, todayKey, type DayKey } from '@/lib/date';
import { forecastToTarget, formatDuration } from '@/lib/forecast';
import {
  ACTIVITY,
  bmi,
  bmiClass,
  computeGoal,
  healthyWeightRange,
  OBJECTIVES,
  WEEKLY_RATES,
  type Activity,
  type Objective,
} from '@/lib/goal';
import { mealTarget } from '@/lib/pacing';
import { pctSum, useMeals } from '@/store/meals';
import { useProfile } from '@/store/profile';
import { formatKg, latestWeight, parseKg, useWeight } from '@/store/weight';

/** Formata kg no padrão brasileiro (0,42 kg). */
function kg(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Explica o ritmo previsto. Com ritmo fixo o déficit não muda e a marcha é constante;
 * no automático o ajuste é proporcional ao gasto, então perder desacelera e ganhar acelera.
 */
function forecastNote(f: { firstWeekKg: number; avgWeeklyKg: number }): string {
  const delta = f.firstWeekKg - f.avgWeeklyKg;
  if (Math.abs(delta) < 0.02) {
    return 'Ritmo constante do começo ao fim: como a velocidade está fixa, é a meta de calorias que acompanha seu gasto conforme o peso e a atividade mudam.';
  }
  if (delta > 0) {
    return `Estimativa que já considera seu metabolismo desacelerando conforme o peso cai — por isso as primeiras semanas rendem mais (${kg(f.firstWeekKg)} kg) que a média.`;
  }
  return `Estimativa que já considera seu gasto subindo junto com o peso — por isso as primeiras semanas rendem menos (${kg(f.firstWeekKg)} kg) que a média.`;
}

export default function PerfilScreen() {
  const profile = useProfile((s) => s.profile);
  const setProfile = useProfile((s) => s.setProfile);
  const meals = useMeals((s) => s.meals);
  const updateMeal = useMeals((s) => s.updateMeal);
  const resetMeals = useMeals((s) => s.resetMeals);
  const log = useWeight((s) => s.log);
  const setWeight = useWeight((s) => s.setWeight);

  // peso atual = última medição do histórico; sem histórico, o valor herdado do perfil
  const currentKg = latestWeight(log) ?? profile.weightKg;
  const effProfile = { ...profile, weightKg: currentKg };

  const goal = computeGoal(effProfile);
  const total = pctSum(meals);

  const forecast = forecastToTarget(effProfile);
  const targetBmi = profile.targetWeightKg
    ? bmi(profile.targetWeightKg, profile.heightCm)
    : null;
  const healthy = healthyWeightRange(profile.heightCm);
  const canPace = profile.objective !== 'manter';

  const num = (text: string) => {
    const n = parseInt(text.replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  /** Registra uma medição. Se for hoje, também atualiza o peso do perfil. */
  const logWeight = (day: DayKey, kg: number) => {
    if (kg <= 0) return;
    setWeight(day, kg);
    if (day === todayKey()) setProfile({ weightKg: kg });
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
          <Text style={styles.howText}>{OBJECTIVES[profile.objective].short}</Text>
        </View>
        <View style={styles.goalMacros}>
          <MacroPill value={`${goal.carb}g`} label="Carbo" color={NoFoco.carb} />
          <MacroPill value={`${goal.protein}g`} label="Proteína" color={NoFoco.protein} />
          <MacroPill value={`${goal.fat}g`} label="Gordura" color={NoFoco.fat} />
        </View>
      </View>

      {/* objetivo */}
      <CollapsibleSection title="Objetivo" summary={OBJECTIVES[profile.objective].label}>
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
      </CollapsibleSection>

      {/* dados */}
      <CollapsibleSection
        title="Seus dados"
        summary={`${profile.sex === 'M' ? 'M' : 'F'} · ${profile.age}a · ${profile.heightCm}cm · ${formatKg(currentKg)}kg`}>
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
        <WeightField
          label="Peso atual"
          valueKg={currentKg}
          onCommit={(kg) => logWeight(todayKey(), kg)}
          last
        />
      </View>
      </CollapsibleSection>

      {/* peso alvo + previsão */}
      <CollapsibleSection
        title="Peso alvo"
        summary={profile.targetWeightKg ? `${formatKg(profile.targetWeightKg)} kg` : 'não definido'}>
      <View style={styles.card}>
        <View style={styles.fieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Quero chegar em</Text>
            <Text style={styles.fieldHelp}>
              Faixa saudável para {profile.heightCm} cm: {healthy.min}–{healthy.max} kg
            </Text>
          </View>
          <View style={styles.fieldInputWrap}>
            <TextInput
              value={profile.targetWeightKg ? String(profile.targetWeightKg) : ''}
              onChangeText={(t) => {
                const n = num(t);
                setProfile({ targetWeightKg: n > 0 ? n : undefined });
              }}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={NoFoco.soft}
              style={styles.fieldInput}
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={styles.fieldUnit}>kg</Text>
          </View>
        </View>

        {forecast.kind === 'ok' && (
          <View style={styles.forecast}>
            <Text style={styles.forecastWeeks}>{formatDuration(forecast.weeks)}</Text>
            <Text style={styles.forecastDate}>
              chegaria por volta de {formatFullDate(forecast.date)}
            </Text>
            <Text style={styles.forecastSource}>
              {profile.weeklyRateKg
                ? `no ritmo de ${kg(profile.weeklyRateKg)} kg/semana que você definiu`
                : 'no ritmo que a sua meta atual produz'}
            </Text>
            <View style={styles.forecastRow}>
              <ForecastStat value={`${kg(forecast.avgWeeklyKg)} kg`} label="por semana (média)" />
              <ForecastStat value={`${forecast.weeks}`} label="semanas" />
              <ForecastStat
                value={`${kg(Math.abs(currentKg - (profile.targetWeightKg ?? 0)))} kg`}
                label="a percorrer"
              />
            </View>
            <Text style={styles.forecastNote}>{forecastNote(forecast)}</Text>
          </View>
        )}

        {forecast.kind === 'alcancado' && (
          <Text style={styles.forecastMsg}>Você já está no peso que definiu 🎯</Text>
        )}
        {forecast.kind === 'sentido-oposto' && (
          <Text style={styles.forecastMsg}>
            O objetivo “{OBJECTIVES[profile.objective].label}” leva o peso para o lado contrário do
            alvo. Ajuste um dos dois para ver a previsão.
          </Text>
        )}
        {forecast.kind === 'sem-ritmo' && (
          <Text style={styles.forecastMsg}>
            Na manutenção o peso tende a ficar estável. Escolha outro objetivo para ver uma previsão.
          </Text>
        )}
        {forecast.kind === 'muito-longo' && (
          <Text style={styles.forecastMsg}>
            Nesse ritmo levaria mais de 5 anos. Um ritmo um pouco maior deixa a meta mais palpável.
          </Text>
        )}
      </View>

      {targetBmi !== null && bmiClass(targetBmi) === 'abaixo' && (
        <View style={[styles.warn, { marginTop: Spacing.md }]}>
          <Ionicons name="alert-circle-outline" size={16} color={NoFoco.warning} />
          <Text style={styles.warnText}>
            Esse alvo fica abaixo da faixa de peso considerada saudável para a sua altura (IMC{' '}
            {targetBmi.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            ). Vale conversar com um nutricionista ou médico antes de seguir.
          </Text>
        </View>
      )}
      </CollapsibleSection>

      {/* ritmo */}
      {canPace && (
        <CollapsibleSection
          title="Ritmo"
          summary={profile.weeklyRateKg ? `${kg(profile.weeklyRateKg)} kg/sem` : 'Automático'}>
          <View style={styles.rateWrap}>
            <Pressable
              onPress={() => setProfile({ weeklyRateKg: undefined })}
              style={[styles.rateChip, !profile.weeklyRateKg && styles.chipOn]}>
              <Text style={[styles.chipText, !profile.weeklyRateKg && styles.chipTextOn]}>
                Automático
              </Text>
            </Pressable>
            {WEEKLY_RATES.map((r) => {
              const on = profile.weeklyRateKg === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setProfile({ weeklyRateKg: r })}
                  style={[styles.rateChip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {kg(r)} kg/sem
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            {profile.weeklyRateKg
              ? `Você fixou a velocidade, então a meta de calorias é que se ajusta: ${goal.kcal.toLocaleString('pt-BR')} kcal por dia. Mudar seu nível de atividade altera quanto você pode comer — não o tempo da previsão.`
              : `No automático a meta sai do ajuste do objetivo (${OBJECTIVES[profile.objective].short.toLowerCase()}), proporcional ao seu gasto. Aqui o nível de atividade encurta ou alonga a previsão.`}
          </Text>

          {goal.capped && (
            <View style={[styles.warn, { marginTop: Spacing.md }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={NoFoco.warning} />
              <Text style={styles.warnText}>
                Esse ritmo exigiria comer menos do que seu corpo gasta em repouso. A meta foi travada
                em {goal.floor.toLocaleString('pt-BR')} kcal e o ritmo real fica menor que o pedido.
              </Text>
            </View>
          )}
        </CollapsibleSection>
      )}

      {/* atividade */}
      <CollapsibleSection title="Nível de atividade" summary={ACTIVITY[profile.activity].label}>
        <View style={styles.actWrap}>
          {(Object.keys(ACTIVITY) as Activity[]).map((k) => {
            const on = profile.activity === k;
            return (
              <Pressable
                key={k}
                onPress={() => setProfile({ activity: k })}
                style={[styles.actChip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{ACTIVITY[k].label}</Text>
              </Pressable>
            );
          })}
        </View>
      </CollapsibleSection>

      {/* distribuição por refeição */}
      <CollapsibleSection
        title="Distribuição por refeição"
        summary={`${meals.length} ${meals.length === 1 ? 'refeição' : 'refeições'}`}>
        <Text style={styles.reset} onPress={resetMeals}>
          Restaurar padrão
        </Text>
      <View style={styles.card}>
        {meals.map((m, i) => (
          <View key={m.id} style={[styles.splitRow, i > 0 && styles.splitBorder]}>
            <Text style={styles.splitEmoji}>{m.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.splitName}>{m.name}</Text>
              <Text style={styles.splitKcal}>
                {m.time} · {mealTarget(goal.kcal, meals, m.id)} kcal
              </Text>
            </View>
            <View style={styles.pctStepper}>
              <Text
                style={styles.pctBtn}
                onPress={() => updateMeal(m.id, { pct: Math.max(0, m.pct - 5) })}>
                −
              </Text>
              <Text style={styles.pctValue}>{m.pct}%</Text>
              <Text
                style={styles.pctBtn}
                onPress={() => updateMeal(m.id, { pct: Math.min(100, m.pct + 5) })}>
                +
              </Text>
            </View>
          </View>
        ))}
        {meals.length === 0 ? (
          <View style={styles.splitRow}>
            <Text style={styles.splitKcal}>Nenhuma refeição criada ainda.</Text>
          </View>
        ) : (
          <View style={[styles.splitRow, styles.splitBorder, { justifyContent: 'space-between' }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, total !== 100 && { color: NoFoco.warning }]}>{total}%</Text>
          </View>
        )}
      </View>
      <Text style={styles.hint}>
        {total !== 100 && meals.length > 0
          ? 'A soma não é 100% — tudo bem, o app distribui proporcionalmente, mas 100% fica mais preciso. '
          : ''}
        Para criar, renomear ou excluir refeições, use “Editar” na lista de refeições do Diário.
      </Text>
      </CollapsibleSection>

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

/** Campo de peso: aceita decimal (78,5) e mantém o texto enquanto se digita a vírgula. */
function WeightField({
  label,
  valueKg,
  onCommit,
  last,
}: {
  label: string;
  valueKg: number;
  onCommit: (kg: number) => void;
  last?: boolean;
}) {
  const [text, setText] = useState(formatKg(valueKg));
  return (
    <View style={[styles.fieldRow, !last && styles.fieldBorder]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            const cleaned = t.replace(/[^\d.,]/g, '');
            setText(cleaned);
            const kg = parseKg(cleaned);
            if (kg > 0) onCommit(kg);
          }}
          keyboardType="decimal-pad"
          style={styles.fieldInput}
          maxLength={5}
          selectTextOnFocus
        />
        <Text style={styles.fieldUnit}>kg</Text>
      </View>
    </View>
  );
}

function ForecastStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.forecastStat}>
      <Text style={styles.forecastStatValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.forecastStatLabel}>{label}</Text>
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
  fieldHelp: { color: NoFoco.soft, fontSize: 11, marginTop: 2 },

  forecast: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: NoFoco.faint, paddingVertical: Spacing.md },
  forecastWeeks: { color: NoFoco.accent, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  forecastDate: { color: NoFoco.soft, fontSize: 12, marginTop: 1 },
  forecastSource: { color: NoFoco.soft, fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  forecastRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  forecastStat: {
    flex: 1,
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  forecastStatValue: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  forecastStatLabel: { color: NoFoco.soft, fontSize: 10, marginTop: 2, textAlign: 'center' },
  forecastNote: { color: NoFoco.soft, fontSize: 11, lineHeight: 16, marginTop: Spacing.md },
  forecastMsg: {
    color: NoFoco.soft,
    fontSize: 12.5,
    lineHeight: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: NoFoco.faint,
    paddingVertical: Spacing.md,
  },


  warn: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(242,163,60,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.warning,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  warnText: { flex: 1, color: NoFoco.warning, fontSize: 11.5, lineHeight: 16 },

  rateWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rateChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: NoFoco.surface,
  },
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
