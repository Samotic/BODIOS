import type { SqlExecutor } from './types';

/** Small key/value settings the app keeps about itself (not user data). */
export async function getMeta(
  db: SqlExecutor,
  key: string,
): Promise<string | null> {
  const { rows } = await db.execute(
    'SELECT value FROM app_meta WHERE key = ?',
    [key],
  );
  return rows.length > 0 ? String(rows[0].value) : null;
}

export async function setMeta(
  db: SqlExecutor,
  key: string,
  value: string,
): Promise<void> {
  await db.execute(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}
