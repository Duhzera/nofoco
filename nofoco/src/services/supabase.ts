/**
 * Cliente Supabase (backend). Lê a URL e a chave `anon` pública das variáveis
 * `EXPO_PUBLIC_SUPABASE_*` (ver .env.local). A chave anon é pública de propósito —
 * a proteção real são as políticas de Row Level Security no banco. A service_role
 * (secreta) NUNCA entra aqui.
 *
 * Se as variáveis não estiverem definidas, `supabase` é `null` e o app segue
 * funcionando 100% local — a conta/sync é opcional, não trava o uso offline.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * O Expo Router pré-renderiza o web no Node (server render). Lá não existe `window`,
 * e o storage de auth do Supabase o acessa — criar o cliente nesse momento derruba o
 * processo com "window is not defined". Então no web só criamos o cliente no navegador
 * (quando `window` existe). No device isso não se aplica (Platform.OS !== 'web').
 */
const isWebServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase: SupabaseClient | null =
  isSupabaseConfigured && !isWebServer
    ? createClient(url as string, anonKey as string, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
