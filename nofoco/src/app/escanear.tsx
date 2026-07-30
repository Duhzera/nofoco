/**
 * Leitor de código de barras. Abre a câmera, lê o código de qualquer produto e
 * resolve em um alimento via services/products (cache Supabase → Open Food Facts).
 *
 * Achou → vai para a porção (com meal/voltarPara). Não achou → oferece busca manual.
 * No web não há câmera de verdade no preview, então cai no modo "digitar código".
 */
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { lookupProduct } from '@/services/products';
import type { MealId } from '@/store/meals';

type Status = 'scanning' | 'looking' | 'notfound';

export default function EscanearScreen() {
  const { meal, voltarPara } = useLocalSearchParams<{ meal?: MealId; voltarPara?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>('scanning');
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState(Platform.OS === 'web');
  const [code, setCode] = useState('');
  const [lastCode, setLastCode] = useState('');
  const busy = useRef(false);

  const goToPortion = (id: string) =>
    router.replace({
      pathname: '/porcao',
      params: { id, ...(meal ? { meal } : {}), ...(voltarPara ? { voltarPara } : {}) },
    });

  const goToSearch = () =>
    router.replace({
      pathname: '/pesquisar',
      params: { ...(meal ? { meal } : {}), ...(voltarPara ? { voltarPara } : {}) },
    });

  const resolve = async (raw: string) => {
    if (busy.current) return;
    busy.current = true;
    setLastCode(raw);
    setStatus('looking');
    const food = await lookupProduct(raw);
    if (food) {
      goToPortion(food.id);
      return; // navegou — não reabilita o scanner
    }
    setStatus('notfound');
    busy.current = false;
  };

  const scanAgain = () => {
    setStatus('scanning');
    busy.current = false;
  };

  const submitManual = () => {
    const c = code.replace(/\D/g, '');
    if (c.length >= 6) void resolve(c);
  };

  // ── modo manual (web ou fallback) ──────────────────────────────────────
  if (manual) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header onClose={() => router.back()} />
        <View style={styles.manualBody}>
          <View style={styles.manualIcon}>
            <Ionicons name="keypad-outline" size={30} color={NoFoco.accent} />
          </View>
          <Text style={styles.manualTitle}>Digite o código de barras</Text>
          <Text style={styles.manualHint}>
            {Platform.OS === 'web'
              ? 'No navegador não há câmera. No celular, o leitor abre automático.'
              : 'Os números que aparecem embaixo do código de barras.'}
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="7891234567890"
            placeholderTextColor={NoFoco.soft}
            style={styles.manualInput}
            maxLength={14}
            autoFocus
          />
          {status === 'looking' && <ActivityIndicator color={NoFoco.accent} style={{ marginTop: Spacing.md }} />}
          {status === 'notfound' && (
            <Text style={styles.notfoundInline}>Nada encontrado para {lastCode}. Confira os números.</Text>
          )}
          <Pressable
            style={[styles.cta, code.replace(/\D/g, '').length < 6 && styles.ctaOff]}
            disabled={code.replace(/\D/g, '').length < 6 || status === 'looking'}
            onPress={submitManual}>
            <Text style={styles.ctaText}>Buscar produto</Text>
          </Pressable>
          {Platform.OS !== 'web' && (
            <Pressable onPress={() => { setManual(false); scanAgain(); }} style={styles.switchMode}>
              <Ionicons name="barcode-outline" size={16} color={NoFoco.accent} />
              <Text style={styles.switchModeText}>Usar a câmera</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── permissão ainda não concedida ──────────────────────────────────────
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header onClose={() => router.back()} />
        <View style={styles.manualBody}>
          <View style={styles.manualIcon}>
            <Ionicons name="camera-outline" size={30} color={NoFoco.accent} />
          </View>
          <Text style={styles.manualTitle}>Permitir a câmera</Text>
          <Text style={styles.manualHint}>
            O NoFoco usa a câmera só para ler o código de barras dos produtos.
          </Text>
          <Pressable style={styles.cta} onPress={requestPermission}>
            <Text style={styles.ctaText}>Permitir câmera</Text>
          </Pressable>
          <Pressable onPress={() => setManual(true)} style={styles.switchMode}>
            <Ionicons name="keypad-outline" size={16} color={NoFoco.accent} />
            <Text style={styles.switchModeText}>Digitar o código manualmente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── câmera ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.cameraWrap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
        }}
        onBarcodeScanned={status === 'scanning' ? ({ data }) => void resolve(data) : undefined}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.round}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.camTitle}>Escanear</Text>
          <Pressable onPress={() => setTorch((t) => !t)} hitSlop={10} style={[styles.round, torch && styles.roundOn]}>
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color={torch ? NoFoco.onAccent : '#fff'} />
          </Pressable>
        </View>

        <View style={styles.frameArea}>
          {status === 'looking' ? (
            <View style={styles.looking}>
              <ActivityIndicator color={NoFoco.accent} size="large" />
              <Text style={styles.lookingText}>Buscando produto…</Text>
            </View>
          ) : status === 'notfound' ? (
            <View style={styles.notfoundCard}>
              <Text style={styles.notfoundTitle}>Produto não encontrado</Text>
              <Text style={styles.notfoundText}>
                O código {lastCode} não está no Open Food Facts ainda.
              </Text>
              <View style={styles.notfoundActions}>
                <Pressable style={[styles.smallBtn, styles.smallBtnPrimary]} onPress={scanAgain}>
                  <Text style={styles.smallBtnPrimaryText}>Escanear de novo</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={goToSearch}>
                  <Text style={styles.smallBtnText}>Buscar por nome</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              <Text style={styles.frameHint}>Aponte para o código de barras</Text>
            </>
          )}
        </View>

        <Pressable onPress={() => setManual(true)} style={styles.manualLink}>
          <Ionicons name="keypad-outline" size={16} color="#fff" />
          <Text style={styles.manualLinkText}>Digitar código manualmente</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Escanear</Text>
      <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
        <Ionicons name="close" size={22} color={NoFoco.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md },
  title: { color: NoFoco.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  close: { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: NoFoco.surface2, alignItems: 'center', justifyContent: 'center' },

  // manual / permissão
  manualBody: { flex: 1, alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  manualIcon: {
    width: 72, height: 72, borderRadius: Radius.pill, backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: NoFoco.hair, alignItems: 'center', justifyContent: 'center',
  },
  manualTitle: { color: NoFoco.ink, fontSize: 17, fontWeight: '800' },
  manualHint: { color: NoFoco.soft, fontSize: 12.5, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  manualInput: {
    width: '100%', backgroundColor: NoFoco.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: NoFoco.hair,
    borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 14, color: NoFoco.ink,
    fontSize: 18, fontWeight: '700', textAlign: 'center', letterSpacing: 1, marginTop: Spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  notfoundInline: { color: NoFoco.warning, fontSize: 12.5, textAlign: 'center', marginTop: Spacing.sm },
  cta: { width: '100%', backgroundColor: NoFoco.accent, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', marginTop: Spacing.md },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: NoFoco.onAccent, fontSize: 15, fontWeight: '800' },
  switchMode: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.md },
  switchModeText: { color: NoFoco.accent, fontSize: 13, fontWeight: '700' },

  // câmera
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: Spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.sm },
  round: { width: 40, height: 40, borderRadius: Radius.pill, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  roundOn: { backgroundColor: NoFoco.accent },
  camTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  frameArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  frame: { width: 240, height: 160 },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: NoFoco.accent, borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  frameHint: { color: '#fff', fontSize: 13, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  looking: { alignItems: 'center', gap: Spacing.md },
  lookingText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  notfoundCard: { backgroundColor: NoFoco.surface, borderRadius: Radius.lg, padding: Spacing.lg, width: '100%', maxWidth: 320 },
  notfoundTitle: { color: NoFoco.ink, fontSize: 16, fontWeight: '800' },
  notfoundText: { color: NoFoco.soft, fontSize: 12.5, lineHeight: 18, marginTop: Spacing.sm, fontVariant: ['tabular-nums'] },
  notfoundActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  smallBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', backgroundColor: NoFoco.surface2 },
  smallBtnText: { color: NoFoco.ink, fontSize: 12.5, fontWeight: '700' },
  smallBtnPrimary: { backgroundColor: NoFoco.accent },
  smallBtnPrimaryText: { color: NoFoco.onAccent, fontSize: 12.5, fontWeight: '800' },
  manualLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, alignSelf: 'center' },
  manualLinkText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
