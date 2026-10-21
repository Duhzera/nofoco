import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { useSubscription, type PlanType } from '@/store/subscription';

export default function PremiumScreen() {
  const isPro = useSubscription((s) => s.isPro);
  const currentPlan = useSubscription((s) => s.plan);
  const setPro = useSubscription((s) => s.setPro);
  const restorePurchases = useSubscription((s) => s.restorePurchases);

  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const safeClose = () => {
    try {
      if (Platform.OS === 'web' || !router.canGoBack()) {
        router.replace('/(tabs)');
      } else {
        router.back();
      }
    } catch {
      router.replace('/(tabs)');
    }
  };

  const handleSubscribe = async () => {
    setBusy(true);
    setFeedback(null);
    // Simula fluxo de compra nativa Google Play Billing / RevenueCat
    await new Promise((r) => setTimeout(r, 900));
    setPro(true, selectedPlan, selectedPlan === 'annual' ? 365 : 30);
    setBusy(false);
    setFeedback('🎉 Bem-vindo ao NoFoco PRO! Todos os recursos foram liberados.');
  };

  const handleRestore = async () => {
    setRestoring(true);
    setFeedback(null);
    const res = await restorePurchases();
    setRestoring(false);
    setFeedback(res.message);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.proPill}>
          <Ionicons name="sparkles" size={14} color="#000" />
          <Text style={styles.proPillText}>NOFOCO PRO</Text>
        </View>
        <Pressable onPress={safeClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={NoFoco.ink} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero Title */}
        <View style={styles.hero}>
          <Text style={styles.title}>Desbloqueie todo o potencial da sua dieta</Text>
          <Text style={styles.subtitle}>
            A inteligência artificial que calcula seus pratos e analisa seus macros sem você perder tempo.
          </Text>
        </View>

        {/* Benefits List */}
        <View style={styles.benefits}>
          <View style={styles.benefitRow}>
            <View style={styles.benefitIconBox}>
              <Ionicons name="camera" size={20} color={NoFoco.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>Fotos com IA Ilimitadas</Text>
              <Text style={styles.benefitDesc}>
                Fotografe café, almoço, lanches e jantar sem limites de cota diária.
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconBox}>
              <Ionicons name="options" size={20} color={NoFoco.carb} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>Ajuste Fino de Metas & Macros</Text>
              <Text style={styles.benefitDesc}>
                Personalize gramas exatas de carboidrato, proteína, gordura e fibras.
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconBox}>
              <Ionicons name="trending-up" size={20} color={NoFoco.protein} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>Previsão Avançada de Peso</Text>
              <Text style={styles.benefitDesc}>
                Gráfico detalhado com a estimativa semana a semana de quando você alcança sua meta.
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIconBox}>
              <Ionicons name="restaurant" size={20} color={NoFoco.fat} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitTitle}>Criador de Receitas Ilimitado</Text>
              <Text style={styles.benefitDesc}>
                Cadastre receitas caseiras calculando a evaporação de peso cru vs. cozido.
              </Text>
            </View>
          </View>
        </View>

        {isPro ? (
          <View style={styles.alreadyProCard}>
            <Ionicons name="checkmark-circle" size={32} color={NoFoco.accent} />
            <Text style={styles.alreadyProTitle}>Você já é NoFoco PRO!</Text>
            <Text style={styles.alreadyProSub}>
              Plano {currentPlan === 'annual' ? 'Anual' : 'Mensal'} ativo. Aproveite todos os recursos.
            </Text>
            <Pressable style={styles.backBtn} onPress={safeClose}>
              <Text style={styles.backBtnText}>Continuar no aplicativo</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Plans Selection */}
            <View style={styles.plansContainer}>
              {/* Plano Anual */}
              <Pressable
                style={[
                  styles.planCard,
                  selectedPlan === 'annual' && styles.planCardActive,
                ]}
                onPress={() => setSelectedPlan('annual')}>
                <View style={styles.badgePopular}>
                  <Text style={styles.badgePopularText}>7 DIAS GRÁTIS • ECONOMIZE 58%</Text>
                </View>
                <View style={styles.planCardBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>Plano Anual</Text>
                    <Text style={styles.planPerMonth}>R$ 8,32 / mês</Text>
                    <Text style={styles.planBilled}>Cobrado anualmente por R$ 99,90</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPlan === 'annual' && styles.radioCircleActive,
                    ]}>
                    {selectedPlan === 'annual' && <View style={styles.radioInner} />}
                  </View>
                </View>
              </Pressable>

              {/* Plano Mensal */}
              <Pressable
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.planCardActive,
                ]}
                onPress={() => setSelectedPlan('monthly')}>
                <View style={styles.planCardBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>Plano Mensal</Text>
                    <Text style={styles.planPerMonth}>R$ 19,90 / mês</Text>
                    <Text style={styles.planBilled}>Sem fidelidade, cancele quando quiser</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPlan === 'monthly' && styles.radioCircleActive,
                    ]}>
                    {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                  </View>
                </View>
              </Pressable>
            </View>

            {!!feedback && <Text style={styles.feedbackText}>{feedback}</Text>}

            {/* Action CTA */}
            <Pressable
              style={styles.ctaBtn}
              disabled={busy}
              onPress={handleSubscribe}>
              {busy ? (
                <ActivityIndicator color={NoFoco.onAccent} />
              ) : (
                <Text style={styles.ctaBtnText}>
                  {selectedPlan === 'annual'
                    ? 'Experimentar 7 dias grátis'
                    : 'Assinar Plano Mensal'}
                </Text>
              )}
            </Pressable>

            <Text style={styles.guaranteeText}>
              {selectedPlan === 'annual'
                ? 'Após os 7 dias grátis, R$ 99,90/ano. Cancele antes a qualquer momento na Google Play sem custo.'
                : 'Cobrado mensalmente. Cancele a qualquer momento direto na sua conta Google Play.'}
            </Text>
          </>
        )}

        {/* Footer links */}
        <View style={styles.footer}>
          <Pressable onPress={handleRestore} disabled={restoring}>
            <Text style={styles.footerLink}>
              {restoring ? 'Verificando...' : 'Restaurar compras'}
            </Text>
          </Pressable>
          <Text style={styles.footerDot}>•</Text>
          <Pressable onPress={() => router.push('/privacidade')}>
            <Text style={styles.footerLink}>Termos & Privacidade</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: NoFoco.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  proPillText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  hero: {
    marginVertical: Spacing.md,
  },
  title: {
    color: NoFoco.ink,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    color: NoFoco.soft,
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  benefits: {
    marginVertical: Spacing.md,
    gap: Spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  benefitIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    color: NoFoco.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  benefitDesc: {
    color: NoFoco.soft,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  plansContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  planCard: {
    backgroundColor: NoFoco.surface,
    borderWidth: 2,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    position: 'relative',
  },
  planCardActive: {
    borderColor: NoFoco.accent,
    backgroundColor: '#102216',
  },
  badgePopular: {
    position: 'absolute',
    top: -11,
    left: Spacing.md,
    backgroundColor: NoFoco.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  badgePopularText: {
    color: '#000',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  planName: {
    color: NoFoco.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  planPerMonth: {
    color: NoFoco.accent,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  planBilled: {
    color: NoFoco.soft,
    fontSize: 11.5,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: NoFoco.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: NoFoco.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: NoFoco.accent,
  },
  ctaBtn: {
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  ctaBtnText: {
    color: NoFoco.onAccent,
    fontSize: 16,
    fontWeight: '900',
  },
  guaranteeText: {
    color: NoFoco.soft,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: Spacing.sm,
  },
  feedbackText: {
    color: NoFoco.accent,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontWeight: '600',
  },
  alreadyProCard: {
    backgroundColor: NoFoco.surface,
    borderWidth: 1,
    borderColor: NoFoco.accent,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  alreadyProTitle: {
    color: NoFoco.ink,
    fontSize: 18,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  alreadyProSub: {
    color: NoFoco.soft,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  backBtn: {
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  backBtnText: {
    color: NoFoco.onAccent,
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  footerLink: {
    color: NoFoco.soft,
    fontSize: 11.5,
    textDecorationLine: 'underline',
  },
  footerDot: {
    color: NoFoco.soft,
    fontSize: 11.5,
  },
});
