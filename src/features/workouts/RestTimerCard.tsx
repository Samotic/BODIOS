import { Pause, Play, Timer } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { AppText, IconButton } from '../../components';
import { formatClock } from '../../lib/dates';
import { useNow } from '../../hooks/useNow';
import { colors, radii, spacing } from '../../theme';
import { isActive, isPaused, remainingMs, type RestTimer } from './restTimer';

type Props = {
  timer: RestTimer;
  onPause: () => void;
  onResume: () => void;
  onAdjust: (deltaMs: number) => void;
  onSkip: () => void;
};

/**
 * Compact rest countdown, shown in the workout's pinned footer so it's
 * always in view. The remaining time is worked out from the stored end time
 * every second, so it stays right after the app was in the background or
 * closed. No alarm plays in the background.
 */
export function RestTimerCard({
  timer,
  onPause,
  onResume,
  onAdjust,
  onSkip,
}: Props) {
  const paused = isPaused(timer);
  const now = useNow(isActive(timer) && !paused);
  const remaining = remainingMs(timer, now) ?? 0;
  const over = !paused && remaining === 0;

  // Tell VoiceOver users once when rest is over.
  const announced = useRef(false);
  useEffect(() => {
    if (over && !announced.current) {
      announced.current = true;
      AccessibilityInfo.announceForAccessibility('Rest over');
    }
    if (!over) {
      announced.current = false;
    }
  }, [over]);

  if (!isActive(timer)) {
    return null;
  }

  return (
    <View style={styles.bar} testID="rest-timer">
      <View style={styles.time}>
        <Timer color={colors.accent} size={24} />
        <View>
          <AppText variant="caption" tone="secondary">
            {over ? 'Rest over' : paused ? 'Rest paused' : 'Rest timer'}
          </AppText>
          <AppText
            variant="heading"
            accessibilityRole="timer"
            accessibilityLabel={
              over ? 'Rest over' : `${formatClock(remaining)} rest remaining`
            }
            testID="rest-remaining"
          >
            {formatClock(remaining)}
          </AppText>
        </View>
      </View>
      <View style={styles.buttons}>
        {!over ? (
          <>
            <IconButton
              label="15 seconds less rest"
              text="−15"
              onPress={() => onAdjust(-15_000)}
              testID="rest-minus"
            />
            <IconButton
              label={paused ? 'Resume rest timer' : 'Pause rest timer'}
              icon={paused ? Play : Pause}
              onPress={paused ? onResume : onPause}
              testID="rest-toggle"
            />
            <IconButton
              label="15 seconds more rest"
              text="+15"
              onPress={() => onAdjust(15_000)}
              testID="rest-plus"
            />
          </>
        ) : null}
        <IconButton
          label={over ? 'Close rest timer' : 'Skip rest'}
          text={over ? 'Done' : 'Skip'}
          onPress={onSkip}
          testID="rest-skip"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 96,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
