import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { WeightChart } from '@/components/ui/weight-chart';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { addDays, formatDayTitle, isFuture, todayKey, type DayKey } from '@/lib/date';
import { useProfile } from '@/store/profile';
import { formatKg, latestWeight, parseKg, useWeight, weightSeries } from '@/store/weight';

/**
 * Bloco de evolução de peso: resumo, gráfico, registro de medição (inclusive em dia
 * passado) e lista das últimas. Autossuficiente — lê e escreve direto nos stores —
 * para poder viver na aba Relatórios sem depender da tela de Perfil.
 */
export function WeightEvolution() {
  const profile = useProfile((s) => s.profile);
  const setProfile = useProfile((s) => s.setProfile);
  const log = useWeight((s) => s.log);
  const setWeight = useWeight((s) => s.setWeight);
  const removeWeight = useWeight((s) => s.removeWeight);

  const [mDate, setMDate] = useState<DayKey>(todayKey());
  const [mText, setMText] = useState('');

  const series = weightSeries(log);
  const currentKg = latestWeight(log) ?? profile.weightKg;
  const first = series[0];
  const deltaTotal = series.length > 1 ? currentKg - first.kg : 0;

  /** Registra uma medição. Se for hoje, também atualiza o peso do perfil. */
  const logWeight = (day: DayKey, kg: number) => {
    if (kg <= 0) return;
    setWeight(day, kg);
    if (day === todayKey()) setProfile({ weightKg: kg });
  };

  const registerMeasurement = () => {
    const kg = parseKg(mText);
    if (kg <= 0) return;
    logWeight(mDate, kg);
    setMText('');
  };

  return (
    <View>
      <View style={styles.card}>
        {series.length === 0 ? (
          <Text style={styles.weightEmpty}>
            Registre seu peso de tempos em tempos para acompanhar a evolução aqui — dá até para lançar
            uma medição de um dia passado, se esqueceu de marcar.
          </Text>
        ) : (
          <>
            <View style={styles.weightSummary}>
              <WeightStat label="Início" value={`${formatKg(first.kg)} kg`} />
              <WeightStat label="Atual" value={`${formatKg(currentKg)} kg`} strong />
              {profile.targetWeightKg ? (
                <WeightStat label="Meta" value={`${formatKg(profile.targetWeightKg)} kg`} accent />
              ) : (
                <WeightStat
                  label="Variação"
                  value={`${deltaTotal > 0 ? '+' : ''}${formatKg(deltaTotal)} kg`}
                />
              )}
            </View>
            <WeightChart series={series} target={profile.targetWeightKg} />
            {series.length > 1 && (
              <Text style={styles.weightDelta}>
                {deltaTotal === 0
                  ? 'Sem variação no período registrado.'
                  : `${deltaTotal < 0 ? 'Você perdeu' : 'Você ganhou'} ${formatKg(Math.abs(deltaTotal))} kg desde a primeira medição.`}
              </Text>
            )}
          </>
        )}
      </View>

      {/* registrar medição (inclusive em dia passado) */}
      <View style={[styles.card, { marginTop: Spacing.md }]}>
        <Text style={styles.measureLabel}>Registrar medição</Text>
        <View style={styles.measureDate}>
          <Pressable onPress={() => setMDate((d) => addDays(d, -1))} hitSlop={8} style={styles.measureArrow}>
            <Ionicons name="chevron-back" size={16} color={NoFoco.soft} />
          </Pressable>
          <Text style={styles.measureDateText}>{formatDayTitle(mDate)}</Text>
          <Pressable
            onPress={() => setMDate((d) => (isFuture(addDays(d, 1)) ? d : addDays(d, 1)))}
            hitSlop={8}
            style={[styles.measureArrow, isFuture(addDays(mDate, 1)) && styles.measureArrowOff]}>
            <Ionicons name="chevron-forward" size={16} color={NoFoco.soft} />
          </Pressable>
        </View>
        <View style={styles.measureRow}>
          <View style={styles.measureInputWrap}>
            <TextInput
              value={mText}
              onChangeText={(t) => setMText(t.replace(/[^\d.,]/g, ''))}
              keyboardType="decimal-pad"
              placeholder={formatKg(currentKg)}
              placeholderTextColor={NoFoco.soft}
              style={styles.measureInput}
              maxLength={5}
            />
            <Text style={styles.unit}>kg</Text>
          </View>
          <Pressable
            onPress={registerMeasurement}
            disabled={parseKg(mText) <= 0}
            style={[styles.measureBtn, parseKg(mText) <= 0 && styles.measureBtnOff]}>
            <Text style={styles.measureBtnText}>Registrar</Text>
          </Pressable>
        </View>
      </View>

      {/* medições recentes */}
      {series.length > 0 && (
        <View style={[styles.card, { marginTop: Spacing.md }]}>
          {series
            .slice()
            .reverse()
            .slice(0, 8)
            .map((e, i) => (
              <View key={e.date} style={[styles.measureItem, i > 0 && styles.itemBorder]}>
                <Text style={styles.measureItemDate}>{formatDayTitle(e.date)}</Text>
                <Text style={styles.measureItemKg}>{formatKg(e.kg)} kg</Text>
                <Pressable onPress={() => removeWeight(e.date)} hitSlop={8} style={styles.measureTrash}>
                  <Ionicons name="trash-outline" size={16} color={NoFoco.soft} />
                </Pressable>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

function WeightStat({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.weightStat}>
      <Text
        style={[
          styles.weightStatValue,
          strong && { color: NoFoco.ink },
          accent && { color: NoFoco.accent },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.weightStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  unit: { color: NoFoco.soft, fontSize: 12, fontWeight: '600' },

  weightEmpty: { color: NoFoco.soft, fontSize: 12.5, lineHeight: 18, paddingVertical: Spacing.xs },
  weightSummary: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  weightStat: { flex: 1, alignItems: 'center' },
  weightStatValue: { color: NoFoco.soft, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  weightStatLabel: { color: NoFoco.soft, fontSize: 10, marginTop: 2 },
  weightDelta: { color: NoFoco.soft, fontSize: 11.5, marginTop: Spacing.sm, textAlign: 'center' },

  measureLabel: { color: NoFoco.ink, fontSize: 13, fontWeight: '700', marginBottom: Spacing.md },
  measureDate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  measureArrow: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  measureArrowOff: { opacity: 0.3 },
  measureDateText: { color: NoFoco.ink, fontSize: 12.5, fontWeight: '600' },
  measureRow: { flexDirection: 'row', gap: Spacing.sm },
  measureInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
  },
  measureInput: {
    flex: 1,
    color: NoFoco.ink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    paddingVertical: 11,
    fontVariant: ['tabular-nums'],
  },
  measureBtn: {
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  measureBtnOff: { opacity: 0.4 },
  measureBtnText: { color: NoFoco.onAccent, fontSize: 13, fontWeight: '800' },
  measureItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: NoFoco.faint },
  measureItemDate: { flex: 1, color: NoFoco.ink, fontSize: 13 },
  measureItemKg: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  measureTrash: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
