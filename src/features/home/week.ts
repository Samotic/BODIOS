/**
 * The seven local calendar days (Monday to Sunday) of the week containing
 * `today`. Uses the device's local date, not UTC, so late-evening sessions
 * land on the right day.
 */
export function getWeekDays(today: Date): Date[] {
  const mondayOffset = (today.getDay() + 6) % 7; // getDay(): Sunday = 0
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - mondayOffset,
  );
  return Array.from(
    { length: 7 },
    (_, i) =>
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  );
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
