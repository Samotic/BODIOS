import type { ExerciseMedia } from '../features/exercises/types';

/**
 * Demonstration clips bundled with the app, one per exercise, with where
 * each came from and the licence that lets Bodios ship it. The clips were
 * trimmed and re-encoded by scripts/make-exercise-clips.sh (same sources,
 * same trims); docs/MEDIA-CREDITS.md is the human-readable copy of this list.
 *
 * Only footage licensed for use in apps is used: nothing here needed payment
 * or a private permission. Before adding a clip, check that it shows exactly the
 * exercise it is attached to, and record its source and licence below.
 */

export type MediaLicence =
  | 'CC BY-SA 4.0'
  | 'CC BY 3.0'
  | 'Pexels License'
  | 'Your Move free licence';

export const licenceUrls: Record<MediaLicence, string> = {
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'Pexels License': 'https://www.pexels.com/license/',
  'Your Move free licence': 'https://ymove.app/free-exercise-videos',
};

/** What each licence asks of us, stored as the clip's permission notes. */
const licenceTerms: Record<MediaLicence, string> = {
  'CC BY-SA 4.0':
    'Creative Commons Attribution-ShareAlike 4.0: commercial use and changes allowed with credit to the author, a link to the licence and the source, and a note of changes. The trimmed clip is shared under the same licence.',
  'CC BY 3.0':
    'Creative Commons Attribution 3.0: commercial use and changes allowed with credit to the author, a link to the licence and the source.',
  'Pexels License':
    'Pexels License: free to use in apps, including commercially, and to modify; credit not required (given anyway). Must not imply that the people shown endorse Bodios, and the clip must not be resold on its own.',
  'Your Move free licence':
    'Your Move free clips: "Free for commercial use. Use in your app, website, social media or client materials." Credit appreciated, not required (given anyway). Must not be sold or redistributed as a standalone product or library.',
};

export type MediaCredit = {
  exerciseId: string;
  /** Title of the original clip (or, for wger, its exercise page). */
  title: string;
  author: string;
  authorUrl: string | null;
  sourceName: 'wger.de' | 'Wikimedia Commons' | 'Pexels' | 'Your Move';
  /** Page describing the original. */
  sourceUrl: string;
  /** The exact file the bundled clip was made from. */
  fileUrl: string;
  licence: MediaLicence;
  /** Length of the bundled clip, in seconds. */
  durationSeconds: number;
  /** Anything notable beyond trimming and re-encoding. */
  note?: string;
  /** Shown under the player when the clip differs from the written steps. */
  demoNote?: string;
};

const wger = (
  exerciseId: string,
  wgerId: number,
  title: string,
  file: string,
  durationSeconds: number,
): MediaCredit => ({
  exerciseId,
  title,
  author: 'Goulart',
  authorUrl: null,
  sourceName: 'wger.de',
  sourceUrl: `https://wger.de/en/exercise/${wgerId}/view-base`,
  fileUrl: `https://wger.de/media/exercise-video/${wgerId}/${file}`,
  licence: 'CC BY-SA 4.0',
  durationSeconds,
});

const pexels = (
  exerciseId: string,
  title: string,
  slug: string,
  author: string,
  authorUrl: string,
  durationSeconds: number,
): MediaCredit => ({
  exerciseId,
  title,
  author,
  authorUrl,
  sourceName: 'Pexels',
  sourceUrl: `https://www.pexels.com/video/${slug}/`,
  fileUrl: `https://www.pexels.com/download/video/${slug.split('-').pop()}/`,
  licence: 'Pexels License',
  durationSeconds,
});

