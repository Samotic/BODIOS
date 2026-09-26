/**
 * @format
 */

import { render, screen, userEvent } from '@testing-library/react-native';
import App from '../App';

describe('App shell', () => {
  test('opens on a genuine empty Home screen with four tabs', async () => {
    await render(<App />);

    // Screens appear once the database has opened and migrated.
    expect(await screen.findByLabelText('Bodios')).toBeOnTheScreen();
    expect(screen.getByText('No routines yet')).toBeOnTheScreen();
    // No workout has been started, so there is nothing to resume.
    expect(screen.queryByText('Resume workout')).not.toBeOnTheScreen();

    for (const tab of ['Home', 'Workouts', 'Progress', 'Profile']) {
      expect(
        screen.getByRole('button', { name: new RegExp(tab) }),
      ).toBeOnTheScreen();
    }
  });

  test('switches between tabs', async () => {
    const user = userEvent.setup();
    await render(<App />);

    await user.press(await screen.findByRole('button', { name: /Progress/ }));
    expect(await screen.findByText('Your progress')).toBeOnTheScreen();
    expect(screen.getByText('No workouts yet')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Profile/ }));
    expect(await screen.findByText('Video credits')).toBeOnTheScreen();
  });

  test('"Browse exercises" on Home opens the exercise library', async () => {
    const user = userEvent.setup();
    await render(<App />);

    await user.press(
      await screen.findByRole('button', { name: 'Browse exercises' }),
    );
    expect(await screen.findByText('Dumbbell Curl')).toBeOnTheScreen();
  });
});
