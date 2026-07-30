import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/services/supabase';
import { signIn, signOut, signUp, useAuth } from '@/store/auth';
import { useSync } from '@/store/sync';

type Mode = 'entrar' | 'criar';

/** "há 3 min", "agora" — resumo curto do último sync. */
function agoLabel(ts: number | null): string {
  if (!ts) return 'ainda não sincronizado';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'sincronizado agora';
  const m = Math.round(s / 60);
  if (m < 60) return `sincronizado há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `sincronizado há ${h} h`;
  return `sincronizado há ${Math.round(h / 24)} d`;
}

/** Tela de conta: login/cadastro por e-mail e senha. A conta é opcional. */
export default function ContaScreen() {
  const user = useAuth((s) => s.user);
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const syncStatus = useSync((s) => s.status);
  const lastSyncAt = useSync((s) => s.lastSyncAt);
  const syncError = useSync((s) => s.error);
  const syncNow = useSync((s) => s.syncNow);
  const restore = useSync((s) => s.restore);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const syncing = syncStatus === 'syncing';
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = mode === 'entrar' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Algo deu errado.');
      return;
    }
    if (mode === 'criar') {
      // com confirmação de e-mail ligada, a sessão só vem após o clique no link
      if (!useAuth.getState().user) {
        setInfo('Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.');
        setMode('entrar');
        return;
      }
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</Text>
          <Text style={styles.sub}>Para salvar e sincronizar seus dados na nuvem.</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={NoFoco.ink} />
        </Pressable>
      </View>

      {user ? (
        <>
          <View style={styles.card}>
            <Text style={styles.loggedLabel}>Você está conectado como</Text>
            <Text style={styles.loggedEmail}>{user.email}</Text>
          </View>

          <View style={[styles.card, { marginTop: Spacing.md }]}>
            <View style={styles.syncRow}>
              <Ionicons
                name={syncStatus === 'error' ? 'cloud-offline-outline' : syncing ? 'sync-outline' : 'cloud-done-outline'}
                size={18}
                color={syncStatus === 'error' ? NoFoco.danger : NoFoco.accent}
              />
              <Text style={styles.syncStatus}>
                {syncing ? 'Sincronizando…' : agoLabel(lastSyncAt)}
              </Text>
            </View>
            {!!syncError && <Text style={styles.error}>{syncError}</Text>}

            <View style={styles.syncActions}>
              <Pressable style={[styles.syncBtn, styles.syncBtnPrimary]} disabled={syncing} onPress={syncNow}>
                <Ionicons name="cloud-upload-outline" size={16} color={NoFoco.onAccent} />
                <Text style={styles.syncBtnPrimaryText}>Sincronizar agora</Text>
              </Pressable>
              <Pressable style={styles.syncBtn} disabled={syncing} onPress={() => setConfirmRestore(true)}>
                <Ionicons name="cloud-download-outline" size={16} color={NoFoco.ink} />
                <Text style={styles.syncBtnText}>Restaurar</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.signOut} onPress={() => signOut()}>
            <Text style={styles.signOutText}>Sair da conta</Text>
          </Pressable>

          <ConfirmDialog
            visible={confirmRestore}
            title="Restaurar do backup?"
            message="Isto substitui os dados deste aparelho pela versão salva na nuvem. O que estiver só aqui e não tiver subido será perdido."
            confirmLabel="Restaurar"
            onConfirm={() => {
              setConfirmRestore(false);
              void restore();
            }}
            onCancel={() => setConfirmRestore(false)}
          />
        </>
      ) : !isSupabaseConfigured ? (
        <View style={styles.card}>
          <Text style={styles.warn}>
            O backend ainda não está configurado. Preencha a chave anon em `.env.local` e reinicie o app
            com `--clear` para ativar a conta.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              placeholderTextColor={NoFoco.soft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              style={styles.input}
            />
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="ao menos 6 caracteres"
              placeholderTextColor={NoFoco.soft}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!info && <Text style={styles.info}>{info}</Text>}

          <Pressable onPress={submit} disabled={!valid || busy} style={[styles.cta, (!valid || busy) && styles.ctaOff]}>
            {busy ? (
              <ActivityIndicator color={NoFoco.onAccent} />
            ) : (
              <Text style={styles.ctaText}>{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === 'entrar' ? 'criar' : 'entrar');
              setError(null);
              setInfo(null);
            }}
            style={styles.switch}>
            <Text style={styles.switchText}>
              {mode === 'entrar' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
            </Text>
          </Pressable>
        </>
      )}

      <Text style={styles.note}>
        Seus dados continuam funcionando no aparelho mesmo sem conta. A conta serve para backup e usar em
        mais de um dispositivo.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.md, gap: Spacing.md },
  title: { color: NoFoco.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: NoFoco.soft, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  close: { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: NoFoco.surface2, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  fieldLabel: { color: NoFoco.soft, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { color: NoFoco.ink, fontSize: 16, fontWeight: '600', paddingVertical: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: NoFoco.faint, marginVertical: Spacing.sm },

  loggedLabel: { color: NoFoco.soft, fontSize: 12 },
  loggedEmail: { color: NoFoco.ink, fontSize: 16, fontWeight: '700', marginTop: 4 },
  warn: { color: NoFoco.warning, fontSize: 12.5, lineHeight: 18 },

  syncRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  syncStatus: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '600' },
  syncActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: 12,
    backgroundColor: NoFoco.surface2,
  },
  syncBtnText: { color: NoFoco.ink, fontSize: 13, fontWeight: '700' },
  syncBtnPrimary: { backgroundColor: NoFoco.accent },
  syncBtnPrimaryText: { color: NoFoco.onAccent, fontSize: 13, fontWeight: '800' },
  signOut: { alignItems: 'center', paddingVertical: Spacing.lg, marginTop: Spacing.sm },
  signOutText: { color: NoFoco.danger, fontSize: 13.5, fontWeight: '700' },

  error: { color: NoFoco.danger, fontSize: 12.5, marginTop: Spacing.md, lineHeight: 17 },
  info: { color: NoFoco.accent, fontSize: 12.5, marginTop: Spacing.md, lineHeight: 17 },

  cta: {
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    minHeight: 50,
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: NoFoco.onAccent, fontSize: 15, fontWeight: '800' },
  switch: { alignItems: 'center', paddingVertical: Spacing.md },
  switchText: { color: NoFoco.accent, fontSize: 13, fontWeight: '700' },
  note: { color: NoFoco.soft, fontSize: 11, lineHeight: 16, marginTop: 'auto', paddingVertical: Spacing.lg },
});
