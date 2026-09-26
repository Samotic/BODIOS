/**
 * VoiceOver audit: on every main screen, each button (anything with the
 * button role) must have a name, from its accessibilityLabel or its visible
 * text. Icon-only buttons are the usual offenders.
 */

import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import App from '../App';
import { navigationRef } from '../src/navigation/RootNavigator';

type HostNode = {
  type: unknown;
  props: Record<string, unknown>;
  children: Array<HostNode | string>;
};

function textOf(node: HostNode | string): string {
  if (typeof node === 'string') {
    return node;
  }
  return (node.children ?? []).map(textOf).join(' ');
}

/** Buttons with no accessible name, skipping screens hidden behind others. */
function unlabelledButtons(
  node: HostNode | string,
  found: string[] = [],
): string[] {
  if (typeof node === 'string') {
    return found;
  }
  const p = node.props ?? {};
  if (p['aria-hidden'] === true || p.accessibilityElementsHidden === true) {
    return found;
  }
  if (p.accessibilityRole === 'button' || p.role === 'button') {
    const name = String(
      p.accessibilityLabel ?? p['aria-label'] ?? textOf(node),
    ).trim();
    if (!name) {
      found.push(String(p.testID ?? node.type));
    }
  }
  for (const child of node.children ?? []) {
    unlabelledButtons(child, found);
  }
  return found;
}

function expectAllButtonsNamed(where: string) {
  const root = screen.root as unknown as HostNode;
  expect({ where, unnamed: unlabelledButtons(root) }).toEqual({
    where,
    unnamed: [],
  });
}

test('every button on every main screen has a VoiceOver name', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert');
  const user = userEvent.setup();
  await render(<App />);
  await screen.findByLabelText('Bodios');
  expectAllButtonsNamed('Home (empty)');

  await user.press(screen.getByRole('button', { name: /Workouts, tab/ }));
  await screen.findByText('Dumbbell Curl');
  expectAllButtonsNamed('Workouts');

  await user.press(screen.getByTestId('exercise-row-dumbbell-curl'));
  await screen.findByTestId('demo-player-start');
  expectAllButtonsNamed('Exercise detail');
  await user.press(screen.getByTestId('demo-player-start'));
  expectAllButtonsNamed('Exercise detail, video playing');

  await user.press(screen.getByTestId('add-to-routine'));
  await screen.findByText('Add Dumbbell Curl to:');
  expectAllButtonsNamed('Add-to-routine sheet');

  await user.press(screen.getByRole('button', { name: 'New routine' }));
  await user.type(await screen.findByLabelText('Routine name'), 'A11y');
  expectAllButtonsNamed('New routine sheet');
  await user.press(screen.getByTestId('routine-name-save'));
  await screen.findByText('Added to A11y');

  await act(async () => navigationRef.navigate('Tabs', { screen: 'Home' }));
  await user.press(
    await screen.findByRole('button', { name: /A11y, 1 exercise/ }),
  );
  await screen.findByTestId('routine-editor');
  expectAllButtonsNamed('Routine editor');

  await user.press(screen.getByTestId('start-workout'));
  await screen.findByTestId('active-workout-screen');
  expectAllButtonsNamed('Workout (before logging)');

  await user.type(screen.getByTestId('set-1-weight'), '10');
  await user.type(screen.getByTestId('set-1-reps'), '10');
  await user.press(screen.getByRole('button', { name: 'Mark set 1 done' }));
  await screen.findByTestId('rest-timer');
  expectAllButtonsNamed('Workout (resting)');

  await user.press(screen.getByTestId('finish-workout'));
  const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] ?? [];
  await act(async () => buttons.find(b => b.text === 'Finish')?.onPress?.());
  await screen.findByTestId('workout-summary');
  expectAllButtonsNamed('Summary');

  await user.press(screen.getByTestId('summary-done'));
  await screen.findByTestId('home-week-workouts');
  expectAllButtonsNamed('Home (with data)');

  await user.press(screen.getByRole('button', { name: /Progress, tab/ }));
  await screen.findByTestId('workouts-chart');
  expectAllButtonsNamed('Progress');

  await user.press(screen.getByTestId('best-dumbbell-curl'));
  await screen.findByTestId('trend-chart');
  expectAllButtonsNamed('Exercise progress');

  await act(async () => navigationRef.navigate('Tabs', { screen: 'Profile' }));
  await screen.findByTestId('export-data');
  expectAllButtonsNamed('Profile');
  alertSpy.mockRestore();
});
