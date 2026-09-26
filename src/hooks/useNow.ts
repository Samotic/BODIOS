import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time in ms, refreshed every `intervalMs` while `enabled`, and
 * immediately when the app comes back to the foreground. Only drives the
 * display: timers themselves are stored as end timestamps.
 */
export function useNow(enabled: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setNow(Date.now());
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [enabled, intervalMs]);

  return now;
}
