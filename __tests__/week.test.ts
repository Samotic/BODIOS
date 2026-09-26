import { getWeekDays, isSameLocalDay } from '../src/features/home/week';

// Local-time constructors (month is 0-based) so results don't depend on the machine's timezone.
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const ymd = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

describe('getWeekDays', () => {
  test('returns Monday to Sunday around a mid-week day', () => {
    const week = getWeekDays(day(2026, 9, 23)); // Wednesday
    expect(week.map(ymd)).toEqual([
      '2026-9-21',
      '2026-9-22',
      '2026-9-23',
      '2026-9-24',
      '2026-9-25',
      '2026-9-26',
      '2026-9-27',
    ]);
  });

  test('treats Sunday as the last day of the week, not the first', () => {
    const week = getWeekDays(day(2026, 9, 27)); // Sunday
    expect(ymd(week[0])).toBe('2026-9-21');
    expect(ymd(week[6])).toBe('2026-9-27');
  });

  test('crosses month and year boundaries', () => {
    const week = getWeekDays(day(2027, 1, 1)); // Friday
    expect(ymd(week[0])).toBe('2026-12-28');
    expect(ymd(week[6])).toBe('2027-1-3');
  });

  test('ignores the time of day', () => {
    const lateEvening = new Date(2026, 8, 26, 23, 59);
    expect(
      getWeekDays(lateEvening).some(d => isSameLocalDay(d, lateEvening)),
    ).toBe(true);
  });
});
