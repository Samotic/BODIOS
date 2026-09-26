import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

/**
 * Runs one async action at a time: taps while it's running are ignored, so a
 * double tap can't create two routines or add an exercise twice. If the
 * action fails, the error message is shown in an alert.
 */
export function useGuardedAction() {
  const running = useRef(false);
  const [isBusy, setIsBusy] = useState(false);

  const run = useCallback(
    async (action: () => Promise<void>, failureTitle = 'Couldn’t save') => {
      if (running.current) {
        return;
      }
      running.current = true;
      setIsBusy(true);
      try {
        await action();
      } catch (error) {
        Alert.alert(
          failureTitle,
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        running.current = false;
        setIsBusy(false);
      }
    },
    [],
  );

  return { run, isBusy };
}
