import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { NoFoco } from '@/constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  consumed: number;
  goal: number;
  size?: number;
};

/** Ponto no arco (t em radianos, sistema y-para-baixo). */
function pt(cx: number, cy: number, r: number, t: number) {
  return [cx + r * Math.cos(t), cy + r * Math.sin(t)] as const;
}

/** Medidor semicircular (estilo velocímetro) que enche com animação. */
export function CalorieGauge({ consumed, goal, size = 200 }: Props) {
  const width = size;
  const sw = 14;
  const r = width / 2 - sw / 2 - 2;
  const cx = width / 2;
  const cy = width / 2 + r / 2; // desce o centro p/ mostrar só a metade de cima
  // altura reserva espaço para o bloco de texto (número + meta + %) abaixo do arco
  const height = Math.ceil(cy + 48);

  const [lx, ly] = pt(cx, cy, r, Math.PI); // esquerda
  const [rx, ry] = pt(cx, cy, r, 2 * Math.PI); // direita
  const arcPath = `M ${lx} ${ly} A ${r} ${r} 0 0 1 ${rx} ${ry}`;
  const arcLen = Math.PI * r;

  const fraction = Math.max(0, Math.min(1, goal > 0 ? consumed / goal : 0));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(fraction, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [fraction, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLen * (1 - progress.value),
  }));

  const pct = Math.round(fraction * 100);
  const remaining = Math.max(0, goal - consumed);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={arcPath} stroke={NoFoco.surface2} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <AnimatedPath
          d={arcPath}
          stroke={NoFoco.kcal}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={arcLen}
          animatedProps={animatedProps}
        />
      </Svg>

      {/* bloco único: número + meta + % — centralizado, começa dentro da "tigela" */}
      <View style={[styles.readout, { top: cy - 44, width }]}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {consumed.toLocaleString('pt-BR')}
        </Text>
        <Text style={styles.goal} numberOfLines={1}>
          / {goal.toLocaleString('pt-BR')} kcal
        </Text>
        <Text style={styles.pct} numberOfLines={1} adjustsFontSizeToFit>
          {pct}% da meta · {remaining.toLocaleString('pt-BR')} restantes
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { position: 'absolute', alignItems: 'center', paddingHorizontal: 12 },
  value: {
    color: NoFoco.ink,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  goal: { color: NoFoco.soft, fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  pct: {
    color: NoFoco.accent,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
});
