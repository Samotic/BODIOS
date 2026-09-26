/**
 * Round axis ticks (0, 5, 10… / 0, 2.5, 5…) covering [min, max], about
 * `target` of them. Returns at least two ticks.
 */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1];
  }
  if (max <= min) {
    max = min + 1;
  }
  const rough = (max - min) / Math.max(1, target - 1);
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const step =
    [1, 2, 2.5, 5, 10].map(m => m * power).find(s => s >= rough) ?? 10 * power;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  if (ticks[ticks.length - 1] < max) {
    ticks.push(Math.round((ticks[ticks.length - 1] + step) * 1000) / 1000);
  }
  return ticks.length >= 2 ? ticks : [start, start + step];
}

/** Whole-number ticks for counts (workouts): 0 to at least `max`. */
export function countTicks(max: number): number[] {
  const top = Math.max(1, Math.ceil(max));
  if (top <= 4) {
    return Array.from({ length: top + 1 }, (_, i) => i);
  }
  return niceTicks(0, top, 4).filter(t => Number.isInteger(t));
}
