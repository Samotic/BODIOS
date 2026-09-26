import type { Database } from './types';

/**
 * Schema changes, applied in order and exactly once each. The applied
 * version is stored in SQLite's `PRAGMA user_version`.
 *
 * Rules: never edit or reorder a migration that has shipped; add a new one.
 * Never drop user data as a shortcut.
 */
export type Migration = {
  version: number;
  name: string;
  statements: string[];
};

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'Exercise catalogue',
    statements: [
      `CREATE TABLE exercise_media (
        id TEXT PRIMARY KEY NOT NULL,
        exercise_id TEXT NOT NULL REFERENCES exercises (id) DEFERRABLE INITIALLY DEFERRED,
        local_asset_key TEXT,
        remote_url TEXT CHECK (remote_url IS NULL OR remote_url LIKE 'https://%'),
        poster_asset_key TEXT,
        poster_url TEXT CHECK (poster_url IS NULL OR poster_url LIKE 'https://%'),
        duration_seconds REAL,
        source TEXT NOT NULL,
        permission_notes TEXT NOT NULL,
        attribution TEXT,
        review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected')),
        CHECK (local_asset_key IS NOT NULL OR remote_url IS NOT NULL)
      ) STRICT`,
      `CREATE TABLE exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
        aliases TEXT NOT NULL CHECK (json_valid(aliases)),
        primary_muscles TEXT NOT NULL CHECK (json_valid(primary_muscles)),
        secondary_muscles TEXT NOT NULL CHECK (json_valid(secondary_muscles)),
        equipment TEXT NOT NULL CHECK (json_valid(equipment)),
        instructions TEXT NOT NULL CHECK (json_valid(instructions)),
        mistakes TEXT NOT NULL CHECK (json_valid(mistakes)),
        tracking_type TEXT NOT NULL CHECK (tracking_type IN ('weight_reps', 'reps', 'duration')),
        weight_convention TEXT NOT NULL CHECK (
          weight_convention IN ('per_dumbbell', 'total_with_bar', 'machine', 'added_load', 'none')
        ),
        media_id TEXT REFERENCES exercise_media (id) DEFERRABLE INITIALLY DEFERRED,
        content_review_status TEXT NOT NULL CHECK (content_review_status IN ('draft', 'approved'))
      ) STRICT`,
      `CREATE TABLE app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      ) STRICT`,
    ],
  },
  {
    version: 2,
    name: 'Routines',
    statements: [
      `CREATE TABLE routines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT`,
      // Targets only. What was actually lifted is stored with workout
      // sessions (Stage 5), so editing a routine never rewrites history.
      `CREATE TABLE routine_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT NOT NULL REFERENCES routines (id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises (id),
        position INTEGER NOT NULL CHECK (position >= 0),
        target_sets INTEGER NOT NULL CHECK (target_sets BETWEEN 1 AND 20),
        target_reps INTEGER CHECK (target_reps IS NULL OR target_reps BETWEEN 1 AND 100),
        target_duration_seconds INTEGER CHECK (
          target_duration_seconds IS NULL OR target_duration_seconds BETWEEN 5 AND 3600
        ),
        rest_seconds INTEGER NOT NULL CHECK (rest_seconds BETWEEN 0 AND 600),
        CHECK (target_reps IS NOT NULL OR target_duration_seconds IS NOT NULL)
      ) STRICT`,
      'CREATE INDEX routine_exercises_by_routine ON routine_exercises (routine_id, position)',
    ],
  },
  {
    version: 3,
    name: 'Workout sessions',
    statements: [
      // A session copies (snapshots) what it needs from the routine and the
      // exercises, so later edits never rewrite history.
      `CREATE TABLE workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT REFERENCES routines (id) ON DELETE SET NULL,
        routine_name_snapshot TEXT,
        status TEXT NOT NULL CHECK (status IN ('in_progress', 'finished')),
        started_at TEXT NOT NULL,
        ended_at TEXT,
        training_local_date TEXT NOT NULL CHECK (training_local_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        timezone TEXT NOT NULL,
        paused_duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (paused_duration_ms >= 0),
        notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
        CHECK ((status = 'finished') = (ended_at IS NOT NULL))
      ) STRICT`,
      // At most one workout can be in progress.
      `CREATE UNIQUE INDEX one_in_progress_session ON workout_sessions (status)
        WHERE status = 'in_progress'`,
      'CREATE INDEX sessions_by_date ON workout_sessions (training_local_date)',
      `CREATE TABLE session_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL REFERENCES workout_sessions (id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises (id),
        position INTEGER NOT NULL CHECK (position >= 0),
        name_snapshot TEXT NOT NULL,
        tracking_type_snapshot TEXT NOT NULL CHECK (
          tracking_type_snapshot IN ('weight_reps', 'reps', 'duration')
        ),
        weight_convention_snapshot TEXT NOT NULL CHECK (
          weight_convention_snapshot IN ('per_dumbbell', 'total_with_bar', 'machine', 'added_load', 'none')
        ),
        target_sets INTEGER,
        target_reps INTEGER,
        target_duration_seconds INTEGER,
        rest_seconds INTEGER NOT NULL CHECK (rest_seconds BETWEEN 0 AND 600)
      ) STRICT`,
      'CREATE INDEX session_exercises_by_session ON session_exercises (session_id, position)',
      'CREATE INDEX session_exercises_by_exercise ON session_exercises (exercise_id)',
      `CREATE TABLE workout_sets (
        id TEXT PRIMARY KEY NOT NULL,
        session_exercise_id TEXT NOT NULL REFERENCES session_exercises (id) ON DELETE CASCADE,
        position INTEGER NOT NULL CHECK (position >= 0),
        type TEXT NOT NULL DEFAULT 'work' CHECK (type IN ('warmup', 'work')),
        weight_kg REAL CHECK (weight_kg IS NULL OR (weight_kg >= 0 AND weight_kg <= 1000)),
        reps INTEGER CHECK (reps IS NULL OR (reps >= 0 AND reps <= 1000)),
        duration_seconds INTEGER CHECK (duration_seconds IS NULL OR (duration_seconds >= 0 AND duration_seconds <= 86400)),
        completed_at TEXT,
        CHECK (completed_at IS NULL OR reps IS NULL OR reps > 0)
      ) STRICT`,
      'CREATE INDEX workout_sets_by_exercise ON workout_sets (session_exercise_id, position)',
      // Where the in-progress workout is: current exercise and rest timer.
      // The timer is stored as an end time, so it survives the app closing.
      `CREATE TABLE active_workout_state (
        session_id TEXT PRIMARY KEY NOT NULL REFERENCES workout_sessions (id) ON DELETE CASCADE,
        current_session_exercise_id TEXT REFERENCES session_exercises (id) ON DELETE SET NULL,
        rest_ends_at TEXT,
        rest_paused_remaining_ms INTEGER CHECK (rest_paused_remaining_ms IS NULL OR rest_paused_remaining_ms >= 0),
        rest_duration_ms INTEGER CHECK (rest_duration_ms IS NULL OR rest_duration_ms >= 0),
        paused_at TEXT
      ) STRICT`,
    ],
  },
  {
    version: 4,
    name: 'Settings',
    statements: [
      // Exactly one row (id = 1).
      `CREATE TABLE settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        preferred_unit TEXT NOT NULL DEFAULT 'kg' CHECK (preferred_unit IN ('kg', 'lb')),
        default_rest_seconds INTEGER NOT NULL DEFAULT 90 CHECK (default_rest_seconds BETWEEN 0 AND 600),
        demo_start_muted INTEGER NOT NULL DEFAULT 1 CHECK (demo_start_muted IN (0, 1))
      ) STRICT`,
      'INSERT INTO settings (id) VALUES (1)',
    ],
  },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;

