import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import type { PaceStatus } from '@/lib/pacing';

const STYLE: Record<PaceStatus, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  under: { color: NoFoco.protein, bg: 'rgba(74,157,224,0.12)', icon: 'trending-up-outline' },
  on: { color: NoFoco.accent, bg: 'rgba(166,224,82,0.12)', icon: 'checkmark-circle-outline' },
  over: { color: NoFoco.warning, bg: 'rgba(242,163,60,0.12)', icon: 'alert-circle-outline' },
  done: { color: NoFoco.accent, bg: 'rgba(166,224,82,0.14)', icon: 'trophy-outline' },
};

type Props = { status: PaceStatus; message: string; compact?: boolean };

/** Banner do "treinador": orientação de ritmo com cor por status. */
export function CoachBanner({ status, message, compact }: Props) {
  const s = STYLE[status];
  return (
    <View style={[styles.wrap, { backgroundColor: s.bg, borderColor: s.color }, compact && styles.compact]}>
      <Ionicons name={s.icon} size={compact ? 16 : 18} color={s.color} />
      <Text style={[styles.text, { color: s.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  compact: { paddingVertical: Spacing.sm },
  text: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
});
