import { localDateString } from '../../lib/dates';
import { getWeekDays } from '../home/week';

export type PeriodKind = 'week' | 'month';

/** A calendar range of local dates, inclusive ("2026-09-21" .. "2026-09-27"). */
export type Period = {
  kind: PeriodKind;
  start: string;
  end: string;
  label: string;
};

/** One column in the progress chart. */
export type Bucket = {
  label: string;
  /** Spoken by VoiceOver, e.g. "Monday 21 September" or "21–27 September". */
  longLabel: string;
  start: string;
  end: string;
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dayMonth(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * The week (Monday–Sunday) or calendar month containing `today`, moved by
 * `offset` weeks/months (0 = current, -1 = previous).
 */
export function periodFor(
  kind: PeriodKind,
  today: Date,
  offset: number,
): Period {
  if (kind === 'week') {
    const monday = getWeekDays(today)[0];
    const start = addDays(monday, offset * 7);
    const end = addDays(start, 6);
    const label =
      offset === 0
        ? 'This week'
        : offset === -1
        ? 'Last week'
        : `${dayMonth(start)} – ${dayMonth(end)}`;
    return {
      kind,
      start: localDateString(start),
      end: localDateString(end),
      label,
    };
  }
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return {
    kind,
    start: localDateString(first),
    end: localDateString(last),
    label: first.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    }),
  };
}

function parseLocal(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Chart columns: days of a week, or the (Monday-start) weeks of a month. */
export function bucketsFor(period: Period): Bucket[] {
  const start = parseLocal(period.start);
  if (period.kind === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      const iso = localDateString(day);
      return {
        label: day.toLocaleDateString(undefined, { weekday: 'short' }),
        longLabel: day.toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
        start: iso,
        end: iso,
      };
    });
  }
  const end = parseLocal(period.end);
  const buckets: Bucket[] = [];
  let cursor = start;
  while (cursor <= end) {
    const sunday = getWeekDays(cursor)[6];
    const bucketEnd = sunday < end ? sunday : end;
    buckets.push({
      label: `${cursor.getDate()}–${bucketEnd.getDate()}`,
      longLabel: `${dayMonth(cursor)} to ${dayMonth(bucketEnd)}`,
      start: localDateString(cursor),
      end: localDateString(bucketEnd),
    });
    cursor = addDays(bucketEnd, 1);
  }
  return buckets;
}

export function inRange(
  isoDate: string,
  range: { start: string; end: string },
): boolean {
  // "YYYY-MM-DD" strings sort the same as the dates they name.
  return isoDate >= range.start && isoDate <= range.end;
}
