import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { todayKey } from '@/lib/date';
import { isSupabaseConfigured } from '@/services/supabase';
import {
  deleteUserAccount,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  useAuth,
} from '@/store/auth';
import { useDiary } from '@/store/diary';
import { useFavorites } from '@/store/favorites';
import { useMeals } from '@/store/meals';
import { useProfile } from '@/store/profile';
import { useRecipes } from '@/store/recipes';
import { useSync } from '@/store/sync';
import { useWeight } from '@/store/weight';

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

/** Tela de conta: login com Google, e-mail/senha, privacidade e direitos LGPD. */
export default function ContaScreen() {
  const user = useAuth((s) => s.user);
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const syncStatus = useSync((s) => s.status);
  const lastSyncAt = useSync((s) => s.lastSyncAt);
  const syncError = useSync((s) => s.error);
  const syncNow = useSync((s) => s.syncNow);
  const restore = useSync((s) => s.restore);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      if (!useAuth.getState().user) {
        setInfo('Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.');
        setMode('entrar');
        return;
      }
    }
    router.back();
  };

  const handleGoogleLogin = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    setError(null);
    setInfo(null);
    const res = await signInWithGoogle();
    setGoogleBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível conectar com o Google.');
      return;
    }
    if (useAuth.getState().user) {
      router.back();
    }
  };

  /** Portabilidade de dados (Art. 18 LGPD) */
  const exportData = async () => {
    try {
      const data = {
        app: 'NoFoco',
        exportDate: new Date().toISOString(),
        userEmail: user?.email ?? 'anonimo',
        profile: useProfile.getState().profile,
        meals: useMeals.getState().meals,
        weightLog: useWeight.getState().log,
        diary: useDiary.getState().days,
        recipes: useRecipes.getState().recipes,
        favorites: useFavorites.getState().favorites,
      };

      const jsonStr = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nofoco-meus-dados-${todayKey()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setInfo('Arquivo de dados exportado com sucesso!');
      } else {
        await Share.share({
          title: 'Exportação de Dados NoFoco',
          message: jsonStr,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao exportar dados.';
      setError(msg);
    }
  };

  /** Exclusão definitiva de conta e dados (Direito ao esquecimento LGPD) */
  const handleDeleteAccount = async () => {
    setDeleting(true);
    setConfirmDelete(false);
    setError(null);
    const res = await deleteUserAccount();
    setDeleting(false);
    if (res.ok) {
      setInfo('Sua conta e todos os seus dados foram permanentemente excluídos.');
    } else {
      setError(res.error ?? 'Não foi possível concluir a exclusão.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {user ? 'Minha Conta' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </Text>
          <Text style={styles.sub}>
            {user ? 'Gerencie seus dados e sincronização na nuvem.' : 'Para salvar e sincronizar seus dados na nuvem.'}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={NoFoco.ink} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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

            {/* Privacidade e Direitos LGPD */}
            <View style={[styles.card, { marginTop: Spacing.md }]}>
              <Text style={styles.cardSectionTitle}>Privacidade e Seus Dados (LGPD)</Text>

              <Pressable style={styles.privacyRow} onPress={exportData}>
                <Ionicons name="download-outline" size={18} color={NoFoco.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyRowTitle}>Exportar meus dados (JSON)</Text>
                  <Text style={styles.privacyRowDesc}>Baixe uma cópia de todo o seu histórico e pesagens.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={NoFoco.soft} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable style={styles.privacyRow} onPress={() => router.push('/privacidade')}>
                <Ionicons name="shield-checkmark-outline" size={18} color={NoFoco.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyRowTitle}>Termos & Política de Privacidade</Text>
                  <Text style={styles.privacyRowDesc}>Entenda como tratamos seus dados sensíveis com segurança.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={NoFoco.soft} />
              </Pressable>
            </View>

            {!!info && <Text style={styles.info}>{info}</Text>}
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.signOut} onPress={() => signOut()}>
              <Text style={styles.signOutText}>Sair da conta</Text>
            </Pressable>

            {/* Exclusão Definitiva de Conta */}
            <Pressable
              style={styles.deleteAccountBtn}
              disabled={deleting}
              onPress={() => setConfirmDelete(true)}>
              {deleting ? (
                <ActivityIndicator color={NoFoco.danger} size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color={NoFoco.danger} />
                  <Text style={styles.deleteAccountText}>Excluir minha conta e todos os dados</Text>
                </>
              )}
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

            <ConfirmDialog
              visible={confirmDelete}
              title="Excluir conta permanentemente?"
              message="Esta ação é irreversível conforme a LGPD. Todas as suas pesagens, histórico do diário, receitas e conta serão apagados para sempre de nossos servidores."
              confirmLabel="Excluir Definitivamente"
              onConfirm={handleDeleteAccount}
              onCancel={() => setConfirmDelete(false)}
            />
          </>
        ) : !isSupabaseConfigured ? (
          <View style={styles.card}>
            <Text style={styles.warn}>
              O backend ainda não está configurado. Preencha a chave anon em `.env.local` e reinicie o app
              para ativar a conta.
            </Text>
          </View>
        ) : (
          <>
            {/* Botão de Login com Google */}
            <Pressable
              style={styles.googleBtn}
              disabled={googleBusy}
              onPress={handleGoogleLogin}>
              {googleBusy ? (
                <ActivityIndicator color={NoFoco.ink} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color={NoFoco.ink} />
                  <Text style={styles.googleBtnText}>Continuar com o Google</Text>
                </>
              )}
            </Pressable>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>ou com e-mail</Text>
              <View style={styles.orLine} />
            </View>

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

            <Pressable
              onPress={submit}
              disabled={!valid || busy}
              style={[styles.cta, (!valid || busy) && styles.ctaOff]}>
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

            <Pressable
              onPress={() => router.push('/privacidade')}
              style={styles.privacyLink}>
              <Ionicons name="shield-checkmark-outline" size={14} color={NoFoco.soft} />
              <Text style={styles.privacyLinkText}>Conheça nossa Política de Privacidade & Termos</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.note}>
          Seus dados funcionam no aparelho mesmo sem conta. A conta é opcional e serve para backup na nuvem e uso em múltiplos dispositivos.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  scroll: { paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  title: { color: NoFoco.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: NoFoco.soft, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  close: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  cardSectionTitle: {
    color: NoFoco.ink,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    color: NoFoco.ink,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: NoFoco.hair,
    marginVertical: Spacing.sm,
  },

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

  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  privacyRowTitle: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '700' },
  privacyRowDesc: { color: NoFoco.soft, fontSize: 11.5, marginTop: 1 },

  signOut: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
  signOutText: { color: NoFoco.soft, fontSize: 13, fontWeight: '600' },

  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  deleteAccountText: { color: NoFoco.danger, fontSize: 12.5, fontWeight: '700' },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: NoFoco.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.md,
    paddingVertical: 14,
    marginTop: Spacing.md,
  },
  googleBtnText: { color: NoFoco.ink, fontSize: 14, fontWeight: '700' },

  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: NoFoco.hair },
  orText: { color: NoFoco.soft, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

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

  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  privacyLinkText: { color: NoFoco.soft, fontSize: 11.5 },
  note: {
    color: NoFoco.soft,
    fontSize: 11,
    lineHeight: 16,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    textAlign: 'center',
  },
});