export async function getSchemaVersion(db: Database): Promise<number> {
  const { rows } = await db.execute('PRAGMA user_version');
  return Number(rows[0]?.user_version ?? 0);
}

/**
 * Brings the database up to the latest schema. Each migration runs in its
 * own transaction together with the version bump, so a failure leaves the
 * database at the previous version rather than half-migrated.
 */
export async function migrate(
  db: Database,
  list: Migration[] = migrations,
): Promise<{ from: number; to: number }> {
  list.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migrations must be numbered 1, 2, 3...; found ${
          migration.version
        } at position ${index + 1}`,
      );
    }
  });

  const from = await getSchemaVersion(db);
  const latest = list.length;
  if (from > latest) {
    // Opened by an older build than the one that last wrote it. Refuse
    // rather than guess, so no data is damaged.
    throw new Error(
      `This database is from a newer version of Bodios (schema ${from}, this build knows ${latest}). Please update the app.`,
    );
  }

  for (const migration of list.slice(from)) {
    await db.transaction(async tx => {
      for (const statement of migration.statements) {
        await tx.execute(statement);
      }
      // PRAGMA values can't be bound as parameters; this is a code constant.
      await tx.execute(
        `PRAGMA user_version = ${Math.trunc(migration.version)}`,
      );
    });
  }

  return { from, to: latest };
}
