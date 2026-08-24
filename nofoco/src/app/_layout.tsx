import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NoFoco } from '@/constants/theme';
import { useProfile } from '@/store/profile';
import '@/store/sync'; // ativa a sincronização (escuta login + auto-push)

SplashScreen.preventAutoHideAsync();

const NoFocoNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: NoFoco.bg,
    card: NoFoco.surface,
    text: NoFoco.ink,
    border: NoFoco.hair,
    primary: NoFoco.accent,
    notification: NoFoco.accent,
  },
};

export default function RootLayout() {
  const hasHydrated = useProfile((s) => s.hasHydrated);

  // segura o splash até a persistência carregar — assim o gate de onboarding
  // (em (tabs)/_layout) decide já com o valor real, sem piscar o Diário antes.
  useEffect(() => {
    if (hasHydrated) SplashScreen.hideAsync();
  }, [hasHydrated]);

  if (!hasHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: NoFoco.bg }}>
      <ThemeProvider value={NoFocoNavTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: NoFoco.bg },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="conta" options={{ presentation: 'modal', title: 'Conta' }} />
          <Stack.Screen
            name="adicionar"
            options={{ presentation: 'modal', title: 'Adicionar alimento' }}
          />
          <Stack.Screen name="pesquisar" options={{ title: 'Pesquisar' }} />
          <Stack.Screen name="foto" options={{ title: 'Foto (IA)' }} />
          <Stack.Screen name="escanear" options={{ title: 'Escanear', animation: 'fade' }} />
          <Stack.Screen name="porcao" options={{ title: 'Porção' }} />
          <Stack.Screen name="refeicao" options={{ title: 'Refeição' }} />
          <Stack.Screen
            name="refeicao-editar"
            options={{ presentation: 'modal', title: 'Refeição' }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
