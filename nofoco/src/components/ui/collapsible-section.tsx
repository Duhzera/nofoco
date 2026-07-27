import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NoFoco, Radius, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  /** Valor atual mostrado à direita quando a seção está fechada (ex.: "Perder peso"). */
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Seção retrátil do Perfil. Fechada, mostra só título + resumo — assim a tela vira
 * uma lista curta e escaneável, e a pessoa abre só o que quer mexer.
 */
export function CollapsibleSection({ title, summary, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.header, open && styles.headerOpen]}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.right}>
          {!open && !!summary && (
            <Text style={styles.summary} numberOfLines={1}>
              {summary}
            </Text>
          )}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={NoFoco.soft} />
        </View>
      </Pressable>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerOpen: { backgroundColor: NoFoco.surface2 },
  title: { color: NoFoco.ink, fontSize: 13, fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
  summary: {
    color: NoFoco.soft,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  body: { marginTop: Spacing.sm },
});
