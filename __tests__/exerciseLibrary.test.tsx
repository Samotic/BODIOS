/**
 * Exercise library and detail screens, running on a real in-memory SQLite
 * database (see jest.setup.js).
 */

import {
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import App from '../App';

async function openLibrary() {
  const user = userEvent.setup();
  await render(<App />);
  await user.press(
    await screen.findByRole('button', { name: /Workouts, tab/ }),
  );
  await screen.findByText('Dumbbell Curl');
  return user;
}

function visibleExerciseIds() {
  return screen
    .queryAllByTestId(/^exercise-row-/)
    .map(row => String(row.props.testID).replace('exercise-row-', ''));
}

describe('exercise library', () => {
  test('lists the whole catalogue alphabetically from the database', async () => {
    await openLibrary();
    expect(screen.getByText('20 exercises')).toBeOnTheScreen();
    const ids = visibleExerciseIds();
    expect(ids[0]).toBe('barbell-back-squat');
    expect(ids).toContain('hammer-curl');
  });

  test('search and filters combine', async () => {
    const user = await openLibrary();

    await user.type(screen.getByLabelText('Search exercises'), 'curl');
    expect(visibleExerciseIds()).toEqual(['dumbbell-curl', 'hammer-curl']);
    expect(screen.getByText('2 exercises')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Search exercises'));
    await user.press(screen.getByRole('button', { name: 'Chest' }));
    await user.press(screen.getByRole('button', { name: 'Dumbbells' }));
    expect(visibleExerciseIds().sort()).toEqual([
      'dumbbell-bench-press',
      'incline-dumbbell-press',
    ]);
    expect(screen.getByRole('button', { name: 'Chest' })).toBeSelected();

    // Tapping a selected chip again turns that filter off.
    await user.press(screen.getByRole('button', { name: 'Chest' }));
    expect(visibleExerciseIds()).toContain('goblet-squat');
  });

  test('an empty search explains itself and can be cleared', async () => {
    const user = await openLibrary();

    await user.type(screen.getByLabelText('Search exercises'), 'zzzz');
    expect(await screen.findByText('No matching exercises')).toBeOnTheScreen();
    expect(screen.getByText(/Nothing matches “zzzz”/)).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Clear search and filters' }),
    );
    expect(screen.getByText('20 exercises')).toBeOnTheScreen();
    expect(screen.getByLabelText('Search exercises')).toHaveDisplayValue('');
  });
});

describe('exercise detail', () => {
  test('shows instructions, logging convention and its own demo clip with credit', async () => {
    const user = await openLibrary();

    await user.press(screen.getByTestId('exercise-row-dumbbell-curl'));
    const detail = await screen.findByTestId('exercise-detail-dumbbell-curl');
    const inDetail = within(detail);

    expect(await inDetail.findByText('Dumbbell Curl')).toBeOnTheScreen();
    expect(
      inDetail.getByText('Weight per dumbbell and reps'),
    ).toBeOnTheScreen();
    expect(
      inDetail.getByText('Keep your elbows close to your sides.'),
    ).toBeOnTheScreen();
    expect(inDetail.getByText('Common mistakes')).toBeOnTheScreen();

    // The curl's own bundled clip, credited, and nothing autoplays.
    expect(inDetail.queryByTestId('demo-unavailable')).not.toBeOnTheScreen();
    expect(inDetail.queryByTestId('demo-player-video')).not.toBeOnTheScreen();
    await user.press(inDetail.getByTestId('demo-player-start'));
    expect(inDetail.getByTestId('demo-player-video').props.source).toEqual(
      require('../assets/exercises/dumbbell-curl.mp4'),
    );
    // Bundled clips are silent, so there's no sound button to confuse.
    expect(inDetail.queryByTestId('demo-player-mute')).not.toBeOnTheScreen();
    expect(inDetail.getByTestId('demo-credit')).toHaveTextContent(
      /“Biceps Curls With Dumbbell” by Goulart, wger\.de, CC BY-SA 4\.0/,
    );
    // Technique in the video is flagged for trainer review too.
    expect(inDetail.getByTestId('draft-content-note')).toHaveTextContent(
      /Draft instructions and video/,
    );
  });

  test('an exercise without a licensed clip says so and keeps its steps', async () => {
    const user = await openLibrary();

    await user.type(screen.getByLabelText('Search exercises'), 'dead bug');
    await user.press(screen.getByTestId('exercise-row-dead-bug'));
    const detail = within(
      await screen.findByTestId('exercise-detail-dead-bug'),
    );
    expect(await detail.findByTestId('demo-unavailable')).toBeOnTheScreen();
    expect(detail.getByText('How to perform')).toBeOnTheScreen();
    expect(detail.getByTestId('draft-content-note')).toHaveTextContent(
      /^Draft instructions/,
    );
  });

  test('a clip that differs from the written steps says how', async () => {
    const user = await openLibrary();

    await user.type(screen.getByLabelText('Search exercises'), 'romanian');
    await user.press(screen.getByTestId('exercise-row-romanian-deadlift'));
    const detail = within(
      await screen.findByTestId('exercise-detail-romanian-deadlift'),
    );
    expect(await detail.findByTestId('demo-note')).toHaveTextContent(
      /^Shown with dumbbells\. With a barbell the movement is the same/,
    );
  });

  test('credits list every clip with its source and licence', async () => {
    const user = await openLibrary();

    await user.press(screen.getByTestId('exercise-row-dumbbell-curl'));
    await user.press(await screen.findByTestId('demo-credits-link'));
    const credit = within(await screen.findByTestId('credit-dumbbell-curl'));
    expect(
      credit.getByText('“Biceps Curls With Dumbbell” by Goulart'),
    ).toBeOnTheScreen();
    expect(
      credit.getByRole('link', { name: 'Licence: CC BY-SA 4.0' }),
    ).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^credit-/)).toHaveLength(19);
  });

  test('hammer curl is its own exercise with its own instructions', async () => {
    const user = await openLibrary();

    await user.press(screen.getByTestId('exercise-row-hammer-curl'));
    const detail = within(
      await screen.findByTestId('exercise-detail-hammer-curl'),
    );
    expect(await detail.findByText('Hammer Curl')).toBeOnTheScreen();
    expect(detail.getByText(/palms facing your body/)).toBeOnTheScreen();
  });

  test('timed exercises say they log time, not reps', async () => {
    const user = await openLibrary();

    // The list renders rows lazily as you scroll, so find it by searching.
    await user.type(screen.getByLabelText('Search exercises'), 'plank');
    await user.press(screen.getByTestId('exercise-row-plank'));
    const detail = within(await screen.findByTestId('exercise-detail-plank'));
    expect(await detail.findByText('Time held')).toBeOnTheScreen();
  });
});
