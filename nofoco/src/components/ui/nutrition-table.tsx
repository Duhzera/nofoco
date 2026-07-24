import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NoFoco, Radius, Spacing } from '@/constants/theme';
import type { Nutrients } from '@/data/foods';
import { formatNutrient, NUTRIENT_GROUPS, sumNutrient, type NutrientDef } from '@/lib/nutrition';

type Props = {
  /** Tabelas a somar: uma só (tela de porção) ou várias (total da refeição). */
  sources: Nutrients[];
  /** Texto do cabeçalho fechado. */
  label?: string;
  defaultOpen?: boolean;
};

/**
 * Tabela nutricional completa, recolhida por padrão.
 *
 * Mostra todos os nutrientes que o app conhece, inclusive os que a fonte não
 * informou — esses aparecem como "—". Quando parte dos itens não traz um dado,
 * o total ganha um asterisco: é um piso, não o valor real.
 */
export function NutritionTable({ sources, label = 'Tabela nutricional completa', defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (sources.length === 0) return null;

  const anyPartial = NUTRIENT_GROUPS.some((g) =>
    g.rows.some((r) => {
      const s = sumNutrient(sources, r.key);
      return s !== null && !s.complete;
    }),
  );

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}>
        <Ionicons name="nutrition-outline" size={17} color={NoFoco.micro} />
        <Text style={styles.headerText}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={NoFoco.soft} />
      </Pressable>

      {open && (
        <View style={styles.body}>
          {NUTRIENT_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.rows.map((row) => (
                <Row key={row.key} def={row} sources={sources} />
              ))}
            </View>
          ))}

          {anyPartial && (
            <Text style={styles.note}>
              * Nem todos os itens informam este nutriente — o total considera só quem informa.
            </Text>
          )}
          <Text style={styles.note}>
            “—” significa que a fonte não informa o dado, e não que o valor seja zero.
          </Text>
        </View>
      )}
    </View>
  );
}

function Row({ def, sources }: { def: NutrientDef; sources: Nutrients[] }) {
  const sum = sumNutrient(sources, def.key);
  const partial = sum !== null && !sum.complete;

  return (
    <View style={styles.row}>
      {def.color && !def.child && <View style={[styles.dot, { backgroundColor: def.color }]} />}
      <Text style={[styles.label, def.child && styles.labelChild, !def.color && !def.child && styles.labelNoDot]}>
        {def.label}
      </Text>
      <Text style={[styles.value, !sum && styles.valueEmpty]}>
        {formatNutrient(sum, def.unit)}
        {partial ? ' *' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: NoFoco.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NoFoco.hair,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerText: { flex: 1, color: NoFoco.ink, fontSize: 13, fontWeight: '700' },

  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: NoFoco.faint,
  },
  group: { marginTop: Spacing.md },
  groupTitle: {
    color: NoFoco.soft,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NoFoco.faint,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { flex: 1, color: NoFoco.ink, fontSize: 12.5 },
  labelNoDot: { marginLeft: 15 },
  labelChild: { marginLeft: 15, color: NoFoco.soft, fontSize: 12 },
  value: {
    color: NoFoco.ink,
    fontSize: 12.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  valueEmpty: { color: NoFoco.soft, fontWeight: '500' },
  note: { color: NoFoco.soft, fontSize: 10.5, lineHeight: 15, marginTop: Spacing.sm },
});
