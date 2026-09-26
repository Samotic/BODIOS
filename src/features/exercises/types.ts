/**
 * Exercise domain types, following the roadmap's data model
 * ("Data model and metric rules").
 */

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core';

export type Muscle =
  | 'chest'
  | 'upper-chest'
  | 'lats'
  | 'upper-back'
  | 'lower-back'
  | 'front-delts'
  | 'side-delts'
  | 'rear-delts'
  | 'biceps'
  | 'brachialis'
  | 'forearms'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'adductors'
  | 'abs'
  | 'obliques';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bench'
  | 'pull-up-bar'
  | 'bodyweight';

/** What a logged set records: load and reps, reps only, or a duration. */
export type TrackingType = 'weight_reps' | 'reps' | 'duration';

/**
 * What the logged weight means. Never changed silently: the logger shows
 * this label next to the weight field.
 */
export type WeightConvention =
  | 'per_dumbbell'
  | 'total_with_bar'
  | 'machine'
  | 'added_load'
  | 'none';

/** Instructions stay 'draft' until a qualified trainer has reviewed them. */
export type ContentReviewStatus = 'draft' | 'approved';

/** Media is shown only once its permission and content are approved. */
export type MediaReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * A demonstration clip. Metadata lives in SQLite; the file itself is either
 * bundled with the app (localAssetKey, resolved through a static require map)
 * or served over HTTPS (remoteUrl). Source and permission are recorded for
 * every clip.
 */
export type ExerciseMedia = {
  id: string;
  exerciseId: string;
  localAssetKey: string | null;
  remoteUrl: string | null;
  posterAssetKey: string | null;
  posterUrl: string | null;
  durationSeconds: number | null;
  source: string;
  permissionNotes: string;
  attribution: string | null;
  reviewStatus: MediaReviewStatus;
};

export type Exercise = {
  id: string;
  name: string;
  aliases: string[];
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  equipment: Equipment[];
  instructions: string[];
  mistakes: string[];
  trackingType: TrackingType;
  weightConvention: WeightConvention;
  /** Approved demo, if any. Never an invented URL. */
  mediaId: string | null;
  contentReviewStatus: ContentReviewStatus;
};
