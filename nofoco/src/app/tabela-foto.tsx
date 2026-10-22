/**
 * Leitura de Tabela Nutricional por IA (Gemini Vision).
 * Fotografa o rótulo/tabela de um produto, a IA extrai e calcula os nutrientes por 100g,
 * permitindo que o usuário revise e salve o alimento no catálogo pessoal.
 */
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import {
  analisarTabelaNutricional,
  labelToFood,
  type ScannedLabelData,
} from '@/services/label-vision';
import { supabase } from '@/services/supabase';
import { useCustomFoods } from '@/store/custom-foods';
import type { MealId } from '@/store/meals';

type Phase = 'inicio' | 'analisando' | 'revisao' | 'erro';

export default function TabelaFotoScreen() {
  const { barcode, meal, voltarPara } = useLocalSearchParams<{
    barcode?: string;
    meal?: MealId;
    voltarPara?: string;
  }>();

  const addCustomFood = useCustomFoods((s) => s.addCustomFood);

  const [phase, setPhase] = useState<Phase>('inicio');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Campos editáveis do alimento extraído
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingGrams, setServingGrams] = useState('100');
  const [servingLabel, setServingLabel] = useState('');
  const [isLiquid, setIsLiquid] = useState(false);

  // Nutrientes por 100g
  const [kcal, setKcal] = useState('0');
  const [carb, setCarb] = useState('0');
  const [protein, setProtein] = useState('0');
  const [fat, setFat] = useState('0');
  const [fiber, setFiber] = useState('0');
  const [sodium, setSodium] = useState('0');
  const [sugar, setSugar] = useState('');
  const [satFat, setSatFat] = useState('');

  const safeClose = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      router.replace('/(tabs)');
    }
  };

  const populateFromAI = (data: ScannedLabelData) => {
    setName(data.name || '');
    setBrand(data.brand || '');
    setServingGrams(String(data.servingGrams || 100));
    setServingLabel(data.servingLabel || `${data.servingGrams || 100}g`);
    setIsLiquid(Boolean(data.liquid));

    setKcal(String(data.per100.kcal ?? 0));
    setCarb(String(data.per100.carb ?? 0));
    setProtein(String(data.per100.protein ?? 0));
    setFat(String(data.per100.fat ?? 0));
    setFiber(String(data.per100.fiber ?? 0));
    setSodium(String(data.per100.sodium ?? 0));
    setSugar(data.per100.sugar !== undefined ? String(data.per100.sugar) : '');
    setSatFat(data.per100.satFat !== undefined ? String(data.per100.satFat) : '');
  };

  const runAnalysis = async (base64: string, uri: string) => {
    setPhotoUri(uri);
    setPhase('analisando');
    setErro(null);

    const res = await analisarTabelaNutricional(base64);
    if (res.kind === 'ok') {
      populateFromAI(res.data);
      setPhase('revisao');
    } else if (res.kind === 'sem-tabela') {
      setErro(res.aviso);
      setPhase('erro');
    } else {
      setErro(res.message);
      setPhase('erro');
    }
  };

  const pickImage = async (from: 'camera' | 'galeria') => {
    const opts: ImagePicker.ImagePickerOptions = {
      base64: true,
      quality: 0.7,
      mediaTypes: ['images'],
    };
    const res =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);

    const asset = res.canceled ? null : res.assets[0];
    if (asset?.base64) {
      void runAnalysis(asset.base64, asset.uri);
    }
  };

  const handleSave = () => {
    const sGrams = Math.max(1, parseFloat(servingGrams) || 100);
    const labelData: ScannedLabelData = {
      name: name.trim() || 'Alimento sem nome',
      brand: brand.trim() || undefined,
      servingGrams: sGrams,
      servingLabel: servingLabel.trim() || `porção (${sGrams} ${isLiquid ? 'ml' : 'g'})`,
      liquid: isLiquid,
      per100: {
        kcal: Math.max(0, parseFloat(kcal) || 0),
        carb: Math.max(0, parseFloat(carb) || 0),
        protein: Math.max(0, parseFloat(protein) || 0),
        fat: Math.max(0, parseFloat(fat) || 0),
        fiber: Math.max(0, parseFloat(fiber) || 0),
        sodium: Math.max(0, parseFloat(sodium) || 0),
        sugar: sugar ? parseFloat(sugar) : undefined,
        satFat: satFat ? parseFloat(satFat) : undefined,
      },
    };

    const food = labelToFood(labelData, barcode);
    addCustomFood(food);

    // Se tiver código de barras, salva também no cache compartilhado do Supabase
    if (barcode && supabase) {
      void supabase.from('products').upsert({
        barcode,
        name: food.name,
        brand: food.brand ?? null,
        per100: food.per100,
        unit_grams: food.unitGrams,
        unit_label: food.unitLabel,
        liquid: food.liquid ?? false,
        source: 'Cadastrado por Foto (Rótulo)',
      });
    }

    // Navega para a tela de porção para lançar na refeição
    router.replace({
      pathname: '/porcao',
      params: {
        id: food.id,
        ...(meal ? { meal } : {}),
        ...(voltarPara ? { voltarPara } : {}),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ler Tabela Nutricional</Text>
          <Text style={styles.sub}>
            {barcode
              ? `Código: ${barcode} • Extração com IA`
              : 'A IA lê os nutrientes e preenche para você.'}
          </Text>
        </View>
        <Pressable onPress={safeClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={NoFoco.ink} />
        </Pressable>
      </View>

      {phase === 'inicio' ? (
        <View style={styles.body}>
          <View style={styles.bigIcon}>
            <Ionicons name="nutrition-outline" size={38} color={NoFoco.accent} />
          </View>
          <Text style={styles.bigTitle}>Fotografe a tabela do rótulo</Text>
          <Text style={styles.hint}>
            Aponte a câmera para a tabela de Informação Nutricional da embalagem. Certifique-se de que os números estejam nítidos.
          </Text>

          <Pressable style={styles.cta} onPress={() => pickImage('camera')}>
            <Ionicons name="camera" size={18} color={NoFoco.onAccent} />
            <Text style={styles.ctaText}>Fotografar Tabela</Text>
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={() => pickImage('galeria')}>
            <Ionicons name="images-outline" size={16} color={NoFoco.accent} />
            <Text style={styles.linkText}>Escolher foto da galeria</Text>
          </Pressable>
        </View>
      ) : phase === 'analisando' ? (
        <View style={styles.body}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}
          <ActivityIndicator color={NoFoco.accent} size="large" style={{ marginTop: Spacing.lg }} />
          <Text style={styles.bigTitle}>Lendo tabela nutricional…</Text>
          <Text style={styles.hint}>
            A IA está identificando as porções e normalizando os macros para 100g.
          </Text>
        </View>
      ) : phase === 'erro' ? (
        <View style={styles.body}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}
          <Text style={styles.bigTitle}>Não foi possível ler</Text>
          <Text style={styles.hint}>{erro}</Text>
          <Pressable style={styles.cta} onPress={() => setPhase('inicio')}>
            <Text style={styles.ctaText}>Tentar outra foto</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.previewSmall} />}

          <Text style={styles.sectionTitle}>Identificação do Produto</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Nome do Alimento *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Biscoito Recheado Chocolate"
              placeholderTextColor={NoFoco.soft}
              style={styles.input}
            />
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>Marca (Opcional)</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="Ex.: Bauducco, Nestlé"
              placeholderTextColor={NoFoco.soft}
              style={styles.input}
            />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Porção da Embalagem</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Peso da Porção ({isLiquid ? 'ml' : 'g'})</Text>
                <TextInput
                  value={servingGrams}
                  onChangeText={setServingGrams}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={NoFoco.soft}
                  style={styles.input}
                />
              </View>
              <View style={{ width: Spacing.md }} />
              <View style={{ flex: 1.5 }}>
                <Text style={styles.fieldLabel}>Descrição da Porção</Text>
                <TextInput
                  value={servingLabel}
                  onChangeText={setServingLabel}
                  placeholder="Ex.: 2 biscoitos (30g)"
                  placeholderTextColor={NoFoco.soft}
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
            Nutrientes por 100g (Padrão Oficial)
          </Text>
          <Text style={styles.sectionSub}>
            A IA já converteu os valores para a base de 100g. Você pode corrigir se necessário:
          </Text>

          <View style={styles.macroGrid}>
            <View style={styles.macroBox}>
              <Text style={styles.macroLabel}>Calorias (kcal)</Text>
              <TextInput
                value={kcal}
                onChangeText={setKcal}
                keyboardType="numeric"
                style={styles.macroInput}
              />
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroLabel}>Carboidrato (g)</Text>
              <TextInput
                value={carb}
                onChangeText={setCarb}
                keyboardType="numeric"
                style={styles.macroInput}
              />
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroLabel}>Proteína (g)</Text>
              <TextInput
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                style={styles.macroInput}
              />
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroLabel}>Gordura (g)</Text>
              <TextInput
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
                style={styles.macroInput}
              />
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroLabel}>Fibras (g)</Text>
              <TextInput
                value={fiber}
                onChangeText={setFiber}
                keyboardType="numeric"
                style={styles.macroInput}
              />
            </View>
            <View style={styles.macroBox}>
              <Text style={styles.macroLabel}>Sódio (mg)</Text>
              <TextInput
                value={sodium}
                onChangeText={setSodium}
                keyboardType="numeric"
                style={styles.macroInput}
              />
            </View>
          </View>

          <Pressable
            style={[styles.cta, !name.trim() && styles.ctaOff]}
            disabled={!name.trim()}
            onPress={handleSave}>
            <Ionicons name="checkmark-circle" size={18} color={NoFoco.onAccent} />
            <Text style={styles.ctaText}>Salvar e Continuar</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  title: { color: NoFoco.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: NoFoco.soft, fontSize: 12, marginTop: 2 },
  close: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: NoFoco.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { flex: 1, alignItems: 'center', paddingTop: 30, gap: Spacing.md },
  bigIcon: {
    width: 82,
    height: 82,
    borderRadius: Radius.pill,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigTitle: { color: NoFoco.ink, fontSize: 18, fontWeight: '800', marginTop: Spacing.sm },
  hint: { color: NoFoco.soft, fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  preview: { width: 160, height: 160, borderRadius: Radius.lg },
  previewSmall: { width: '100%', height: 130, borderRadius: Radius.md, marginBottom: Spacing.md },

  scroll: { paddingBottom: Spacing.xxl },

  sectionTitle: {
    color: NoFoco.ink,
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    color: NoFoco.soft,
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },

  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  fieldLabel: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    color: NoFoco.ink,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: NoFoco.hair,
    marginVertical: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },

  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  macroBox: {
    width: '48%',
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  macroLabel: {
    color: NoFoco.soft,
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  macroInput: {
    color: NoFoco.ink,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 2,
  },

  cta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    width: '100%',
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: NoFoco.onAccent, fontSize: 15, fontWeight: '800' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  linkText: { color: NoFoco.accent, fontSize: 13, fontWeight: '700' },
});
