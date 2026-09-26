import type { Exercise, ExerciseMedia } from '../features/exercises/types';
import { getMeta, setMeta } from './meta';
import type { Database } from './types';

export const CATALOGUE_VERSION_KEY = 'catalogue_version';
export const CATALOGUE_SYNCED_AT_KEY = 'catalogue_synced_at';

export type Catalogue = {
  version: number;
  exercises: Exercise[];
  media: ExerciseMedia[];
};

/** Catches content mistakes before they reach the database. */
export function validateCatalogue({ exercises, media }: Catalogue): string[] {
  const problems: string[] = [];
  const exerciseIds = new Set<string>();
  const mediaById = new Map(media.map(m => [m.id, m]));

  for (const exercise of exercises) {
    if (exerciseIds.has(exercise.id)) {
      problems.push(`Duplicate exercise id "${exercise.id}"`);
    }
    exerciseIds.add(exercise.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(exercise.id)) {
      problems.push(
        `Exercise id "${exercise.id}" should be lowercase-with-dashes`,
      );
    }
    if (exercise.primaryMuscles.length === 0) {
      problems.push(`${exercise.id} has no primary muscles`);
    }
    if (exercise.equipment.length === 0) {
      problems.push(`${exercise.id} has no equipment`);
    }
    if (exercise.instructions.length === 0) {
      problems.push(`${exercise.id} has no instructions`);
    }
    if (exercise.mediaId) {
      const clip = mediaById.get(exercise.mediaId);
      if (!clip) {
        problems.push(
          `${exercise.id} points at missing media "${exercise.mediaId}"`,
        );
      } else if (clip.exerciseId !== exercise.id) {
        problems.push(
          `Media "${clip.id}" belongs to ${clip.exerciseId}, not ${exercise.id}`,
        );
      }
    }
  }

  for (const clip of media) {
    if (!exerciseIds.has(clip.exerciseId)) {
      problems.push(
        `Media "${clip.id}" is for unknown exercise "${clip.exerciseId}"`,
      );
    }
    if (!clip.localAssetKey && !clip.remoteUrl) {
      problems.push(`Media "${clip.id}" has neither a bundled file nor a URL`);
    }
    for (const url of [clip.remoteUrl, clip.posterUrl]) {
      if (url && !url.startsWith('https://')) {
        problems.push(`Media "${clip.id}" must use https: ${url}`);
      }
    }
    if (!clip.source.trim() || !clip.permissionNotes.trim()) {
      problems.push(`Media "${clip.id}" must record its source and permission`);
    }
  }
  return problems;
}

/**
 * Copies the bundled catalogue into SQLite when it is new or has changed
 * version. Existing rows are updated in place (by id) so routines and
 * history that reference an exercise keep working. Nothing is deleted.
 */
export async function syncCatalogue(
  db: Database,
  catalogue: Catalogue,
  now: () => Date = () => new Date(),
): Promise<'seeded' | 'updated' | 'unchanged'> {
  const stored = await getMeta(db, CATALOGUE_VERSION_KEY);
  if (stored === String(catalogue.version)) {
    return 'unchanged';
  }

  const problems = validateCatalogue(catalogue);
  if (problems.length > 0) {
    throw new Error(
      `Exercise catalogue has problems:\n- ${problems.join('\n- ')}`,
    );
  }

  await db.transaction(async tx => {
    for (const e of catalogue.exercises) {
      await tx.execute(
        `INSERT INTO exercises (
           id, name, aliases, primary_muscles, secondary_muscles, equipment,
           instructions, mistakes, tracking_type, weight_convention, media_id,
           content_review_status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           aliases = excluded.aliases,
           primary_muscles = excluded.primary_muscles,
           secondary_muscles = excluded.secondary_muscles,
           equipment = excluded.equipment,
           instructions = excluded.instructions,
           mistakes = excluded.mistakes,
           tracking_type = excluded.tracking_type,
           weight_convention = excluded.weight_convention,
           media_id = excluded.media_id,
           content_review_status = excluded.content_review_status`,
        [
          e.id,
          e.name,
          JSON.stringify(e.aliases),
          JSON.stringify(e.primaryMuscles),
          JSON.stringify(e.secondaryMuscles),
          JSON.stringify(e.equipment),
          JSON.stringify(e.instructions),
          JSON.stringify(e.mistakes),
          e.trackingType,
          e.weightConvention,
          e.mediaId,
          e.contentReviewStatus,
        ],
      );
    }

    for (const m of catalogue.media) {
      await tx.execute(
        `INSERT INTO exercise_media (
           id, exercise_id, local_asset_key, remote_url, poster_asset_key,
           poster_url, duration_seconds, source, permission_notes, attribution,
           review_status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           exercise_id = excluded.exercise_id,
           local_asset_key = excluded.local_asset_key,
           remote_url = excluded.remote_url,
           poster_asset_key = excluded.poster_asset_key,
           poster_url = excluded.poster_url,
           duration_seconds = excluded.duration_seconds,
           source = excluded.source,
           permission_notes = excluded.permission_notes,
           attribution = excluded.attribution,
           review_status = excluded.review_status`,
        [
          m.id,
          m.exerciseId,
          m.localAssetKey,
          m.remoteUrl,
          m.posterAssetKey,
          m.posterUrl,
          m.durationSeconds,
          m.source,
          m.permissionNotes,
          m.attribution,
          m.reviewStatus,
        ],
      );
    }

    await setMeta(tx, CATALOGUE_VERSION_KEY, String(catalogue.version));
    await setMeta(tx, CATALOGUE_SYNCED_AT_KEY, now().toISOString());
  });

  return stored === null ? 'seeded' : 'updated';
}
