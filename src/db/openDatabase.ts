import {
  open,
  type QueryResult as OpQueryResult,
} from '@op-engineering/op-sqlite';
import type {
  Database,
  QueryResult,
  Row,
  SqlExecutor,
  SqlValue,
} from './types';

const DATABASE_NAME = 'bodios.sqlite';

function toResult(result: OpQueryResult): QueryResult {
  return { rows: result.rows as Row[], rowsAffected: result.rowsAffected };
}

/**
 * Opens (or creates) the app's SQLite file. OP-SQLite stores it in the app's
 * private Library folder on iOS: not visible in the Files app, kept across
 * app restarts and updates, and included in the phone's normal backups.
 * Deleting the app deletes it.
 *
 * Note: OP-SQLite queues transactions one at a time, but a plain execute()
 * issued while a transaction is open runs inside it. Keep related writes
 * inside transaction() calls.
 */
export function openDatabase(name: string = DATABASE_NAME): Database {
  const db = open({ name });
  // Foreign keys are off by default in SQLite and apply per connection.
  db.executeSync('PRAGMA foreign_keys = ON');

  return {
    async execute(sql: string, params: SqlValue[] = []) {
      return toResult(await db.execute(sql, params));
    },

    async transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      let result: T | undefined;
      // OP-SQLite commits when `work` finishes and rolls back if it throws.
      await db.transaction(async tx => {
        result = await work({
          execute: async (sql, params = []) =>
            toResult(await tx.execute(sql, params)),
        });
      });
      return result as T;
    },

    close() {
      db.close();
    },
  };
}
