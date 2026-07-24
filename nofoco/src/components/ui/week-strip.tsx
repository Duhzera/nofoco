import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import {
  dayNumber,
  formatWeekRange,
  isFuture,
  isToday,
  weekdayInitial,
  weekDays,
  type DayKey,
} from '@/lib/date';

type Props = {
  selected: DayKey;
  onSelect: (day: DayKey) => void;
  onShiftWeek: (weeks: number) => void;
  /** Dias que já têm algo lançado — ganham um ponto embaixo. */
  registered?: Set<DayKey>;
};

/**
 * Tira de dias da semana (segunda a domingo), navegável.
 *
 * O dia selecionado fica preenchido; "hoje" aparece contornado quando não é o
 * selecionado, para não se perder de vista ao navegar pelo passado.
 */
export function WeekStrip({ selected, onSelect, onShiftWeek, registered }: Props) {
  const days = weekDays(selected);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => onShiftWeek(-1)} hitSlop={10} style={styles.arrow}>
          <Ionicons name="chevron-back" size={16} color={NoFoco.soft} />
        </Pressable>
        <Text style={styles.range}>{formatWeekRange(selected)}</Text>
        <Pressable onPress={() => onShiftWeek(1)} hitSlop={10} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={16} color={NoFoco.soft} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {days.map((day) => {
          const on = day === selected;
          const today = isToday(day);
          const future = isFuture(day);
          return (
            <Pressable
              key={day}
              style={styles.day}
              onPress={() => onSelect(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}>
              <Text style={[styles.letter, on && { color: NoFoco.accent }]}>
                {weekdayInitial(day)}
              </Text>
              <View
                style={[
                  styles.num,
                  on && styles.numOn,
                  !on && today && styles.numToday,
                ]}>
                <Text
                  style={[
                    styles.numText,
                    on && { color: NoFoco.onAccent },
                    future && !on && styles.numTextFuture,
                  ]}>
                  {dayNumber(day)}
                </Text>
              </View>
              <View style={[styles.dot, registered?.has(day) && !on && styles.dotOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  range: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    minWidth: 96,
    textAlign: 'center',
  },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 5, flex: 1 },
  letter: { color: NoFoco.soft, fontSize: 11, fontWeight: '600' },
  num: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numOn: { backgroundColor: NoFoco.accent },
  numToday: { borderWidth: 1, borderColor: NoFoco.accent },
  numText: { color: NoFoco.ink, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numTextFuture: { color: NoFoco.soft },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: NoFoco.soft },
});
