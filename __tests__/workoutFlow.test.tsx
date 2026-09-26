/**
 * Workout logging through the whole app, on a fresh in-memory SQLite
 * database per test (see jest.setup.js).
 */

import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import App from '../App';
import { navigationRef } from '../src/navigation/RootNavigator';

type User = ReturnType<typeof userEvent.setup>;

async function start() {
  const user = userEvent.setup();
  await render(<App />);
  await screen.findByLabelText('Bodios');
  return user;
}

/** Creates a routine with the given exercises (searched by name) and opens it. */
async function makeRoutine(
  user: User,
  name: string,
  exercises: Array<[string, string]>,
) {
  await user.press(screen.getByRole('button', { name: /Workouts, tab/ }));
  await user.press(await screen.findByTestId('new-routine'));
  await user.type(await screen.findByLabelText('Routine name'), name);
  await user.press(screen.getByTestId('routine-name-save'));
  await screen.findByTestId('routine-editor');
  for (const [query, id] of exercises) {
    await user.press(
      screen.getAllByRole('button', { name: 'Add exercise' })[0],
    );
    await user.type(await screen.findByLabelText('Search exercises'), query);
    await user.press(await screen.findByTestId(`exercise-row-${id}`));
    await screen.findByTestId(`routine-item-${id}`);
  }
}

async function startWorkout(user: User) {
  await user.press(screen.getByTestId('start-workout'));
  return screen.findByTestId('active-workout-screen');
}

async function fillSet(
  user: User,
  number: number,
  weight: string,
  reps: string,
) {
  await user.type(screen.getByTestId(`set-${number}-weight`), weight);
  await user.type(screen.getByTestId(`set-${number}-reps`), reps);
}

function lastAlertButtons(spy: jest.SpyInstance) {
  return (spy.mock.calls[spy.mock.calls.length - 1][2] ?? []) as Array<{
    text: string;
    style?: string;
    onPress?: () => void;
  }>;
}

