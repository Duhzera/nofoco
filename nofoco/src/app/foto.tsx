/**
 * Foto com IA (E5): tira/escolhe uma foto do prato, a IA estima os alimentos e a
 * pessoa CONFIRMA antes de lançar — nunca lançamos direto, porque é estimativa
 * (ver plano §4.5: "sempre exigir confirmação").
 *
 * A análise roda na Edge Function `analisar-foto` (a chave da IA fica no servidor).
 */
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import { macrosForGrams } from '@/data/foods';
import { todayKey } from '@/lib/date';
import { analisarFoto, type GuessedItem } from '@/services/vision';
import { useAuth } from '@/store/auth';
import { useDay } from '@/store/day';
import { newItemId, useDiary } from '@/store/diary';
import { findMeal, useMeals, type MealId } from '@/store/meals';

type Phase = 'inicio' | 'analisando' | 'revisao' | 'erro';

const CONF: Record<GuessedItem['confidence'], { label: string; color: string }> = {
  alta: { label: 'alta', color: NoFoco.accent },
  media: { label: 'média', color: NoFoco.warning },
  baixa: { label: 'baixa', color: NoFoco.danger },
};

export default function FotoScreen() {
  const { meal: mealParam, voltarPara } = useLocalSearchParams<{ meal?: MealId; voltarPara?: string }>();
  const meals = useMeals((s) => s.meals);
  const addItem = useDiary((s) => s.addItem);
  const date = useDay((s) => s.date);
  const user = useAuth((s) => s.user);

  const [phase, setPhase] = useState<Phase>('inicio');
  const [photo, setPhoto] = useState<string | null>(null);
  const [items, setItems] = useState<GuessedItem[]>([]);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const meal = (mealParam && findMeal(meals, mealParam)?.id) || meals[0]?.id;
  const mealName = findMeal(meals, meal)?.name ?? 'refeição';

  const run = async (base64: string, uri: string) => {
    setPhoto(uri);
    setPhase('analisando');
    setAviso(null);
    const res = await analisarFoto(base64);
    if (res.kind === 'ok') {
      setItems(res.items);
      setChosen(new Set(res.items.map((_, i) => i))); // todos marcados por padrão
      setAviso(res.aviso ?? null);
      setPhase('revisao');
    } else if (res.kind === 'sem-comida') {
      setErro(res.aviso);
      setPhase('erro');
    } else {
      setErro(res.message);
      setPhase('erro');
    }
  };

  const pick = async (from: 'camera' | 'galeria') => {
    const opts: ImagePicker.ImagePickerOptions = {
      base64: true,
      quality: 0.6,
      mediaTypes: ['images'],
    };
    const res =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = res.canceled ? null : res.assets[0];
    if (asset?.base64) void run(asset.base64, asset.uri);
  };

  const toggle = (i: number) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const confirmar = () => {
    if (!meal) return;
    items.forEach((it, i) => {
      if (!chosen.has(i)) return;
      addItem(date || todayKey(), meal, {
        id: newItemId(),
        foodId: it.food.id,
        name: it.food.name,
        emoji: '📷',
        grams: it.grams,
        portionLabel: `${it.grams} g · estimado por foto`,
        macros: macrosForGrams(it.food, it.grams),
      });
    });
    if (voltarPara === 'refeicao') router.dismissTo({ pathname: '/refeicao', params: { key: meal } });
    else if (router.canDismiss()) router.dismissAll();
    else router.replace('/(tabs)');
  };

  const totalKcal = items.reduce(
    (a, it, i) => (chosen.has(i) ? a + macrosForGrams(it.food, it.grams).kcal : a),
    0,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Foto do prato</Text>
          <Text style={styles.sub}>A IA estima — você confere antes de lançar.</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={NoFoco.ink} />
        </Pressable>
      </View>

      {!user ? (
        <View style={styles.card}>
          <Text style={styles.warn}>
            A análise por foto roda no servidor e precisa de conta. Entre na sua conta para usar.
          </Text>
          <Pressable style={styles.cta} onPress={() => router.replace('/conta')}>
            <Text style={styles.ctaText}>Entrar</Text>
          </Pressable>
        </View>
      ) : phase === 'inicio' ? (
        <View style={styles.body}>
          <View style={styles.bigIcon}>
            <Ionicons name="camera-outline" size={34} color={NoFoco.accent} />
          </View>
          <Text style={styles.bigTitle}>Fotografe seu prato</Text>
          <Text style={styles.hint}>
            Enquadre o prato inteiro, de cima. Um talher ou a mão ao lado ajuda a estimar o tamanho.
          </Text>
          <Pressable style={styles.cta} onPress={() => pick('camera')}>
            <Ionicons name="camera" size={18} color={NoFoco.onAccent} />
            <Text style={styles.ctaText}>Tirar foto</Text>
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={() => pick('galeria')}>
            <Ionicons name="images-outline" size={16} color={NoFoco.accent} />
            <Text style={styles.linkText}>Escolher da galeria</Text>
          </Pressable>
        </View>
      ) : phase === 'analisando' ? (
        <View style={styles.body}>
          {photo && <Image source={{ uri: photo }} style={styles.preview} />}
          <ActivityIndicator color={NoFoco.accent} size="large" style={{ marginTop: Spacing.lg }} />
          <Text style={styles.bigTitle}>Analisando…</Text>
          <Text style={styles.hint}>Identificando os alimentos e estimando as porções.</Text>
        </View>
      ) : phase === 'erro' ? (
        <View style={styles.body}>
          {photo && <Image source={{ uri: photo }} style={styles.preview} />}
          <Text style={styles.bigTitle}>Não deu certo</Text>
          <Text style={styles.hint}>{erro}</Text>
          <Pressable style={styles.cta} onPress={() => setPhase('inicio')}>
            <Text style={styles.ctaText}>Tentar outra foto</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false}>
            {photo && <Image source={{ uri: photo }} style={styles.previewWide} />}

            {!!aviso && <Text style={styles.aviso}>{aviso}</Text>}

            <Text style={styles.section}>
              {items.length} {items.length === 1 ? 'item encontrado' : 'itens encontrados'} · confira e ajuste
            </Text>

            {items.map((it, i) => {
              const on = chosen.has(i);
              const m = macrosForGrams(it.food, it.grams);
              const conf = CONF[it.confidence];
              return (
                <Pressable key={it.food.id} onPress={() => toggle(i)} style={[styles.item, on && styles.itemOn]}>
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={on ? NoFoco.accent : NoFoco.soft}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{it.food.name}</Text>
                    <Text style={styles.itemMeta}>
                      ~{it.grams} g · confiança <Text style={{ color: conf.color }}>{conf.label}</Text>
                    </Text>
                  </View>
                  <Text style={styles.itemKcal}>{m.kcal}</Text>
                </Pressable>
              );
            })}

            <Text style={styles.disclaimer}>
              Valores estimados por IA a partir da imagem — confira e ajuste depois se precisar. Toque num
              item para incluir ou tirar.
            </Text>
            <View style={{ height: Spacing.xl }} />
          </ScrollView>

          <Pressable
            style={[styles.cta, chosen.size === 0 && styles.ctaOff]}
            disabled={chosen.size === 0}
            onPress={confirmar}>
            <Text style={styles.ctaText}>
              {chosen.size === 0 ? 'Escolha ao menos um item' : `Lançar ${totalKcal} kcal no ${mealName}`}
            </Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NoFoco.bg, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.md },
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

  body: { flex: 1, alignItems: 'center', paddingTop: 40, gap: Spacing.md },
  bigIcon: {
    width: 78,
    height: 78,
    borderRadius: Radius.pill,
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigTitle: { color: NoFoco.ink, fontSize: 17, fontWeight: '800', marginTop: Spacing.sm },
  hint: { color: NoFoco.soft, fontSize: 12.5, textAlign: 'center', lineHeight: 18, maxWidth: 290 },
  preview: { width: 150, height: 150, borderRadius: Radius.lg },
  previewWide: { width: '100%', height: 190, borderRadius: Radius.lg, marginBottom: Spacing.md },

  card: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  warn: { color: NoFoco.warning, fontSize: 12.5, lineHeight: 18 },

  aviso: { color: NoFoco.warning, fontSize: 12, lineHeight: 17, marginBottom: Spacing.sm },
  section: {
    color: NoFoco.soft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: -Spacing.sm,
    borderRadius: Radius.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NoFoco.faint,
  },
  itemOn: { backgroundColor: 'rgba(166,224,82,0.08)' },
  itemName: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '600' },
  itemMeta: { color: NoFoco.soft, fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] },
  itemKcal: { color: NoFoco.ink, fontSize: 13.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  disclaimer: { color: NoFoco.soft, fontSize: 11, lineHeight: 16, marginTop: Spacing.lg },

  cta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: NoFoco.accent,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    width: '100%',
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: NoFoco.onAccent, fontSize: 14.5, fontWeight: '800' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  linkText: { color: NoFoco.accent, fontSize: 13, fontWeight: '700' },
});
