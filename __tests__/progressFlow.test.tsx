/**
 * Progress, history and settings through the whole app, on a fresh
 * in-memory SQLite database per test (see jest.setup.js).
 */

import {
  act,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import App from '../App';
import { navigationRef } from '../src/navigation/RootNavigator';

type User = ReturnType<typeof userEvent.setup>;

function lastAlertButtons(spy: jest.SpyInstance) {
  return (spy.mock.calls[spy.mock.calls.length - 1][2] ?? []) as Array<{
    text: string;
    style?: string;
    onPress?: () => void;
  }>;
}

async function start() {
  const user = userEvent.setup();
  await render(<App />);
  await screen.findByLabelText('Bodios');
  return user;
}

/** Makes a one-exercise routine, logs one curl set and finishes. */
async function logWorkout(
  user: User,
  alertSpy: jest.SpyInstance,
  weight: string,
  reps: string,
) {
  await user.press(screen.getByRole('button', { name: /Workouts, tab/ }));
  await user.press(await screen.findByTestId('new-routine'));
  await user.type(await screen.findByLabelText('Routine name'), 'Arms');
  await user.press(screen.getByTestId('routine-name-save'));
  await user.press(
    (
      await screen.findAllByRole('button', { name: 'Add exercise' })
    )[0],
  );
  await user.type(await screen.findByLabelText('Search exercises'), 'curl');
  await user.press(await screen.findByTestId('exercise-row-dumbbell-curl'));
  await user.press(await screen.findByTestId('start-workout'));
  await screen.findByTestId('active-workout-screen');
  await user.type(screen.getByTestId('set-1-weight'), weight);
  await user.type(screen.getByTestId('set-1-reps'), reps);
  await user.press(screen.getByRole('button', { name: 'Mark set 1 done' }));
  await screen.findByRole('button', { name: 'Undo set 1' });
  await user.press(screen.getByTestId('finish-workout'));
  await act(async () =>
    lastAlertButtons(alertSpy)
      .find(b => b.text === 'Finish')
      ?.onPress?.(),
  );
  await screen.findByTestId('workout-summary');
  await user.press(screen.getByTestId('summary-done'));
  await screen.findByLabelText('Bodios');
}

let alertSpy: jest.SpyInstance;
beforeEach(() => {
  alertSpy = jest.spyOn(Alert, 'alert');
});
afterEach(() => alertSpy.mockRestore());

describe('progress', () => {
  test('empty history shows an honest empty state', async () => {
    const user = await start();
    await user.press(screen.getByRole('button', { name: /Progress, tab/ }));
    expect(await screen.findByText('No workouts yet')).toBeOnTheScreen();
    expect(screen.queryByTestId('workouts-chart')).not.toBeOnTheScreen();
  });

  test('a finished workout appears in Home, stats, chart, best lifts and history', async () => {
    const user = await start();
    await logWorkout(user, alertSpy, '12.5', '10');

    // Home: this week's real numbers.
    expect(await screen.findByTestId('home-week-workouts')).toHaveTextContent(
      '1',
    );
    expect(screen.getByLabelText(/Today, .*workout logged/)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Progress, tab/ }));
    const best = await screen.findByTestId('best-dumbbell-curl');
    expect(within(best).getByText('12.5 kg × 10')).toBeOnTheScreen();
    expect(screen.getByTestId('stat-workouts')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-days')).toHaveTextContent('1');
    expect(screen.getByTestId('period-label')).toHaveTextContent('This week');

    // Chart has a text equivalent.
    await user.press(screen.getByTestId('workouts-chart-table-toggle'));
    expect(screen.getAllByText('1 workout').length).toBeGreaterThanOrEqual(1);

    // Month view scopes the same data.
    await user.press(screen.getByRole('button', { name: 'Month' }));
    expect(screen.getByText('Workouts per week')).toBeOnTheScreen();
    expect(screen.getByTestId('stat-workouts')).toHaveTextContent('1');

    // A previous period has none, and says so.
    await user.press(screen.getByTestId('period-previous'));
    expect(screen.getByTestId('stat-workouts')).toHaveTextContent('0');
    expect(screen.getByText('No workouts in this period.')).toBeOnTheScreen();
  });

  test('exercise progress shows the best set, not an estimated 1RM', async () => {
    const user = await start();
    await logWorkout(user, alertSpy, '14', '6');
    await user.press(screen.getByRole('button', { name: /Progress, tab/ }));
    await user.press(await screen.findByTestId('best-dumbbell-curl'));
    expect(await screen.findByTestId('exercise-best')).toHaveTextContent(
      '14 kg × 6',
    );
    expect(screen.getByText(/not an estimated one-rep max/)).toBeOnTheScreen();
    expect(screen.getByTestId('trend-chart')).toBeOnTheScreen();
  });

  test('deleting a workout from history asks first and updates everything', async () => {
    const user = await start();
    await logWorkout(user, alertSpy, '12', '8');
    await user.press(screen.getByRole('button', { name: /Progress, tab/ }));
    await user.press(await screen.findByRole('button', { name: /Arms/ }));
    await screen.findByTestId('session-detail');

    await user.press(screen.getByTestId('delete-workout'));
    expect(alertSpy).toHaveBeenLastCalledWith(
      'Delete this workout?',
      expect.any(String),
      expect.any(Array),
    );
    await act(async () =>
      lastAlertButtons(alertSpy)
        .find(b => b.style === 'destructive')
        ?.onPress?.(),
    );

    expect(await screen.findByText('No workouts yet')).toBeOnTheScreen();
    await act(async () => navigationRef.navigate('Tabs', { screen: 'Home' }));
    expect(screen.queryByTestId('home-week-workouts')).not.toBeOnTheScreen();
  });
});

