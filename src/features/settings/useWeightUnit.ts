import { useSettings } from '../../db/DatabaseProvider';
import type { WeightUnit } from './units';

/** The unit weights are shown and typed in (Profile → Units). */
export function useWeightUnit(): WeightUnit {
  return useSettings().settings.preferredUnit;
}
