import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, spacing, typography } from '../../theme';
import { AppText } from '../AppText';
import { niceTicks } from './niceTicks';

export type LinePoint = {
  /** Short axis label, e.g. "12 Sep". */
  label: string;
  /** e.g. "Friday 12 September: 40 kg × 8" (readout, list and VoiceOver). */
  description: string;
  value: number;
};

type Props = {
  points: LinePoint[];
  /** Tick and end-label text, e.g. v => `${v} kg`. */
  formatValue: (value: number) => string;
  testID?: string;
};

const PLOT_HEIGHT = 150;
/** Room above the highest point for its value label. */
const PLOT_TOP = 24;
const AXIS_BAND = 24;
const Y_AXIS_WIDTH = 44;
const PAD_X = 10;

/**
 * Single-series trend line: 2pt line, 8pt markers with a 2pt surface ring,
 * the latest value labelled. Tap near a point for its details; every point
 * is a VoiceOver element; "Show numbers" lists them all.
 */
export function LineChart({ points, formatValue, testID }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const values = points.map(p => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values), 4);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const plotLeft = Y_AXIS_WIDTH + PAD_X;
  const plotWidth = Math.max(0, width - plotLeft - PAD_X);
  const x = (i: number) =>
    points.length === 1
      ? plotLeft + plotWidth / 2
      : plotLeft + (plotWidth * i) / (points.length - 1);
  const y = (v: number) =>
    PLOT_TOP + (1 - (v - lo) / (hi - lo || 1)) * (PLOT_HEIGHT - PLOT_TOP - 4);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`)
    .join(' ');
  const last = points.length - 1;
  // Label the first and last dates only; the rest are in the list.
  const labelledX = new Set([0, last]);

  return (
    <View testID={testID}>
      <View
        style={styles.chart}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 && points.length > 0 ? (
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
                {formatValue(tick)}
              </SvgText>
            ))}
            <Path
              d={path}
              stroke={colors.accent}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
            {points.map((p, i) => (
              <Circle
                key={`dot-${i}`}
                cx={x(i)}
                cy={y(p.value)}
                r={selected === i ? 6 : 4}
                fill={colors.accent}
                stroke={colors.surface}
                strokeWidth={2}
              />
            ))}
            <SvgText
              x={Math.min(x(selected ?? last), width - 4)}
              y={Math.max(12, y(points[selected ?? last].value) - 10)}
              fill={colors.text}
              fontSize={typography.caption.fontSize}
              fontWeight="600"
              textAnchor={x(selected ?? last) > width - 40 ? 'end' : 'middle'}
            >
              {formatValue(points[selected ?? last].value)}
            </SvgText>
            {points.map((p, i) =>
              labelledX.has(i) ? (
                <SvgText
                  key={`x-${i}`}
                  x={x(i)}
                  y={PLOT_HEIGHT + 17}
                  fill={colors.textSecondary}
                  fontSize={typography.caption.fontSize - 1}
                  textAnchor={
                    points.length === 1 ? 'middle' : i === 0 ? 'start' : 'end'
                  }
                >
                  {p.label}
                </SvgText>
              ) : null,
            )}
          </Svg>
        ) : null}

        {/* Each point owns the strip of chart nearest to it (split halfway
            between neighbours), so a tap never has to land on the dot. */}
        {width > 0
          ? points.map((p, i) => {
              const left = i === 0 ? Y_AXIS_WIDTH : (x(i - 1) + x(i)) / 2;
              const right = i === last ? width : (x(i) + x(i + 1)) / 2;
              return (
                <Pressable
                  key={`hit-${i}`}
                  style={[
                    styles.hit,
                    { left, width: Math.max(24, right - left) },
                  ]}
                  onPress={() =>
                    setSelected(current => (current === i ? null : i))
                  }
                  accessibilityRole="button"
                  accessibilityLabel={p.description}
                  accessibilityState={{ selected: selected === i }}
                  testID={testID ? `${testID}-point-${i}` : undefined}
                />
              );
            })
          : null}
      </View>

      <AppText
        variant="caption"
        tone="secondary"
        accessibilityLiveRegion="polite"
        style={styles.readout}
      >
        {selected !== null
          ? points[selected].description
          : 'Tap a point for its details.'}
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
          {points.map((p, i) => (
            <AppText key={`row-${i}`} tone="secondary">
              {p.description}
            </AppText>
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
  hit: {
    position: 'absolute',
    top: 0,
    bottom: 0,
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
});