describe('settings', () => {
  test('pounds change what is shown and typed, never what is stored', async () => {
    const user = await start();
    await user.press(screen.getByRole('button', { name: /Profile, tab/ }));
    await user.press(
      await screen.findByRole('button', { name: 'Pounds (lb)' }),
    );
    expect(screen.getByRole('button', { name: 'Pounds (lb)' })).toBeSelected();

    // 45 lb typed → stored as 20.412 kg → shown back as 45 lb.
    await logWorkout(user, alertSpy, '45', '10');
    await user.press(screen.getByRole('button', { name: /Progress, tab/ }));
    const best = await screen.findByTestId('best-dumbbell-curl');
    expect(within(best).getByText('45 lb × 10')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Profile, tab/ }));
    await user.press(screen.getByRole('button', { name: 'Kilograms (kg)' }));
    await user.press(screen.getByRole('button', { name: /Progress, tab/ }));
    expect(
      await within(await screen.findByTestId('best-dumbbell-curl')).findByText(
        '20.41 kg × 10',
      ),
    ).toBeOnTheScreen();
  });

  test('export shares the data as JSON through the share sheet', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    const user = await start();
    await logWorkout(user, alertSpy, '12', '10');
    await user.press(screen.getByRole('button', { name: /Profile, tab/ }));
    await user.press(await screen.findByTestId('export-data'));

    expect(shareSpy).toHaveBeenCalledTimes(1);
    const message = (shareSpy.mock.calls[0][0] as { message: string }).message;
    const data = JSON.parse(message);
    expect(data.format).toBe('bodios-export');
    expect(data.workouts[0].exercises[0].sets[0]).toMatchObject({
      weightKg: 12,
      reps: 10,
    });
    shareSpy.mockRestore();
  });

  test('reset asks first, then deletes routines and history', async () => {
    const user = await start();
    await logWorkout(user, alertSpy, '12', '10');
    await user.press(screen.getByRole('button', { name: /Profile, tab/ }));
    await user.press(await screen.findByTestId('reset-data'));
    expect(alertSpy).toHaveBeenLastCalledWith(
      'Delete all your data?',
      expect.any(String),
      expect.any(Array),
    );
    await act(async () =>
      lastAlertButtons(alertSpy)
        .find(b => b.style === 'destructive')
        ?.onPress?.(),
    );

    await user.press(screen.getByRole('button', { name: /Progress, tab/ }));
    expect(await screen.findByText('No workouts yet')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: /Home, tab/ }));
    expect(await screen.findByText('No routines yet')).toBeOnTheScreen();
  });
});
