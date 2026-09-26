import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SearchX } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { AppText, Card, EmptyState, Screen } from '../../components';
import { LineChart } from '../../components/charts/LineChart';
import { useDataVersion, useRepositories } from '../../db/DatabaseProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { weightConventionLabels } from '../exercises/labels';
import { formatWeight, formatWeightNumber, kgToUnit } from '../settings/units';
import { useWeightUnit } from '../settings/useWeightUnit';
import { bestLifts, bestPerSession } from './metrics';
import { formatShortDate } from './ProgressScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseProgress'>;

/**
 * One exercise's best logged weight over time, for one load convention
 * (dumbbell weights are never mixed with barbell totals).
 */
export function ExerciseProgressScreen({ route, navigation }: Props) {
  const { exerciseId, weightConvention } = route.params;
  const { history, exercises } = useRepositories();
  const version = useDataVersion();
  const unit = useWeightUnit();
  const data = useAsyncData(
    async () => ({
      exercise: await exercises.getById(exerciseId),
      lifts: await history.liftSets({ exerciseId, weightConvention }),
    }),
    [history, exercises, exerciseId, weightConvention],
    version,
  );

  const name = data.status === 'ready' ? data.data.exercise?.name : undefined;
  useEffect(() => {
    if (name) {
      navigation.setOptions({ title: name });
    }
  }, [navigation, name]);

  if (data.status === 'loading') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  const lifts = data.status === 'ready' ? data.data.lifts : [];
  const best = bestLifts(lifts)[0];
  if (!best) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState
          icon={SearchX}
          title="No logged sets"
          message="Complete a weighted set of this exercise to see its progress."
          action={{ title: 'Go back', onPress: () => navigation.goBack() }}
        />
      </Screen>
    );
  }

  const trend = bestPerSession(lifts);
  const convention = weightConventionLabels[weightConvention];

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="exercise-progress">
      <AppText variant="display">{best.exerciseName}</AppText>
      {convention ? <AppText tone="secondary">{convention}</AppText> : null}

      <Card>
        <AppText variant="caption" tone="secondary">
          Best logged weight
        </AppText>
        <AppText variant="title" testID="exercise-best">
          {formatWeight(best.weightKg, unit)} × {best.reps}
        </AppText>
        <AppText tone="secondary">
          {formatShortDate(best.trainingLocalDate)}
        </AppText>
        <AppText variant="caption" tone="secondary">
          The heaviest set you’ve completed, not an estimated one-rep max.
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading">Best set per workout</AppText>
        <LineChart
          points={trend.map(point => ({
            label: new Date(
              `${point.trainingLocalDate}T12:00:00`,
            ).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
            description: `${formatShortDate(
              point.trainingLocalDate,
            )}: ${formatWeight(point.weightKg, unit)} × ${point.reps}`,
            value: kgToUnit(point.weightKg, unit),
          }))}
          formatValue={value => `${formatWeightNumber(value, 'kg')} ${unit}`}
          testID="trend-chart"
        />
      </Card>
    </Screen>
  );
}
