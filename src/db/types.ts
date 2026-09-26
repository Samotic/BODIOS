/**
 * The small database interface the rest of the app uses. The app implements
 * it with OP-SQLite (src/db/openDatabase.ts); tests implement it with
 * Node's built-in SQLite (test-utils/nodeSqliteDatabase.ts), so the same SQL
 * runs against real SQLite in both.
 *
 * Always pass values through `params` (the ? placeholders), never by
 * building SQL strings from input.
 */
export type SqlValue = string | number | null;

export type Row = Record<string, unknown>;

export type QueryResult = {
  rows: Row[];
  rowsAffected: number;
};

export interface SqlExecutor {
  execute(sql: string, params?: SqlValue[]): Promise<QueryResult>;
}

export interface Database extends SqlExecutor {
  /** Runs `work` in one transaction: all of it is saved, or none of it. */
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): void;
}