describe('workout logging', () => {
  test('an empty routine cannot be started', async () => {
    const user = await start();
    await makeRoutine(user, 'Empty', []);
    expect(screen.getByTestId('start-workout')).toBeDisabled();
  });

  test('log sets with validation, rest timer and undo', async () => {
    const user = await start();
    await makeRoutine(user, 'Arms', [['curl', 'dumbbell-curl']]);
    await startWorkout(user);

    expect(screen.getByTestId('current-exercise-name')).toHaveTextContent(
      'Dumbbell Curl',
    );
    expect(screen.getByText('Weight per dumbbell')).toBeOnTheScreen();
    expect(
      await screen.findByText('First time logging this exercise.'),
    ).toBeOnTheScreen();
    // Values start blank; nothing is invented.
    expect(screen.getByTestId('set-1-weight')).toHaveDisplayValue('');
    expect(screen.getByTestId('set-1-reps')).toHaveDisplayValue('');

    // Completing without values explains what's missing.
    await user.press(screen.getByTestId('complete-next-set'));
    expect(
      await screen.findByText('Set 1: Enter reps first.'),
    ).toBeOnTheScreen();

    // A typing mistake is shown, not saved.
    await user.type(screen.getByTestId('set-1-weight'), '12..5');
    expect(
      await screen.findByText('Set 1: Enter a number, like 12.5'),
    ).toBeOnTheScreen();
    await user.clear(screen.getByTestId('set-1-weight'));

    await fillSet(user, 1, '12.5', '10');
    await user.press(screen.getByTestId('complete-next-set'));
    expect(
      await screen.findByRole('button', { name: 'Undo set 1' }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('rest-timer')).toBeOnTheScreen();
    expect(screen.getByText('1/3 sets done')).toBeOnTheScreen();

    // The footer moves on to the next set.
    expect(screen.getByTestId('complete-next-set')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Undo set 1' }));
    expect(
      await screen.findByRole('button', { name: 'Mark set 1 done' }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('set-1-weight')).toHaveDisplayValue('12.5');
  });

  test('rest timer can be paused, adjusted and skipped', async () => {
    const user = await start();
    await makeRoutine(user, 'Arms', [['curl', 'dumbbell-curl']]);
    await startWorkout(user);
    await fillSet(user, 1, '10', '10');
    await user.press(screen.getByRole('button', { name: 'Mark set 1 done' }));

    const timer = await screen.findByTestId('rest-timer');
    await user.press(
      within(timer).getByRole('button', { name: 'Pause rest timer' }),
    );
    expect(await within(timer).findByText('Rest paused')).toBeOnTheScreen();
    const before = within(timer).getByTestId('rest-remaining').props.children;
    await user.press(
      within(timer).getByRole('button', { name: '15 seconds more rest' }),
    );
    expect(within(timer).getByTestId('rest-remaining').props.children).not.toBe(
      before,
    );

    await user.press(within(timer).getByTestId('rest-skip'));
    expect(screen.queryByTestId('rest-timer')).not.toBeOnTheScreen();
  });

  test('leaving the screen keeps the workout, and Home offers to resume it', async () => {
    const user = await start();
    await makeRoutine(user, 'Arms', [['curl', 'dumbbell-curl']]);
    await startWorkout(user);
    await fillSet(user, 1, '12', '8');

    await act(async () => navigationRef.goBack()); // back / swipe-back
    await act(async () => navigationRef.navigate('Tabs', { screen: 'Home' }));
    expect(await screen.findByText(/Arms · Started at/)).toBeOnTheScreen();

    await user.press(screen.getByTestId('resume-workout'));
    await screen.findByTestId('active-workout-screen');
    expect(screen.getByTestId('set-1-weight')).toHaveDisplayValue('12');
    expect(screen.getByTestId('set-1-reps')).toHaveDisplayValue('8');
  });

  test('watching the demonstration keeps typed values and the rest timer', async () => {
    const { mockVideoRef } = jest.requireMock('react-native-video');
    const user = await start();
    await makeRoutine(user, 'Arms', [['curl', 'dumbbell-curl']]);
    const workout = await startWorkout(user);
    await fillSet(user, 1, '12', '10');
    await user.press(screen.getByRole('button', { name: 'Mark set 1 done' }));
    await screen.findByTestId('rest-timer');
    await user.type(screen.getByTestId('set-2-weight'), '14');

    await user.press(screen.getByTestId('watch-demo'));
    const sheet = within(await screen.findByTestId('demo-sheet-dumbbell-curl'));
    await user.press(sheet.getByTestId('demo-player-start'));
    expect(sheet.getByTestId('demo-player-video').props.source).toEqual(
      require('../assets/exercises/dumbbell-curl.mp4'),
    );
    expect(sheet.getByTestId('demo-player-video').props.paused).toBe(false);
    await user.press(
      sheet.getByRole('button', { name: 'Pause Dumbbell Curl demo' }),
    );
    expect(sheet.getByTestId('demo-player-video').props.paused).toBe(true);
    mockVideoRef.seek.mockClear();
    await user.press(sheet.getByTestId('demo-player-replay'));
    expect(mockVideoRef.seek).toHaveBeenCalledWith(0);

    await user.press(screen.getByTestId('demo-done'));
    expect(
      screen.queryByTestId('demo-sheet-dumbbell-curl'),
    ).not.toBeOnTheScreen();
    // The same workout screen, never reloaded, with everything as it was.
    expect(screen.getByTestId('active-workout-screen')).toBe(workout);
    expect(screen.getByTestId('set-1-weight')).toHaveDisplayValue('12');
    expect(screen.getByTestId('set-1-reps')).toHaveDisplayValue('10');
    expect(
      screen.getByRole('button', { name: 'Undo set 1' }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('set-2-weight')).toHaveDisplayValue('14');
    expect(screen.getByTestId('rest-timer')).toBeOnTheScreen();
  });

  test('timed and bodyweight exercises log the right things', async () => {
    const user = await start();
    await makeRoutine(user, 'Core', [
      ['plank', 'plank'],
      ['pull-up', 'pull-up'],
    ]);
    await startWorkout(user);

    // Plank: time, no weight field.
    expect(screen.queryByTestId('set-1-weight')).not.toBeOnTheScreen();
    await user.type(screen.getByTestId('set-1-time'), '1:05');
    await user.press(screen.getByRole('button', { name: 'Mark set 1 done' }));
    expect(
      await screen.findByRole('button', { name: 'Undo set 1' }),
    ).toBeOnTheScreen();

    // Pull-up: blank added weight = bodyweight only.
    await user.press(screen.getByTestId('next-exercise'));
    expect(
      await screen.findByText('Added weight (0 = bodyweight only)'),
    ).toBeOnTheScreen();
    await user.type(screen.getByTestId('set-1-reps'), '8');
    await user.press(screen.getByRole('button', { name: 'Mark set 1 done' }));
    expect(
      await screen.findByRole('button', { name: 'Undo set 1' }),
    ).toBeOnTheScreen();
  });

  test('discarding asks first', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = await start();
    await makeRoutine(user, 'Arms', [['curl', 'dumbbell-curl']]);
    await startWorkout(user);

    await user.press(screen.getByTestId('discard-workout'));
    expect(alertSpy).toHaveBeenLastCalledWith(
      'Discard this workout?',
      expect.any(String),
      expect.any(Array),
    );
    await act(async () =>
      lastAlertButtons(alertSpy)
        .find(b => b.style === 'destructive')
        ?.onPress?.(),
    );
    expect(screen.queryByTestId('active-workout-screen')).not.toBeOnTheScreen();

    await act(async () => navigationRef.navigate('Tabs', { screen: 'Home' }));
    expect(screen.queryByTestId('resume-workout')).not.toBeOnTheScreen();
    alertSpy.mockRestore();
  });

  test('finish once, see an honest summary, then see it as "last time"', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = await start();
    await makeRoutine(user, 'Arms', [['curl', 'dumbbell-curl']]);
    await startWorkout(user);

    await fillSet(user, 1, '12', '10');
    await user.press(screen.getByRole('button', { name: 'Mark set 1 done' }));
    await screen.findByRole('button', { name: 'Undo set 1' });
    await fillSet(user, 2, '12', '9'); // entered but never marked done

    await user.press(screen.getByTestId('finish-workout'));
    expect(alertSpy).toHaveBeenLastCalledWith(
      'Finish workout?',
      '1 sets done. The 2 sets not marked done won’t be saved.',
      expect.any(Array),
    );
    const finish = lastAlertButtons(alertSpy).find(b => b.text === 'Finish');
    // Two taps on Finish: the workout still finishes once.
    await act(async () => {
      finish?.onPress?.();
      finish?.onPress?.();
    });

    const summary = await screen.findByTestId('workout-summary');
    expect(within(summary).getByTestId('summary-sets')).toHaveTextContent('1');
    expect(within(summary).getByText('Set 1: 12 kg × 10')).toBeOnTheScreen();
    expect(within(summary).queryByText(/× 9/)).not.toBeOnTheScreen();
    expect(within(summary).queryByText(/calorie/i)).not.toBeOnTheScreen();

    await user.press(screen.getByTestId('summary-done'));
    expect(await screen.findByLabelText('Bodios')).toBeOnTheScreen();
    expect(screen.queryByTestId('resume-workout')).not.toBeOnTheScreen();

    // Next time, last time's numbers are shown and only copied on request.
    await user.press(
      await screen.findByRole('button', { name: 'Arms, 1 exercise' }),
    );
    await startWorkout(user);
    expect(await screen.findByTestId('previous-performance')).toHaveTextContent(
      '12 kg × 10',
    );
    expect(screen.getByTestId('set-1-weight')).toHaveDisplayValue('');
    await user.press(screen.getByTestId('copy-previous'));
    expect(await screen.findByDisplayValue('10')).toBeOnTheScreen();
    expect(screen.getByTestId('set-1-weight')).toHaveDisplayValue('12');
    alertSpy.mockRestore();
  });

  test('a second workout cannot start while one is in progress', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = await start();
    await makeRoutine(user, 'Arms', [['curl', 'dumbbell-curl']]);
    await startWorkout(user);
    await act(async () => navigationRef.goBack());

    await user.press(screen.getByTestId('start-workout'));
    expect(alertSpy).toHaveBeenLastCalledWith(
      'A workout is already in progress',
      expect.any(String),
      expect.any(Array),
    );
    await act(async () =>
      lastAlertButtons(alertSpy)
        .find(b => b.text === 'Resume it')
        ?.onPress?.(),
    );
    expect(
      await screen.findByTestId('active-workout-screen'),
    ).toBeOnTheScreen();
    alertSpy.mockRestore();
  });
});
