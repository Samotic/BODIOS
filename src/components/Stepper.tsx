import { Minus, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export type StepperProps = {
  /** Visible label, e.g. "Sets". */
  label: string;
  /** What VoiceOver hears for this value, e.g. "Dumbbell Curl sets". */
  accessibilityName: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  testID?: string;
};

/**
 * A number with − and + buttons. Values stay within min..max, so there is no
 * free-typed input to validate.
 */
export function Stepper({
  label,
  accessibilityName,
  value,
  min,
  max,
  step,
  onChange,
  format = String,
  testID,
}: StepperProps) {
  const shown = format(value);
  return (
    // With large text sizes the −/value/+ group wraps below the label
    // instead of being pushed off the screen.
    <View style={styles.row} testID={testID}>
      <AppText tone="secondary" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.controls}>
        <IconButton
          label={`Decrease ${accessibilityName}`}
          icon={Minus}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - step))}
          testID={testID ? `${testID}-decrease` : undefined}
        />
        <AppText
          variant="bodyStrong"
          maxFontSizeMultiplier={1.6}
          style={styles.value}
          accessibilityLabel={`${accessibilityName}: ${shown}`}
          testID={testID ? `${testID}-value` : undefined}
        >
          {shown}
        </AppText>
        <IconButton
          label={`Increase ${accessibilityName}`}
          icon={Plus}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + step))}
          testID={testID ? `${testID}-increase` : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  // The label keeps its natural width (never breaking mid-word); when it
  // and the controls don't fit on one line, the controls wrap below.
  label: {
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: '100%',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 'auto',
  },
  value: {
    minWidth: 72,
    textAlign: 'center',
  },
});
