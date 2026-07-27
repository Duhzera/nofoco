import { useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { NoFoco } from '@/constants/theme';
import { formatDayMonth } from '@/lib/date';
import { formatKg, type WeightEntry } from '@/store/weight';

type Props = {
  series: WeightEntry[];
  /** Linha tracejada de peso-alvo. */
  target?: number;
  height?: number;
};

/**
 * Gráfico de linha da evolução de peso, desenhado em SVG (react-native-svg).
 *
 * Os pontos são espaçados por ordem de registro, não pela distância real entre as
 * datas — com poucas medições isso lê melhor e não espreme tudo num canto. O eixo Y
 * se ajusta aos valores (mais o alvo), com uma folga para a linha não colar na borda.
 */
export function WeightChart({ series, target, height = 168 }: Props) {
  // largura inicial estimada pela janela (menos as margens do cartão/tela); o onLayout
  // refina para a largura real. Sem o palpite inicial, o react-native-web às vezes não
  // mede a tempo e o gráfico não aparecia.
  const [w, setW] = useState(() => Math.max(0, Dimensions.get('window').width - 64));
  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - w) > 1) setW(width);
  };

  const padL = 36;
  const padR = 14;
  const padT = 14;
  const padB = 22;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;

  const values = series.map((s) => s.kg);
  const domainVals = target ? [...values, target] : values;
  let min = Math.min(...domainVals);
  let max = Math.max(...domainVals);
  if (min === max) {
    // uma única medição (ou todas iguais): abre uma janela de ±1 kg para não achatar
    min -= 1;
    max += 1;
  } else {
    const pad = (max - min) * 0.18;
    min -= pad;
    max += pad;
  }

  const n = series.length;
  const x = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (innerW * i) / (n - 1));
  const y = (kg: number) => padT + innerH * (1 - (kg - min) / (max - min));

  const linePath = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s.kg)}`).join(' ');

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {/* rótulos do eixo Y: topo e base */}
          <SvgText x={padL - 6} y={padT + 4} fontSize={9} fill={NoFoco.soft} textAnchor="end">
            {formatKg(Math.round(max * 10) / 10)}
          </SvgText>
          <SvgText x={padL - 6} y={height - padB + 4} fontSize={9} fill={NoFoco.soft} textAnchor="end">
            {formatKg(Math.round(min * 10) / 10)}
          </SvgText>

          {/* linha de alvo */}
          {target !== undefined && target >= min && target <= max && (
            <>
              <Line
                x1={padL}
                y1={y(target)}
                x2={w - padR}
                y2={y(target)}
                stroke={NoFoco.accent}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.7}
              />
              <SvgText x={w - padR} y={y(target) - 4} fontSize={9} fill={NoFoco.accent} textAnchor="end">
                alvo {formatKg(target)}
              </SvgText>
            </>
          )}

          {/* linha do peso */}
          {n > 1 && <Path d={linePath} stroke={NoFoco.protein} strokeWidth={2.5} fill="none" />}

          {/* pontos */}
          {series.map((s, i) => (
            <Circle
              key={s.date}
              cx={x(i)}
              cy={y(s.kg)}
              r={i === n - 1 ? 4.5 : 3}
              fill={i === n - 1 ? NoFoco.ink : NoFoco.protein}
              stroke={NoFoco.surface}
              strokeWidth={1.5}
            />
          ))}

          {/* rótulos do eixo X: primeira e última data */}
          <SvgText x={x(0)} y={height - 6} fontSize={9} fill={NoFoco.soft} textAnchor="start">
            {formatDayMonth(series[0].date)}
          </SvgText>
          {n > 1 && (
            <SvgText x={x(n - 1)} y={height - 6} fontSize={9} fill={NoFoco.soft} textAnchor="end">
              {formatDayMonth(series[n - 1].date)}
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
