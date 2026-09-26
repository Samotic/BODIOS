import { Check } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../../components';
import { colors, radii, spacing, touchTarget, typography } from '../../theme';
import type { TrackingType, WeightConvention } from '../exercises/types';
import { formatWeightNumber, type WeightUnit } from '../settings/units';
import {
  parseDurationInput,
  parseRepsInput,
  parseWeightInput,
} from './setRules';
import type { WorkoutSet } from './types';
import type { SetValues } from './workoutRepository';

type Props = {
  set: WorkoutSet;
  number: number;
  trackingType: TrackingType;
  weightConvention: WeightConvention;
  unit: WeightUnit;
  onSave: (values: Partial<SetValues>) => Promise<void>;
  onToggle: () => void;
  /** e.g. "Enter reps first." after trying to complete the set. */
  error?: string | null;
};

const weightText = (kg: number | null, unit: WeightUnit) =>
  kg === null ? '' : formatWeightNumber(kg, unit);
const repsText = (reps: number | null) => (reps === null ? '' : String(reps));
const durationText = (seconds: number | null) =>
  seconds === null
    ? ''
    : seconds >= 60
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    : String(seconds);

/**
 * One set: weight/reps (or time) fields and the done button. Keeps its own
 * text while typing so "12." isn't lost, saves each valid change straight
 * away, and shows typing mistakes under the row instead of saving them.
 */
