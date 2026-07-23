import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { NoFoco, Radius, Spacing } from '@/constants/theme';

type Props = { children: ReactNode; style?: ViewStyle };

/** Superfície padrão do NoFoco: card escuro com borda hairline. */
export function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NoFoco.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    padding: Spacing.lg,
  },
});
