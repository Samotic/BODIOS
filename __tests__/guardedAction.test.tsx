import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useGuardedAction } from '../src/hooks/useGuardedAction';

describe('useGuardedAction', () => {
  test('ignores taps while the action is still running (no double saves)', async () => {
    const { result } = await renderHook(() => useGuardedAction());
    let finish = () => {};
    const action = jest.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    );

    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.run(action);
      result.current.run(action); // double tap
      result.current.run(action); // triple tap
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.isBusy).toBe(true);

    await act(async () => {
      finish();
      await first;
    });
    expect(result.current.isBusy).toBe(false);

    // Once it has finished, the next tap works again.
    await act(async () => {
      const next = result.current.run(action);
      finish();
      await next;
    });
    expect(action).toHaveBeenCalledTimes(2);
  });

  test('shows the error message if the action fails, then allows retrying', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { result } = await renderHook(() => useGuardedAction());

    await act(() =>
      result.current.run(async () => {
        throw new Error('Disk full');
      }),
    );
    expect(alertSpy).toHaveBeenCalledWith('Couldn’t save', 'Disk full');

    const retry = jest.fn(async () => {});
    await act(() => result.current.run(retry));
    expect(retry).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});