export function SetRow({
  set,
  number,
  trackingType,
  weightConvention,
  unit,
  onSave,
  onToggle,
  error,
}: Props) {
  const [weight, setWeight] = useState(() => weightText(set.weightKg, unit));
  const [reps, setReps] = useState(() => repsText(set.reps));
  const [duration, setDuration] = useState(() =>
    durationText(set.durationSeconds),
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  // The field being typed in. Saved values arriving from the database never
  // overwrite it: they can lag a keystroke behind and would scramble input.
  const editing = useRef<'weight' | 'reps' | 'duration' | null>(null);

  // Take values saved elsewhere (e.g. "Use last time's numbers").
  useEffect(() => {
    if (editing.current === 'weight') {
      return;
    }
    setWeight(current => {
      const parsed = parseWeightInput(current, unit);
      return parsed.ok && parsed.value === set.weightKg
        ? current
        : weightText(set.weightKg, unit);
    });
  }, [set.weightKg, unit]);
  useEffect(() => {
    if (editing.current === 'reps') {
      return;
    }
    setReps(current => {
      const parsed = parseRepsInput(current);
      return parsed.ok && parsed.value === set.reps
        ? current
        : repsText(set.reps);
    });
  }, [set.reps]);
  useEffect(() => {
    if (editing.current === 'duration') {
      return;
    }
    setDuration(current => {
      const parsed = parseDurationInput(current);
      return parsed.ok && parsed.value === set.durationSeconds
        ? current
        : durationText(set.durationSeconds);
    });
  }, [set.durationSeconds]);

  const save = (values: Partial<SetValues>, revert: () => void) => {
    setFieldError(null);
    onSave(values).catch((e: unknown) => {
      setFieldError(e instanceof Error ? e.message : String(e));
      revert();
    });
  };

  const done = set.completedAt !== null;
  const shownError = fieldError ?? error ?? null;
  const unitLabel = weightConvention === 'added_load' ? `added ${unit}` : unit;

  return (
    <View style={styles.wrapper} testID={`set-${number}`}>
      <View style={[styles.row, done && styles.doneRow]}>
        <AppText
          variant="bodyStrong"
          style={styles.number}
          accessibilityLabel={`Set ${number}`}
        >
          {number}
        </AppText>

        {trackingType === 'weight_reps' ? (
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={text => {
              setWeight(text);
              const parsed = parseWeightInput(text, unit);
              if (!parsed.ok) {
                setFieldError(parsed.error);
              } else if (parsed.value !== set.weightKg) {
                save({ weightKg: parsed.value }, () =>
                  setWeight(weightText(set.weightKg, unit)),
                );
              } else {
                setFieldError(null);
              }
            }}
            placeholder="–"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            keyboardAppearance="dark"
            selectionColor={colors.accent}
            accessibilityLabel={`Set ${number} weight, ${unitLabel}`}
            testID={`set-${number}-weight`}
            onFocus={() => {
              editing.current = 'weight';
            }}
            onBlur={() => {
              editing.current = null;
            }}
          />
        ) : null}

        {trackingType === 'duration' ? (
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={text => {
              setDuration(text);
              const parsed = parseDurationInput(text);
              if (!parsed.ok) {
                setFieldError(parsed.error);
              } else if (parsed.value !== set.durationSeconds) {
                save({ durationSeconds: parsed.value }, () =>
                  setDuration(durationText(set.durationSeconds)),
                );
              } else {
                setFieldError(null);
              }
            }}
            placeholder="–"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            keyboardAppearance="dark"
            selectionColor={colors.accent}
            accessibilityLabel={`Set ${number} time, seconds or minutes:seconds`}
            testID={`set-${number}-time`}
            onFocus={() => {
              editing.current = 'duration';
            }}
            onBlur={() => {
              editing.current = null;
            }}
          />
        ) : (
          <TextInput
            style={styles.input}
            value={reps}
            onChangeText={text => {
              setReps(text);
              const parsed = parseRepsInput(text);
              if (!parsed.ok) {
                setFieldError(parsed.error);
              } else if (parsed.value !== set.reps) {
                save({ reps: parsed.value }, () => setReps(repsText(set.reps)));
              } else {
                setFieldError(null);
              }
            }}
            placeholder="–"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            keyboardAppearance="dark"
            selectionColor={colors.accent}
            accessibilityLabel={`Set ${number} reps`}
            testID={`set-${number}-reps`}
            onFocus={() => {
              editing.current = 'reps';
            }}
            onBlur={() => {
              editing.current = null;
            }}
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            done ? `Undo set ${number}` : `Mark set ${number} done`
          }
          accessibilityState={{ checked: done }}
          onPress={onToggle}
          hitSlop={4}
          style={({ pressed }) => [
            styles.check,
            done && styles.checkDone,
            pressed && styles.pressed,
          ]}
          testID={`set-${number}-toggle`}
        >
          {done ? (
            <Check color={colors.onAccent} size={22} strokeWidth={3} />
          ) : null}
        </Pressable>
      </View>
      {shownError ? (
        <AppText
          variant="caption"
          tone="danger"
          accessibilityLiveRegion="polite"
          style={styles.error}
        >
          Set {number}: {shownError}
        </AppText>
      ) : null}
    </View>
  );
}

/** Column titles that line up with SetRow. */
export function SetHeader({
  trackingType,
  weightConvention,
  unit,
}: {
  trackingType: TrackingType;
  weightConvention: WeightConvention;
  unit: WeightUnit;
}) {
  const weightTitle = weightConvention === 'added_load' ? `+${unit}` : unit;
  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant="label" tone="secondary" style={styles.number}>
        Set
      </AppText>
      {trackingType === 'weight_reps' ? (
        <AppText variant="label" tone="secondary" style={styles.headerCell}>
          {weightTitle}
        </AppText>
      ) : null}
      <AppText variant="label" tone="secondary" style={styles.headerCell}>
        {trackingType === 'duration' ? 'Time' : 'Reps'}
      </AppText>
      <View style={styles.checkHeader} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  doneRow: {
    opacity: 0.9,
  },
  number: {
    width: 32,
    textAlign: 'center',
  },
  input: {
    ...typography.bodyStrong,
    flex: 1,
    minHeight: touchTarget - 4,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
  },
  check: {
    width: touchTarget - 4,
    height: touchTarget - 4,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkHeader: {
    width: touchTarget - 4,
  },
  pressed: {
    opacity: 0.75,
  },
  error: {
    marginLeft: 32 + spacing.sm,
  },
});
