import { Redirect, withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from 'expo-router/js-top-tabs';

import { TabBar, type TabBarProps } from '@/components/tab-bar';
import { NoFoco } from '@/constants/theme';
import { useProfile } from '@/store/profile';

const { Navigator } = createMaterialTopTabNavigator();

/** Abas com gesto de arrastar (swipe) + slide fluido, integradas ao expo-router. */
const SwipeTabs = withLayoutContext(Navigator);

export default function TabsLayout() {
  const onboarded = useProfile((s) => s.onboarded);

  // primeira abertura: manda para o fluxo de configuração antes de mostrar as abas
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <SwipeTabs
      tabBarPosition="bottom"
      tabBar={(props: TabBarProps) => <TabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
        sceneStyle: { backgroundColor: NoFoco.bg },
      }}>
      <SwipeTabs.Screen name="index" options={{ title: 'Diário' }} />
      <SwipeTabs.Screen name="relatorios" options={{ title: 'Relatórios' }} />
      <SwipeTabs.Screen name="alimentos" options={{ title: 'Alimentos' }} />
      <SwipeTabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </SwipeTabs>
  );
}
