/**
 * The privacy policy shown in the app. docs/PRIVACY-POLICY.md is the copy to
 * host on the web; __tests__/privacyPolicy.test.ts checks the two match.
 * Keep it true to what the app actually does: update it before adding
 * accounts, analytics, crash reporting or anything that uses the network.
 */
export const PRIVACY_POLICY_UPDATED = '26 September 2026';

export const privacyPolicy: Array<{ heading: string; body: string }> = [
  {
    heading: 'Summary',
    body: 'Bodios keeps your workouts on your iPhone. It has no accounts, no ads, no analytics and no tracking, and it doesn’t send your data anywhere.',
  },
  {
    heading: 'What Bodios stores',
    body: 'Your routines, workouts (exercises, weights, reps, times and notes) and settings. They are stored in the app’s private storage on this iPhone.',
  },
  {
    heading: 'What leaves your iPhone',
    body: 'Nothing, unless you choose Export data, which hands a copy to the place you pick in the share sheet. Your iPhone’s own backups (iCloud or a computer) may include the app’s data, according to your device settings.',
  },
  {
    heading: 'Network',
    body: 'Bodios makes no network connections. Exercise instructions and any demo videos are built into the app.',
  },
  {
    heading: 'Deleting your data',
    body: 'Use Profile → Delete all data, or delete the app. Deleted data can’t be recovered from Bodios.',
  },
  {
    heading: 'Health and safety',
    body: 'Exercise instructions are general guidance, not medical advice. Stop if anything hurts, and ask a qualified professional if you’re unsure.',
  },
  {
    heading: 'Changes',
    body: 'If Bodios ever starts collecting or sharing data, this policy and the app will say so before it happens.',
  },
];
