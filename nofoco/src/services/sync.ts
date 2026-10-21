/**
 * Sincronização com o Supabase (perfil, refeições, peso e diário).
 *
 * Modelo v1 "espelho": o aparelho é a cópia de trabalho; o remoto é um backup.
 *  - pushAll: envia o estado local inteiro (upsert + apaga o que sumiu localmente).
 *  - pullAll: baixa tudo e substitui os stores locais.
 * Conflito = último a escrever vence. Não é merge por campo — dois aparelhos
 * editando offline ao mesmo tempo fazem um sobrescrever o outro (aceitável por ora).
 *
 * Tudo aqui é no-op se o backend não estiver configurado (supabase === null).
 * As tabelas ficam em supabase/schema.sql — rode antes de usar.
 */
import { supabase } from '@/services/supabase';
import type { DiaryDays, DiaryItem } from '@/store/diary';
import { useDiary } from '@/store/diary';
import { timeToMinutes, type Meal } from '@/store/meals';
import { useMeals } from '@/store/meals';
import { useProfile } from '@/store/profile';
import { useWeight } from '@/store/weight';
import type { Activity, CustomMacros, Objective, Sex } from '@/lib/goal';

const nowISO = () => new Date().toISOString();

/** Apaga, para o usuário, as linhas cuja chave não está mais na lista local. */
async function deleteMissing(table: string, keyCol: string, uid: string, keep: string[]) {
  if (!supabase) return;
  let q = supabase.from(table).delete().eq('user_id', uid);
  if (keep.length > 0) q = q.not(keyCol, 'in', `(${keep.join(',')})`);
  const { error } = await q;
  if (error) throw error;
}

/** Existe algum dado remoto para este usuário? (decide pull vs push no login) */
export async function remoteHasData(uid: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.from('profiles').select('user_id').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** Envia o estado local inteiro para o remoto (espelho). */
export async function pushAll(uid: string): Promise<void> {
  if (!supabase) return;
  const at = nowISO();

  // perfil (uma linha)
  const { profile, onboarded } = useProfile.getState();
  {
    const fullPayload = {
      user_id: uid,
      sex: profile.sex,
      age: profile.age,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      activity: profile.activity,
      objective: profile.objective,
      target_weight_kg: profile.targetWeightKg ?? null,
      weekly_rate_kg: profile.weeklyRateKg ?? null,
      custom_macros: profile.customMacros ?? null,
      onboarded,
      updated_at: at,
    };

    const { error } = await supabase.from('profiles').upsert(fullPayload, { onConflict: 'user_id' });
    if (error) {
      // Se colunas novas (target_weight_kg, custom_macros) ainda não existirem no Supabase, salva colunas base
      if (error.code === '42703' || error.message?.includes('column')) {
        const basePayload = {
          user_id: uid,
          sex: profile.sex,
          age: profile.age,
          height_cm: profile.heightCm,
          weight_kg: profile.weightKg,
          activity: profile.activity,
          objective: profile.objective,
          onboarded,
          updated_at: at,
        };
        const fallbackRes = await supabase.from('profiles').upsert(basePayload, { onConflict: 'user_id' });
        if (fallbackRes.error) throw fallbackRes.error;
      } else {
        throw error;
      }
    }
  }

  // refeições
  const meals = useMeals.getState().meals;
  if (meals.length) {
    const { error } = await supabase.from('meals').upsert(
      meals.map((m) => ({
        user_id: uid,
        meal_id: m.id,
        name: m.name,
        time: m.time,
        emoji: m.emoji,
        pct: m.pct,
        updated_at: at,
      })),
      { onConflict: 'user_id,meal_id' },
    );
    if (error) throw error;
  }
  await deleteMissing('meals', 'meal_id', uid, meals.map((m) => m.id));

  // peso
  const log = useWeight.getState().log;
  const wRows = Object.entries(log).map(([date, kg]) => ({ user_id: uid, date, kg, updated_at: at }));
  if (wRows.length) {
    const { error } = await supabase.from('weight_log').upsert(wRows, { onConflict: 'user_id,date' });
    if (error) throw error;
  }
  await deleteMissing('weight_log', 'date', uid, Object.keys(log));

  // diário (achata dias → refeição → itens em linhas)
  const days = useDiary.getState().days;
  const dRows: {
    user_id: string;
    item_id: string;
    day: string;
    meal_id: string;
    food_id: string;
    name: string;
    emoji: string;
    grams: number;
    portion_label: string;
    macros: unknown;
    updated_at: string;
  }[] = [];
  for (const [day, mealsOfDay] of Object.entries(days)) {
    for (const [mealId, items] of Object.entries(mealsOfDay)) {
      for (const it of items) {
        dRows.push({
          user_id: uid,
          item_id: it.id,
          day,
          meal_id: mealId,
          food_id: it.foodId,
          name: it.name,
          emoji: it.emoji,
          grams: it.grams,
          portion_label: it.portionLabel,
          macros: it.macros,
          updated_at: at,
        });
      }
    }
  }
  if (dRows.length) {
    const { error } = await supabase.from('diary_items').upsert(dRows, { onConflict: 'user_id,item_id' });
    if (error) throw error;
  }
  await deleteMissing('diary_items', 'item_id', uid, dRows.map((r) => r.item_id));
}

/** Baixa tudo do remoto e substitui os stores locais. */
export async function pullAll(uid: string): Promise<void> {
  if (!supabase) return;

  const [prof, meals, weight, diary] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('meals').select('*').eq('user_id', uid),
    supabase.from('weight_log').select('*').eq('user_id', uid),
    supabase.from('diary_items').select('*').eq('user_id', uid),
  ]);
  for (const r of [prof, meals, weight, diary]) if (r.error) throw r.error;

  if (prof.data) {
    useProfile.setState({
      profile: {
        sex: prof.data.sex as Sex,
        age: Number(prof.data.age),
        heightCm: Number(prof.data.height_cm),
        weightKg: Number(prof.data.weight_kg),
        activity: prof.data.activity as Activity,
        objective: prof.data.objective as Objective,
        targetWeightKg: prof.data.target_weight_kg ? Number(prof.data.target_weight_kg) : undefined,
        weeklyRateKg: prof.data.weekly_rate_kg ? Number(prof.data.weekly_rate_kg) : undefined,
        customMacros: (prof.data.custom_macros as CustomMacros) ?? undefined,
      },
      onboarded: Boolean(prof.data.onboarded),
    });
  }

  if (meals.data?.length) {
    const parsed: Meal[] = meals.data.map((m) => ({
      id: m.meal_id,
      name: m.name,
      time: m.time,
      emoji: m.emoji,
      pct: Number(m.pct),
    }));
    parsed.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    useMeals.setState({ meals: parsed });
  }

  if (weight.data?.length) {
    const log: Record<string, number> = {};
    for (const r of weight.data) log[r.date] = Number(r.kg);
    useWeight.setState({ log });
  }

  if (diary.data) {
    const days: DiaryDays = {};
    for (const r of diary.data) {
      const it: DiaryItem = {
        id: r.item_id,
        foodId: r.food_id,
        name: r.name,
        emoji: r.emoji,
        grams: Number(r.grams),
        portionLabel: r.portion_label,
        macros: r.macros,
      };
      if (!days[r.day]) days[r.day] = {};
      if (!days[r.day][r.meal_id]) days[r.day][r.meal_id] = [];
      days[r.day][r.meal_id].push(it);
    }
    useDiary.setState({ days });
  }
}
