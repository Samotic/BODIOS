/**
 * Rest timer maths. The timer is stored as an end timestamp (or, while
 * paused, the remaining milliseconds), never as a counter ticking in
 * JavaScript, so the remaining time is always recomputed from the clock:
 * after backgrounding, locking the phone or force-quitting the app.
 */
export type RestTimer = {
  /** Epoch ms when rest ends; null when not running. */
  endsAt: number | null;
  /** Remaining ms while paused; null when not paused. */
  pausedRemainingMs: number | null;
  /** The rest length, for progress display. */
  durationMs: number | null;
};

export const noRest: RestTimer = {
  endsAt: null,
  pausedRemainingMs: null,
  durationMs: null,
};

export function startRest(durationMs: number, now: number): RestTimer {
  return { endsAt: now + durationMs, pausedRemainingMs: null, durationMs };
}

export function isActive(timer: RestTimer): boolean {
  return timer.endsAt !== null || timer.pausedRemainingMs !== null;
}

export function isPaused(timer: RestTimer): boolean {
  return timer.pausedRemainingMs !== null;
}

/** Remaining ms (never negative), or null when no rest is running. */
export function remainingMs(timer: RestTimer, now: number): number | null {
  if (timer.pausedRemainingMs !== null) {
    return timer.pausedRemainingMs;
  }
  if (timer.endsAt !== null) {
    return Math.max(0, timer.endsAt - now);
  }
  return null;
}

export function pauseRest(timer: RestTimer, now: number): RestTimer {
  if (timer.endsAt === null) {
    return timer;
  }
  return {
    ...timer,
    endsAt: null,
    pausedRemainingMs: Math.max(0, timer.endsAt - now),
  };
}

export function resumeRest(timer: RestTimer, now: number): RestTimer {
  if (timer.pausedRemainingMs === null) {
    return timer;
  }
  return {
    ...timer,
    endsAt: now + timer.pausedRemainingMs,
    pausedRemainingMs: null,
  };
}

/** Adds (or with a negative delta, removes) time. Never below zero. */
export function adjustRest(
  timer: RestTimer,
  deltaMs: number,
  now: number,
): RestTimer {
  if (timer.pausedRemainingMs !== null) {
    return {
      ...timer,
      pausedRemainingMs: Math.max(0, timer.pausedRemainingMs + deltaMs),
    };
  }
  if (timer.endsAt !== null) {
    const remaining = Math.max(0, timer.endsAt - now + deltaMs);
    return { ...timer, endsAt: now + remaining };
  }
  return timer;
}
