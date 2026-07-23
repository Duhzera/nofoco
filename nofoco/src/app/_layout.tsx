import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NoFoco } from '@/constants/theme';

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
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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
          <Stack.Screen
            name="adicionar"
            options={{ presentation: 'modal', title: 'Adicionar alimento' }}
          />
          <Stack.Screen name="pesquisar" options={{ title: 'Pesquisar' }} />
          <Stack.Screen name="porcao" options={{ title: 'Porção' }} />
          <Stack.Screen name="refeicao" options={{ title: 'Refeição' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
