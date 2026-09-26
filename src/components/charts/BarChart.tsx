import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, spacing, typography } from '../../theme';
import { AppText } from '../AppText';
import { countTicks } from './niceTicks';

export type BarDatum = {
  /** Short axis label, e.g. "Mon". */
  label: string;
  /** Spoken and shown in the readout, e.g. "Monday 21 September". */
  longLabel: string;
  value: number;
};

type Props = {
  data: BarDatum[];
  /** e.g. n => `${n} workouts` */
  formatValue: (value: number) => string;
  testID?: string;
};

const PLOT_HEIGHT = 140;
/** Room above the tallest column for its value and the top tick. */
const PLOT_TOP = 20;
const AXIS_BAND = 24;
const Y_AXIS_WIDTH = 24;
const MAX_BAR = 24;
const RADIUS = 4;

/** Column with a rounded 4pt top and a square base on the baseline. */
function columnPath(
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  const r = Math.min(RADIUS, width / 2, height);
  const bottom = y + height;
  return [
    `M${x},${bottom}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${bottom}`,
    'Z',
  ].join(' ');
}

/**
 * Single-series column chart (counts). One colour, so no legend: the card
 * title names what's plotted. The highest column is labelled; tap any column
 * for its value; every column is its own VoiceOver element; "Show numbers"
 * gives the same data as a list.
 */
export function BarChart({ data, formatValue, testID }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(0, ...data.map(d => d.value));
  const ticks = countTicks(max);
  const top = ticks[ticks.length - 1];
  const plotWidth = Math.max(0, width - Y_AXIS_WIDTH);
  const slot = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = Math.min(MAX_BAR, slot * 0.6);
  const y = (value: number) =>
    PLOT_TOP + (1 - value / top) * (PLOT_HEIGHT - PLOT_TOP);
  const maxIndex = max > 0 ? data.findIndex(d => d.value === max) : -1;
  const labelled = selected ?? maxIndex;

  return (
    <View testID={testID}>
      <View
        style={styles.chart}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Svg width={width} height={PLOT_HEIGHT + AXIS_BAND}>
            {ticks.map(tick => (
              <Line
                key={`grid-${tick}`}
                x1={Y_AXIS_WIDTH}
                x2={width}
                y1={y(tick)}
                y2={y(tick)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            {ticks.map(tick => (
              <SvgText
                key={`tick-${tick}`}
                x={0}
                y={y(tick) + 4}
                fill={colors.textSecondary}
                fontSize={typography.caption.fontSize - 2}
              >
                {tick}
              </SvgText>
            ))}
            {data.map((d, i) => {
              const cx = Y_AXIS_WIDTH + slot * i + slot / 2;
              return d.value > 0 ? (
                <Path
                  key={`bar-${i}`}
                  d={columnPath(
                    cx - barWidth / 2,
                    y(d.value),
                    barWidth,
                    PLOT_HEIGHT - y(d.value),
                  )}
                  fill={colors.accent}
                  opacity={selected === null || selected === i ? 1 : 0.45}
                />
              ) : null;
            })}
            {labelled >= 0 && data[labelled].value > 0 ? (
              <SvgText
                x={Y_AXIS_WIDTH + slot * labelled + slot / 2}
                y={Math.max(12, y(data[labelled].value) - 6)}
                fill={colors.text}
                fontSize={typography.caption.fontSize}
                fontWeight="600"
                textAnchor="middle"
              >
                {data[labelled].value}
              </SvgText>
            ) : null}
            {data.map((d, i) => (
              <SvgText
                key={`x-${i}`}
                x={Y_AXIS_WIDTH + slot * i + slot / 2}
                y={PLOT_HEIGHT + 17}
                fill={colors.textSecondary}
                fontSize={typography.caption.fontSize - 1}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            ))}
          </Svg>
        ) : null}

        {/* Tap targets: the whole column slot, not just the painted bar. */}
        <View style={[styles.hitRow, { left: Y_AXIS_WIDTH }]}>
          {data.map((d, i) => (
            <Pressable
              key={`hit-${i}`}
              style={styles.hit}
              onPress={() => setSelected(current => (current === i ? null : i))}
              accessibilityRole="button"
              accessibilityLabel={`${d.longLabel}: ${formatValue(d.value)}`}
              accessibilityState={{ selected: selected === i }}
              testID={testID ? `${testID}-bar-${i}` : undefined}
            />
          ))}
        </View>
      </View>

      <AppText
        variant="caption"
        tone="secondary"
        accessibilityLiveRegion="polite"
        style={styles.readout}
      >
        {selected !== null
          ? `${data[selected].longLabel}: ${formatValue(data[selected].value)}`
          : 'Tap a column for its value.'}
      </AppText>

      <Pressable
        onPress={() => setShowTable(s => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showTable }}
        style={styles.toggle}
        testID={testID ? `${testID}-table-toggle` : undefined}
      >
        <AppText variant="bodyStrong" tone="accent">
          {showTable ? 'Hide numbers' : 'Show numbers'}
        </AppText>
      </Pressable>
      {showTable ? (
        <View style={styles.table}>
          {data.map((d, i) => (
            <View key={`row-${i}`} style={styles.tableRow}>
              <AppText tone="secondary" style={styles.flex}>
                {d.longLabel}
              </AppText>
              <AppText variant="bodyStrong">{formatValue(d.value)}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: PLOT_HEIGHT + AXIS_BAND,
  },
  hitRow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  hit: {
    flex: 1,
  },
  readout: {
    marginTop: spacing.xs,
  },
  toggle: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  table: {
    gap: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
