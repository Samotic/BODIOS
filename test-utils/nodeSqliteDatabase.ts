/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';
import type {
  Database,
  QueryResult,
  SqlExecutor,
  SqlValue,
} from '../src/db/types';

/**
 * The app's Database interface backed by Node's built-in SQLite, for Jest.
 * Same SQL engine family as OP-SQLite, so migrations, constraints and queries
 * are exercised for real. It is not a substitute for testing native
 * persistence on the Simulator or a phone.
 */
export function openNodeSqliteDatabase(path = ':memory:'): Database {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');

  const execute = async (
    sql: string,
    params: SqlValue[] = [],
  ): Promise<QueryResult> => {
    const statement = db.prepare(sql);
    if (statement.columns().length > 0) {
      const rows = statement.all(...params).map(row => ({ ...row }));
      return { rows, rowsAffected: 0 };
    }
    const { changes } = statement.run(...params);
    return { rows: [], rowsAffected: Number(changes) };
  };

  // Like OP-SQLite, run transactions one after another, never overlapping.
  let queue: Promise<unknown> = Promise.resolve();

  async function runTransaction<T>(
    work: (tx: SqlExecutor) => Promise<T>,
  ): Promise<T> {
    db.exec('BEGIN');
    try {
      const result = await work({ execute });
      db.exec('COMMIT');
      return result;
    } catch (error) {
      // A failed COMMIT (e.g. a deferred foreign key) leaves the
      // transaction open, so roll back in both cases.
      if (db.isTransaction) {
        db.exec('ROLLBACK');
      }
      throw error;
    }
  }

  return {
    execute,

    transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      const result = queue.then(() => runTransaction(work));
      queue = result.catch(() => undefined);
      return result;
    },

    close() {
      db.close();
    },
  };
}
