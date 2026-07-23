import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { NoFoco, Radius, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

/** Tela placeholder para funcionalidades ainda em construção. */
export function Placeholder({ title, icon, description }: Props) {
  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={34} color={NoFoco.accent} />
        </View>
        <Text style={styles.soon}>Em construção</Text>
        <Text style={styles.desc}>{description}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: Spacing.md },
  title: { color: NoFoco.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingBottom: 80 },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: Radius.pill,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soon: { color: NoFoco.ink, fontSize: 16, fontWeight: '700' },
  desc: { color: NoFoco.soft, fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
});
