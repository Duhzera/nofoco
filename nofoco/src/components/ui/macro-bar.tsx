import { StyleSheet, Text, View } from 'react-native';

import { NoFoco, Radius } from '@/constants/theme';

type Props = {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  unit?: string;
};

/**
 * Barra de macronutriente em pilha vertical (rótulo → valor → barra).
 * Layout responsivo: cabe em colunas estreitas sem quebrar o texto.
 */
export function MacroBar({ label, consumed, goal, color, unit = 'g' }: Props) {
  const fraction = Math.max(0, Math.min(1, goal > 0 ? consumed / goal : 0));
  return (
    <View style={styles.wrap}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {consumed}/{goal}
        {unit}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: 0 },
  label: { color: NoFoco.ink, fontSize: 12, fontWeight: '700' },
  value: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 6,
    fontVariant: ['tabular-nums'],
  },
  track: { height: 6, borderRadius: Radius.sm, backgroundColor: NoFoco.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.sm },
});
