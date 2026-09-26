import type { Row, SqlExecutor } from '../../db/types';
import type { Exercise, ExerciseMedia } from './types';

/**
 * All exercise reads go through here, so screens never contain SQL.
 */
export type ExerciseRepository = {
  list(): Promise<Exercise[]>;
  getById(id: string): Promise<Exercise | null>;
  /** The exercise's demo, only if it has been approved. */
  getApprovedMedia(exercise: Exercise): Promise<ExerciseMedia | null>;
};

export function createExerciseRepository(db: SqlExecutor): ExerciseRepository {
  return {
    async list() {
      const { rows } = await db.execute(
        'SELECT * FROM exercises ORDER BY name COLLATE NOCASE',
      );
      return rows.map(rowToExercise);
    },

    async getById(id) {
      const { rows } = await db.execute(
        'SELECT * FROM exercises WHERE id = ?',
        [id],
      );
      return rows.length > 0 ? rowToExercise(rows[0]) : null;
    },

    async getApprovedMedia(exercise) {
      if (!exercise.mediaId) {
        return null;
      }
      const { rows } = await db.execute(
        `SELECT * FROM exercise_media
         WHERE id = ? AND exercise_id = ? AND review_status = 'approved'`,
        [exercise.mediaId, exercise.id],
      );
      return rows.length > 0 ? rowToMedia(rows[0]) : null;
    },
  };
}

function stringArray(value: unknown, field: string): string[] {
  const parsed: unknown = JSON.parse(String(value));
  if (
    !Array.isArray(parsed) ||
    !parsed.every(item => typeof item === 'string')
  ) {
    throw new Error(`Stored ${field} is not a list of text`);
  }
  return parsed;
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

// The CHECK constraints in the schema guarantee the enum columns hold valid
// values, so they are cast rather than re-validated here.
function rowToExercise(row: Row): Exercise {
  return {
    id: String(row.id),
    name: String(row.name),
    aliases: stringArray(row.aliases, 'aliases'),
    primaryMuscles: stringArray(
      row.primary_muscles,
      'primary muscles',
    ) as Exercise['primaryMuscles'],
    secondaryMuscles: stringArray(
      row.secondary_muscles,
      'secondary muscles',
    ) as Exercise['secondaryMuscles'],
    equipment: stringArray(row.equipment, 'equipment') as Exercise['equipment'],
    instructions: stringArray(row.instructions, 'instructions'),
    mistakes: stringArray(row.mistakes, 'mistakes'),
    trackingType: String(row.tracking_type) as Exercise['trackingType'],
    weightConvention: String(
      row.weight_convention,
    ) as Exercise['weightConvention'],
    mediaId: nullableString(row.media_id),
    contentReviewStatus: String(
      row.content_review_status,
    ) as Exercise['contentReviewStatus'],
  };
}

function rowToMedia(row: Row): ExerciseMedia {
  return {
    id: String(row.id),
    exerciseId: String(row.exercise_id),
    localAssetKey: nullableString(row.local_asset_key),
    remoteUrl: nullableString(row.remote_url),
    posterAssetKey: nullableString(row.poster_asset_key),
    posterUrl: nullableString(row.poster_url),
    durationSeconds:
      row.duration_seconds === null ? null : Number(row.duration_seconds),
    source: String(row.source),
    permissionNotes: String(row.permission_notes),
    attribution: nullableString(row.attribution),
    reviewStatus: String(row.review_status) as ExerciseMedia['reviewStatus'],
  };
}