export const mediaCredits: MediaCredit[] = [
  wger(
    'dumbbell-curl',
    92,
    'Biceps Curls With Dumbbell',
    '8bfb917c-3d0d-49b9-8073-5d7e01c1b894.MOV',
    10.9,
  ),
  wger(
    'hammer-curl',
    272,
    'Hammer Curls',
    'df069052-2173-4f24-855f-a0eebe729f24.MOV',
    10.3,
  ),
  wger(
    'dumbbell-bench-press',
    75,
    'Benchpress Dumbbells',
    '080c799b-8afd-4130-8d72-9cef0cd79f54.MOV',
    14.1,
  ),
  {
    ...wger(
      'barbell-bench-press',
      73,
      'Bench Press',
      '255b3509-e454-48a6-bf66-c7ca482be21a.MOV',
      12,
    ),
    note: 'The original is low resolution (640×352).',
  },
  wger(
    'incline-dumbbell-press',
    537,
    'Incline Bench Press - Dumbbell',
    'b9c937e9-daeb-42a9-be8e-7a77e368478c.MOV',
    10.2,
  ),
  wger(
    'dumbbell-lateral-raise',
    348,
    'Lateral Raises',
    'de69928a-8a35-4096-821c-1f46de5e0e03.MOV',
    9.6,
  ),
  wger(
    'dumbbell-shoulder-press',
    567,
    'Shoulder Press, Dumbbells',
    '64f33c19-1d96-4b7c-af17-6c6a4941c614.MOV',
    12,
  ),
  wger(
    'seated-cable-row',
    512,
    'Rowing seated, narrow grip',
    'fff4c294-93f0-4926-b3a2-bf59ad4afaa5.MOV',
    10.4,
  ),
  wger(
    'leg-press',
    371,
    'Leg Press',
    '6aae16b4-01b9-4eb4-935c-3250f84d2c59.MOV',
    13,
  ),
  {
    ...wger(
      'romanian-deadlift',
      507,
      'Romanian Deadlift',
      '6b6054b5-9236-4a63-8392-6ea7a9010ca6.MOV',
      12,
    ),
    note: 'Shown with dumbbells; no openly licensed barbell clip was found.',
    demoNote:
      'Shown with dumbbells. With a barbell the movement is the same: push your hips back and keep the bar close to your legs.',
  },
  wger(
    'overhead-dumbbell-triceps-extension',
    211,
    'Dumbbell Triceps Extension',
    '85f6eb25-a76c-409e-9af9-497794ac0dfb.MOV',
    9.5,
  ),
  {
    exerciseId: 'barbell-back-squat',
    title: 'Squat - exercise demonstration video',
    author: 'FitnessScape',
    authorUrl: null,
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Squat_-_exercise_demonstration_video.webm',
    fileUrl:
      'https://upload.wikimedia.org/wikipedia/commons/5/5c/Squat_-_exercise_demonstration_video.webm',
    licence: 'CC BY 3.0',
    durationSeconds: 7.1,
    note: 'Cut from FitnessScape’s “Half Rack Workout” video; the “SQUAT” caption is part of the original.',
  },
  pexels(
    'push-up',
    'Man Doing Push-ups',
    'man-doing-push-ups-4964649',
    'olia danilevich',
    'https://www.pexels.com/@olia-danilevich/',
    12.5,
  ),
  pexels(
    'plank',
    'A Woman Planking',
    'a-woman-planking-6023273',
    'Kampus Production',
    'https://www.pexels.com/@kampus/',
    9.3,
  ),
  pexels(
    'lat-pulldown',
    'Back Workout in Gym with Lat Pulldown Machine',
    'back-workout-in-gym-with-lat-pulldown-machine-35585699',
    'khezez | خزاز',
    'https://www.pexels.com/@khezez/',
    9.1,
  ),
  pexels(
    'one-arm-dumbbell-row',
    'Man Working Out at the Gym',
    'man-working-out-at-the-gym-7187392',
    'RDNE Stock project',
    'https://www.pexels.com/@rdne/',
    12,
  ),
  pexels(
    'cable-triceps-pushdown',
    'Focused Gym Workout Featuring Tricep Pulldown',
    'focused-gym-workout-featuring-tricep-pulldown-39043777',
    'Bennit Antony',
    'https://www.pexels.com/@bennit-antony-2161989944/',
    6.6,
  ),
  {
    ...pexels(
      'pull-up',
      'Gym Pull Ups',
      'gym-pull-ups-15859716',
      'Sport O’Scope',
      'https://www.pexels.com/@aleksm/',
      9.4,
    ),
    note: 'Cropped at the sides to the pull-up station; the whole body stays in frame.',
  },
  {
    exerciseId: 'goblet-squat',
    title: 'Dumbbell Goblet Squat',
    author: 'Your Move',
    authorUrl: 'https://ymove.app/',
    sourceName: 'Your Move',
    sourceUrl: 'https://ymove.app/free-exercise-videos',
    fileUrl: 'https://ymove.app/api/free/a2a797d0-f6f6-436e-8616-6c1d93e73d67',
    licence: 'Your Move free licence',
    durationSeconds: 12.6,
  },
];

export function mediaIdFor(exerciseId: string): string {
  return `${exerciseId}-demo`;
}

/** The short credit shown under the player. */
export function creditLine(credit: MediaCredit): string {
  const site =
    credit.author === credit.sourceName ? '' : `, ${credit.sourceName}`;
  return `Video: “${credit.title}” by ${credit.author}${site}, ${credit.licence}. Trimmed, re-encoded, sound removed.`;
}

export const mediaCatalogue: ExerciseMedia[] = mediaCredits.map(credit => ({
  id: mediaIdFor(credit.exerciseId),
  exerciseId: credit.exerciseId,
  // Files are named after the exercise: assets/exercises/<id>.mp4 / .jpg
  localAssetKey: credit.exerciseId,
  remoteUrl: null,
  posterAssetKey: credit.exerciseId,
  posterUrl: null,
  durationSeconds: credit.durationSeconds,
  source: `${credit.sourceName}: ${credit.sourceUrl} (file ${credit.fileUrl})`,
  permissionNotes: `${licenceTerms[credit.licence]} Licence: ${
    licenceUrls[credit.licence]
  }`,
  attribution: creditLine(credit),
  // Approved = licence checked and the clip shows this exact exercise.
  // Technique still needs a trainer's review (see contentReviewStatus).
  reviewStatus: 'approved',
}));

/**
 * make-exercise-clips.sh removes the sound from every bundled clip (it was
 * only gym noise), so their players show no sound button.
 */
export const silentMediaIds: ReadonlySet<string> = new Set(
  mediaCatalogue.map(m => m.id),
);

/** Notes shown under the player, by media id (see MediaCredit.demoNote). */
export const demoNotes: Readonly<Record<string, string>> = Object.fromEntries(
  mediaCredits
    .filter(credit => credit.demoNote)
    .map(credit => [mediaIdFor(credit.exerciseId), credit.demoNote as string]),
);
