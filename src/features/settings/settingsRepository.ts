import type { Database } from '../../db/types';
import type { WeightUnit } from './units';

export type Settings = {
  preferredUnit: WeightUnit;
  /** Rest given to exercises newly added to a routine. */
  defaultRestSeconds: number;
  /** Demos start with the sound off. */
  demoStartMuted: boolean;
};

export const defaultSettings: Settings = {
  preferredUnit: 'kg',
  defaultRestSeconds: 90,
  demoStartMuted: true,
};

export type SettingsRepository = {
  get(): Promise<Settings>;
  update(patch: Partial<Settings>): Promise<Settings>;
};

export class SettingsInputError extends Error {}

function check(settings: Settings) {
  if (settings.preferredUnit !== 'kg' && settings.preferredUnit !== 'lb') {
    throw new SettingsInputError('Units must be kg or lb.');
  }
  const rest = settings.defaultRestSeconds;
  if (!Number.isInteger(rest) || rest < 0 || rest > 600) {
    throw new SettingsInputError(
      'Default rest must be between 0 and 10 minutes.',
    );
  }
}

export function createSettingsRepository(
  db: Database,
  { onChange = () => {} }: { onChange?: () => void } = {},
): SettingsRepository {
  async function get(): Promise<Settings> {
    const { rows } = await db.execute('SELECT * FROM settings WHERE id = 1');
    if (rows.length === 0) {
      return defaultSettings;
    }
    return {
      preferredUnit: String(rows[0].preferred_unit) as WeightUnit,
      defaultRestSeconds: Number(rows[0].default_rest_seconds),
      demoStartMuted: Number(rows[0].demo_start_muted) === 1,
    };
  }

  return {
    get,
    async update(patch) {
      const next = { ...(await get()), ...patch };
      check(next);
      await db.transaction(tx =>
        tx.execute(
          `INSERT INTO settings (id, preferred_unit, default_rest_seconds, demo_start_muted)
           VALUES (1, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             preferred_unit = excluded.preferred_unit,
             default_rest_seconds = excluded.default_rest_seconds,
             demo_start_muted = excluded.demo_start_muted`,
          [
            next.preferredUnit,
            next.defaultRestSeconds,
            next.demoStartMuted ? 1 : 0,
          ],
        ),
      );
      onChange();
      return next;
    },
  };
}
