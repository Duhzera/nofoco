import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoFoco, Radius } from '@/constants/theme';

/** Subconjunto estrutural das props que o expo-router passa ao tabBar. */
export type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

type TabMeta = { label: string; icon: keyof typeof Ionicons.glyphMap };

const TABS: Record<string, TabMeta> = {
  index: { label: 'Diário', icon: 'today-outline' },
  relatorios: { label: 'Relatórios', icon: 'stats-chart-outline' },
  alimentos: { label: 'Alimentos', icon: 'grid-outline' },
  perfil: { label: 'Perfil', icon: 'person-outline' },
};

/**
 * Tab bar do NoFoco: 4 abas com um FAB "+" central elevado que abre
 * o fluxo de adicionar alimento (escanear / pesquisar / foto).
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const mid = Math.ceil(routes.length / 2);
  const left = routes.slice(0, mid);
  const right = routes.slice(mid);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    const meta = TABS[route.name] ?? { label: route.name, icon: 'ellipse-outline' as const };

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <Pressable key={route.key} style={styles.tab} onPress={onPress} hitSlop={8}>
        <Ionicons name={meta.icon} size={22} color={focused ? NoFoco.accent : NoFoco.soft} />
        <Text style={[styles.label, { color: focused ? NoFoco.accent : NoFoco.soft }]}>{meta.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.side}>{left.map(renderTab)}</View>

      <Pressable style={styles.fab} onPress={() => router.push('/adicionar')} hitSlop={10}>
        <Ionicons name="add" size={30} color={NoFoco.onAccent} />
      </Pressable>

      <View style={styles.side}>{right.map(renderTab)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: NoFoco.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: NoFoco.hair,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  side: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  tab: { alignItems: 'center', gap: 3, minWidth: 56 },
  label: { fontSize: 10, fontWeight: '600' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: NoFoco.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    marginHorizontal: 6,
    shadowColor: NoFoco.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
