/**
 * Routine builder flows through the whole app, on a fresh in-memory SQLite
 * database for each test (see jest.setup.js).
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

async function start() {
  const user = userEvent.setup();
  await render(<App />);
  await screen.findByLabelText('Bodios');
  return user;
}

async function createRoutine(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.press(screen.getByRole('button', { name: /Workouts, tab/ }));
  await user.press(await screen.findByTestId('new-routine'));
  await user.type(await screen.findByLabelText('Routine name'), name);
  await user.press(screen.getByTestId('routine-name-save'));
  return screen.findByTestId('routine-editor');
}

async function addExercise(
  user: ReturnType<typeof userEvent.setup>,
  query: string,
  id: string,
) {
  await user.press(screen.getAllByRole('button', { name: 'Add exercise' })[0]);
  await user.type(await screen.findByLabelText('Search exercises'), query);
  await user.press(await screen.findByTestId(`exercise-row-${id}`));
  await screen.findByTestId(`routine-item-${id}`);
}

describe('routine builder', () => {
  test('create a routine, add exercises and change targets', async () => {
    const user = await start();
    await createRoutine(user, 'Arm day');

    expect(
      screen.getByText(
        'Add at least one exercise before you can start this routine.',
      ),
    ).toBeOnTheScreen();

    await addExercise(user, 'curl', 'dumbbell-curl');
    expect(screen.getByLabelText('Dumbbell Curl sets: 3')).toBeOnTheScreen();
    expect(screen.getByText('Weight per dumbbell')).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Increase Dumbbell Curl sets' }),
    );
    await user.press(
      screen.getByRole('button', { name: 'Increase Dumbbell Curl sets' }),
    );
    await user.press(
      screen.getByRole('button', { name: 'Decrease Dumbbell Curl rest' }),
    );
    expect(
      await screen.findByLabelText('Dumbbell Curl sets: 5'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Dumbbell Curl rest: 1 min 15 s'),
    ).toBeOnTheScreen();

    await addExercise(user, 'plank', 'plank');
    expect(screen.getByLabelText('Plank time per set: 30 s')).toBeOnTheScreen();
    expect(screen.getByText('2 exercises')).toBeOnTheScreen();
  });

  test('reorder with up/down and remove exercises', async () => {
    const user = await start();
    await createRoutine(user, 'Order test');
    await addExercise(user, 'curl', 'dumbbell-curl');
    await addExercise(user, 'hammer', 'hammer-curl');

    // First item can't move up; last can't move down.
    expect(
      screen.getByRole('button', { name: 'Move Dumbbell Curl up' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Hammer Curl down' }),
    ).toBeDisabled();

    await user.press(
      screen.getByRole('button', { name: 'Move Hammer Curl up' }),
    );
    expect(await screen.findByText('1. Hammer Curl')).toBeOnTheScreen();
    expect(screen.getByText('2. Dumbbell Curl')).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Remove Hammer Curl from routine' }),
    );
    expect(await screen.findByText('1. Dumbbell Curl')).toBeOnTheScreen();
    expect(screen.queryByText(/Hammer Curl/)).not.toBeOnTheScreen();
  });

  test('an empty name is rejected with a message', async () => {
    const user = await start();
    await user.press(screen.getByRole('button', { name: /Workouts, tab/ }));
    await user.press(await screen.findByTestId('new-routine'));

    await user.press(await screen.findByTestId('routine-name-save'));
    expect(screen.getByText('Give the routine a name.')).toBeOnTheScreen();
    expect(screen.queryByTestId('routine-editor')).not.toBeOnTheScreen();
  });

  test('rename and delete (with confirmation)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = await start();
    await createRoutine(user, 'Old name');

    await user.press(screen.getByRole('button', { name: 'Rename routine' }));
    const input = await screen.findByLabelText('Routine name');
    expect(input).toHaveDisplayValue('Old name');
    await user.clear(input);
    await user.type(input, 'New name');
    await user.press(screen.getByTestId('routine-name-save'));
    await screen.findByTestId('routine-editor');

    await user.press(screen.getByRole('button', { name: 'Delete routine' }));
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete “New name”?',
      expect.any(String),
      expect.any(Array),
    );
    const buttons =
      alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] ?? [];
    await act(async () =>
      buttons.find(b => b.style === 'destructive')?.onPress?.(),
    );

    expect(await screen.findByText(/No routines yet/)).toBeOnTheScreen();
    alertSpy.mockRestore();
  });

  test('Home lists saved routines instead of "No routines yet"', async () => {
    const user = await start();
    expect(screen.getByText('No routines yet')).toBeOnTheScreen();
    await createRoutine(user, 'Push day');
    await act(async () => {
      const { navigationRef } = require('../src/navigation/RootNavigator');
      navigationRef.goBack();
    });
    await user.press(screen.getByRole('button', { name: /Home, tab/ }));
    expect(await screen.findByText('Your routines')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Push day, 0 exercises' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('No routines yet')).not.toBeOnTheScreen();
  });
});

describe('add to routine from exercise detail', () => {
  async function openCurl(user: ReturnType<typeof userEvent.setup>) {
    await user.press(screen.getByRole('button', { name: /Workouts, tab/ }));
    await user.type(await screen.findByLabelText('Search exercises'), 'curl');
    await user.press(await screen.findByTestId('exercise-row-dumbbell-curl'));
    await screen.findByTestId('exercise-detail-dumbbell-curl');
  }

  test('creates a new routine that starts with the exercise', async () => {
    const user = await start();
    await openCurl(user);

    await user.press(await screen.findByTestId('add-to-routine'));
    expect(await screen.findByText('Add Dumbbell Curl to:')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'New routine' }));
    await user.type(await screen.findByLabelText('Routine name'), 'Biceps');
    await user.press(screen.getByTestId('routine-name-save'));

    const note = await screen.findByTestId('added-to-routine');
    expect(within(note).getByText('Added to Biceps')).toBeOnTheScreen();
  });

  test('adds to an existing routine', async () => {
    const user = await start();
    await createRoutine(user, 'Pull day');
    await act(async () => {
      const { navigationRef } = require('../src/navigation/RootNavigator');
      navigationRef.goBack();
    });
    await user.clear(await screen.findByLabelText('Search exercises'));
    await user.type(screen.getByLabelText('Search exercises'), 'curl');
    await user.press(await screen.findByTestId('exercise-row-dumbbell-curl'));

    await user.press(await screen.findByTestId('add-to-routine'));
    await user.press(
      await screen.findByRole('button', { name: 'Pull day, 0 exercises' }),
    );
    expect(await screen.findByText('Added to Pull day')).toBeOnTheScreen();
  });
});
