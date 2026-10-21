import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';

export default function PrivacidadeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Privacidade & Termos</Text>
          <Text style={styles.sub}>Conformidade com a LGPD (Lei 13.709/2018)</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={NoFoco.ink} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Nosso Compromisso com sua Privacidade</Text>
          <Text style={styles.text}>
            O NoFoco foi desenvolvido com privacidade desde o design (Privacy by Design). Seus dados de saúde, medidas corporais e hábitos alimentares pertencem exclusivamente a você.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Dados Sensíveis Coletados</Text>
          <Text style={styles.text}>
            Nos termos do Art. 5º, II da LGPD, dados relacionados à saúde e nutrição são considerados dados sensíveis. Coletamos:
          </Text>
          <Text style={styles.bullet}>• Medidas corporais: peso atual, peso alvo, altura, sexo e idade;</Text>
          <Text style={styles.bullet}>• Registros alimentares: alimentos consumidos, porções e horários de refeições;</Text>
          <Text style={styles.bullet}>• Fotografias de pratos: enviadas temporariamente para processamento por IA e nunca compartilhadas com terceiros;</Text>
          <Text style={styles.bullet}>• Identificação: e-mail ou autenticação Google para sincronização entre dispositivos.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Uso de Inteligência Artificial (Google Gemini)</Text>
          <Text style={styles.text}>
            Ao utilizar a funcionalidade de foto de prato, a imagem é transmitida de forma criptografada para estimativa nutricional com base na Tabela TACO. Suas fotos não são utilizadas para treinamento de modelos públicos e não são vendidas.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. Seus Direitos (Art. 18 da LGPD)</Text>
          <Text style={styles.text}>
            Você possui controle absoluto sobre seus dados diretamente dentro do aplicativo:
          </Text>
          <Text style={styles.bullet}>• <Text style={styles.bold}>Direito de Acesso e Portabilidade:</Text> Você pode exportar uma cópia completa dos seus dados em formato JSON a qualquer momento na tela Conta.</Text>
          <Text style={styles.bullet}>• <Text style={styles.bold}>Direito ao Esquecimento (Exclusão Total):</Text> Você pode solicitar a exclusão definitiva da sua conta e de todos os seus registros de pesagem, diário e receitas com um clique.</Text>
          <Text style={styles.bullet}>• <Text style={styles.bold}>Uso Offline:</Text> O aplicativo funciona sem necessidade de cadastro caso opte por não sincronizar na nuvem.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>5. Isenção de Responsabilidade Médica</Text>
          <Text style={styles.text}>
            O NoFoco fornece estimativas matemáticas informativas baseadas em literatura científica (fórmula de Mifflin-St Jeor) e tabelas oficiais (TACO/IBGE). O aplicativo não fornece diagnóstico médico nem substitui o acompanhamento de nutricionistas ou médicos especialistas.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>6. Contato do Encarregado (DPO)</Text>
          <Text style={styles.text}>
            Para dúvidas sobre o tratamento de dados pessoais ou exercer seus direitos de privacidade, entre em contato pelo e-mail:
          </Text>
          <Text style={[styles.text, styles.emailContact]}>privacidade@nofoco.app</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
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
  content: { paddingBottom: Spacing.xl },
  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    color: NoFoco.ink,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  text: {
    color: NoFoco.soft,
    fontSize: 12.5,
    lineHeight: 18,
  },
  bullet: {
    color: NoFoco.soft,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    paddingLeft: Spacing.xs,
  },
  bold: {
    color: NoFoco.ink,
    fontWeight: '700',
  },
  emailContact: {
    color: NoFoco.accent,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
});
