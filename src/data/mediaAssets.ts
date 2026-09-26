/**
 * Demo files bundled inside the app, keyed by the `localAssetKey` /
 * `posterAssetKey` used in mediaCatalogue.ts (the exercise id).
 *
 * React Native can only bundle files it can see in a literal require(), so
 * each clip needs a line here. The files are made by
 * scripts/make-exercise-clips.sh; see README, "Exercise videos".
 */
export const bundledVideos: Record<string, number> = {
  'barbell-back-squat': require('../../assets/exercises/barbell-back-squat.mp4'),
  'barbell-bench-press': require('../../assets/exercises/barbell-bench-press.mp4'),
  'cable-triceps-pushdown': require('../../assets/exercises/cable-triceps-pushdown.mp4'),
  'dumbbell-bench-press': require('../../assets/exercises/dumbbell-bench-press.mp4'),
  'dumbbell-curl': require('../../assets/exercises/dumbbell-curl.mp4'),
  'dumbbell-lateral-raise': require('../../assets/exercises/dumbbell-lateral-raise.mp4'),
  'dumbbell-shoulder-press': require('../../assets/exercises/dumbbell-shoulder-press.mp4'),
  'goblet-squat': require('../../assets/exercises/goblet-squat.mp4'),
  'hammer-curl': require('../../assets/exercises/hammer-curl.mp4'),
  'incline-dumbbell-press': require('../../assets/exercises/incline-dumbbell-press.mp4'),
  'lat-pulldown': require('../../assets/exercises/lat-pulldown.mp4'),
  'leg-press': require('../../assets/exercises/leg-press.mp4'),
  'one-arm-dumbbell-row': require('../../assets/exercises/one-arm-dumbbell-row.mp4'),
  'overhead-dumbbell-triceps-extension': require('../../assets/exercises/overhead-dumbbell-triceps-extension.mp4'),
  plank: require('../../assets/exercises/plank.mp4'),
  'pull-up': require('../../assets/exercises/pull-up.mp4'),
  'push-up': require('../../assets/exercises/push-up.mp4'),
  'romanian-deadlift': require('../../assets/exercises/romanian-deadlift.mp4'),
  'seated-cable-row': require('../../assets/exercises/seated-cable-row.mp4'),
};

export const bundledPosters: Record<string, number> = {
  'barbell-back-squat': require('../../assets/exercises/barbell-back-squat.jpg'),
  'barbell-bench-press': require('../../assets/exercises/barbell-bench-press.jpg'),
  'cable-triceps-pushdown': require('../../assets/exercises/cable-triceps-pushdown.jpg'),
  'dumbbell-bench-press': require('../../assets/exercises/dumbbell-bench-press.jpg'),
  'dumbbell-curl': require('../../assets/exercises/dumbbell-curl.jpg'),
  'dumbbell-lateral-raise': require('../../assets/exercises/dumbbell-lateral-raise.jpg'),
  'dumbbell-shoulder-press': require('../../assets/exercises/dumbbell-shoulder-press.jpg'),
  'goblet-squat': require('../../assets/exercises/goblet-squat.jpg'),
  'hammer-curl': require('../../assets/exercises/hammer-curl.jpg'),
  'incline-dumbbell-press': require('../../assets/exercises/incline-dumbbell-press.jpg'),
  'lat-pulldown': require('../../assets/exercises/lat-pulldown.jpg'),
  'leg-press': require('../../assets/exercises/leg-press.jpg'),
  'one-arm-dumbbell-row': require('../../assets/exercises/one-arm-dumbbell-row.jpg'),
  'overhead-dumbbell-triceps-extension': require('../../assets/exercises/overhead-dumbbell-triceps-extension.jpg'),
  plank: require('../../assets/exercises/plank.jpg'),
  'pull-up': require('../../assets/exercises/pull-up.jpg'),
  'push-up': require('../../assets/exercises/push-up.jpg'),
  'romanian-deadlift': require('../../assets/exercises/romanian-deadlift.jpg'),
  'seated-cable-row': require('../../assets/exercises/seated-cable-row.jpg'),
};
