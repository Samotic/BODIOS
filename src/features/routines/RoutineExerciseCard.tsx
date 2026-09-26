import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, IconButton, Stepper } from '../../components';
import { weightConventionLabels } from '../exercises/labels';
import { formatSeconds, limits } from './rules';
import type { RoutineExercise, RoutineTargets } from './types';

type Props = {
  item: RoutineExercise;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  onChangeTargets: (targets: RoutineTargets) => void;
  onMove: (direction: 'up' | 'down') => void;
  onRemove: () => void;
};

function targetsOf(item: RoutineExercise): RoutineTargets {
  return {
    targetSets: item.targetSets,
    targetReps: item.targetReps,
    targetDurationSeconds: item.targetDurationSeconds,
    restSeconds: item.restSeconds,
  };
}

/**
 * One exercise in the routine editor: its targets (sets, reps or time, rest)
 * and up/down/remove controls. Changes save immediately; the card keeps its
 * own copy so fast repeated taps build on each other.
 */
export function RoutineExerciseCard({
  item,
  number,
  isFirst,
  isLast,
  onChangeTargets,
  onMove,
  onRemove,
}: Props) {
  const [targets, setTargets] = useState(() => targetsOf(item));
  const { targetSets, targetReps, targetDurationSeconds, restSeconds } = item;

  // Take saved values from the database when they change.
  useEffect(() => {
    setTargets({ targetSets, targetReps, targetDurationSeconds, restSeconds });
  }, [targetSets, targetReps, targetDurationSeconds, restSeconds]);

  const change = (patch: Partial<RoutineTargets>) => {
    const next = { ...targets, ...patch };
    setTargets(next);
    onChangeTargets(next);
  };

  const name = item.exerciseName;
  const convention = weightConventionLabels[item.weightConvention];

  return (
    <Card testID={`routine-item-${item.exerciseId}`}>
      <View style={styles.titleRow}>
        <AppText variant="heading" style={styles.title}>
          {number}. {name}
        </AppText>
      </View>
      {convention ? (
        <AppText variant="caption" tone="secondary">
          {convention}
        </AppText>
      ) : null}

      <Stepper
        label="Sets"
        accessibilityName={`${name} sets`}
        value={targets.targetSets}
        {...limits.sets}
        onChange={value => change({ targetSets: value })}
        testID={`${item.exerciseId}-sets`}
      />
      {item.trackingType === 'duration' ? (
        <Stepper
          label="Time"
          accessibilityName={`${name} time per set`}
          value={targets.targetDurationSeconds ?? limits.durationSeconds.min}
          {...limits.durationSeconds}
          format={formatSeconds}
          onChange={value => change({ targetDurationSeconds: value })}
          testID={`${item.exerciseId}-time`}
        />
      ) : (
        <Stepper
          label="Reps"
          accessibilityName={`${name} reps`}
          value={targets.targetReps ?? limits.reps.min}
          {...limits.reps}
          onChange={value => change({ targetReps: value })}
          testID={`${item.exerciseId}-reps`}
        />
      )}
      <Stepper
        label="Rest"
        accessibilityName={`${name} rest`}
        value={targets.restSeconds}
        {...limits.restSeconds}
        format={formatSeconds}
        onChange={value => change({ restSeconds: value })}
        testID={`${item.exerciseId}-rest`}
      />

      <View style={styles.actions}>
        <IconButton
          label={`Move ${name} up`}
          icon={ArrowUp}
          disabled={isFirst}
          onPress={() => onMove('up')}
          testID={`${item.exerciseId}-up`}
        />
        <IconButton
          label={`Move ${name} down`}
          icon={ArrowDown}
          disabled={isLast}
          onPress={() => onMove('down')}
          testID={`${item.exerciseId}-down`}
        />
        <View style={styles.spacer} />
        <IconButton
          label={`Remove ${name} from routine`}
          icon={Trash2}
          onPress={onRemove}
          testID={`${item.exerciseId}-remove`}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  spacer: {
    flex: 1,
  },
});
