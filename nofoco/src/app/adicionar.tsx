import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';

type Mode = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  route?: string;
  soon?: boolean;
};

const MODES: Mode[] = [
  { icon: 'search-outline', title: 'Pesquisar', desc: 'Busque por nome, ex.: pão de queijo', route: '/pesquisar' },
  { icon: 'barcode-outline', title: 'Escanear', desc: 'Leia o código de barras do produto', soon: true },
  { icon: 'camera-outline', title: 'Foto (IA)', desc: 'Fotografe o prato e estime os macros', soon: true },
];

export default function AdicionarModal() {
  // meal/voltarPara chegam quando o modal é aberto de dentro de uma refeição;
  // são repassados adiante para o item cair na refeição certa e voltar para ela.
  const { meal, voltarPara } = useLocalSearchParams<{ meal?: string; voltarPara?: string }>();

  const openPesquisar = () =>
    router.push({
      pathname: '/pesquisar',
      params: { ...(meal ? { meal } : {}), ...(voltarPara ? { voltarPara } : {}) },
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Adicionar alimento</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={NoFoco.ink} />
        </Pressable>
      </View>

      <Text style={styles.hint}>Como você quer registrar?</Text>

      <View style={{ gap: Spacing.md }}>
        {MODES.map((m) => (
          <Pressable
            key={m.title}
            disabled={m.soon}
            style={[styles.mode, m.soon && styles.modeSoon]}
            onPress={() => m.route === '/pesquisar' && openPesquisar()}>
            <View style={styles.modeIcon}>
              <Ionicons name={m.icon} size={24} color={m.soon ? NoFoco.soft : NoFoco.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.modeTitle}>{m.title}</Text>
                {m.soon && (
                  <View style={styles.soonBadge}>
                    <Text style={styles.soonText}>Em breve</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </View>
            {!m.soon && <Ionicons name="chevron-forward" size={20} color={NoFoco.soft} />}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  title: { color: NoFoco.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  close: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { color: NoFoco.soft, fontSize: 13, marginBottom: Spacing.lg },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: NoFoco.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    padding: Spacing.lg,
  },
  modeSoon: { opacity: 0.55 },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  soonBadge: {
    backgroundColor: NoFoco.surface2,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  soonText: { color: NoFoco.soft, fontSize: 10, fontWeight: '700' },
  modeIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: { color: NoFoco.ink, fontSize: 15, fontWeight: '700' },
  modeDesc: { color: NoFoco.soft, fontSize: 12, marginTop: 2 },
});
