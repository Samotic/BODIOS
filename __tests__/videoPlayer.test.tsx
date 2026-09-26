/**
 * The demo player's behaviour, with react-native-video replaced by a plain
 * View (see jest.setup.js). Real playback is checked on the Simulator.
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  ExerciseVideoPlayer,
  formatTime,
  frameAspect,
} from '../src/features/exercises/media/ExerciseVideoPlayer';
import {
  claimPlayback,
  releasePlayback,
} from '../src/features/exercises/media/playbackCoordinator';
import { resolveMedia } from '../src/features/exercises/media/resolveMedia';
import type { ExerciseMedia } from '../src/features/exercises/types';

const { mockVideoRef } = jest.requireMock('react-native-video');

// useFocusEffect needs a navigator around the player.
function InScreen({ children }: { children: ReactNode }) {
  const Stack = createNativeStackNavigator();
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Test">{() => children}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const clip = 42; // what require('./clip.mp4') returns: an asset number

async function renderPlayer(
  props: Partial<Parameters<typeof ExerciseVideoPlayer>[0]> = {},
) {
  await render(
    <InScreen>
      <ExerciseVideoPlayer
        source={clip}
        poster={null}
        isRemote={false}
        title="Dumbbell Curl"
        {...props}
      />
    </InScreen>,
  );
}

const nativeVideo = (id = 'video-player') => screen.getByTestId(`${id}-video`);

beforeEach(() => {
  mockVideoRef.seek.mockClear();
  mockVideoRef.presentFullscreenPlayer.mockClear();
});

describe('ExerciseVideoPlayer', () => {
  test('does not autoplay: shows a play button and no video until tapped', async () => {
    await renderPlayer();
    expect(
      screen.getByRole('button', { name: 'Play Dumbbell Curl demo' }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('video-player-video')).not.toBeOnTheScreen();
  });

  test('tapping play starts a muted, looping, fitted video that mixes with music', async () => {
    const user = userEvent.setup();
    await renderPlayer();
    await user.press(screen.getByTestId('video-player-start'));

    expect(nativeVideo().props).toMatchObject({
      source: clip,
      paused: false,
      muted: true,
      repeat: true,
      rate: 1,
      resizeMode: 'contain',
      mixWithOthers: 'mix',
      playInBackground: false,
    });
    expect(screen.getByLabelText('Loading demo')).toBeOnTheScreen();
    await act(() => nativeVideo().props.onLoad({ duration: 12 }));
    expect(screen.queryByLabelText('Loading demo')).not.toBeOnTheScreen();
  });

  test('controls: pause, sound, speed, replay, seek and full screen', async () => {
    const user = userEvent.setup();
    await renderPlayer();
    await user.press(screen.getByTestId('video-player-start'));
    await act(() => nativeVideo().props.onLoad({ duration: 12 }));

    await user.press(
      screen.getByRole('button', { name: 'Pause Dumbbell Curl demo' }),
    );
    expect(nativeVideo().props.paused).toBe(true);

    await user.press(
      screen.getByRole('button', { name: 'Sound off. Turn on' }),
    );
    expect(nativeVideo().props.muted).toBe(false);

    await user.press(screen.getByRole('button', { name: 'Speed: normal' }));
    expect(nativeVideo().props.rate).toBe(0.5);
    expect(screen.getByText('0.5×')).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Replay from the start' }),
    );
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(0);
    expect(nativeVideo().props.paused).toBe(false);

    // Tap three quarters of the way along a 200pt timeline.
    const timeline = screen.getByTestId('video-player-timeline');
    await fireEvent(timeline, 'layout', {
      nativeEvent: { layout: { width: 200 } },
    });
    await fireEvent.press(timeline, { nativeEvent: { locationX: 150 } });
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(9);

    // VoiceOver swipe up/down on the timeline also seeks.
    await fireEvent(timeline, 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(mockVideoRef.seek).toHaveBeenLastCalledWith(7.8);

    await user.press(screen.getByRole('button', { name: 'Full screen' }));
    expect(mockVideoRef.presentFullscreenPlayer).toHaveBeenCalledTimes(1);
  });

  test('a failed load shows a message and can be retried', async () => {
    const user = userEvent.setup();
    await renderPlayer();
    await user.press(screen.getByTestId('video-player-start'));

    await act(() => nativeVideo().props.onError({ error: { error: 'boom' } }));
    expect(screen.getByText('Couldn’t play this demo.')).toBeOnTheScreen();
    expect(screen.queryByTestId('video-player-video')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Try again' }));
    expect(nativeVideo().props.paused).toBe(false);
  });

  test('remote clips explain that they need internet', async () => {
    const user = userEvent.setup();
    await renderPlayer({
      source: { uri: 'https://cdn.example.com/curl.mp4' },
      isRemote: true,
    });
    await user.press(screen.getByTestId('video-player-start'));
    await act(() => nativeVideo().props.onError({ error: {} }));
    expect(
      screen.getByText(/Online demos need an internet connection/),
    ).toBeOnTheScreen();
  });

  test('pauses when the app leaves the foreground', async () => {
    // React Native's Jest setup already mocks AppState.addEventListener;
    // swap it and put the same function back (mockRestore would erase it).
    const original = AppState.addEventListener;
    const listeners: Array<(state: AppStateStatus) => void> = [];
    AppState.addEventListener = ((_type, listener) => {
      listeners.push(listener as (state: AppStateStatus) => void);
      return { remove: () => {} };
    }) as typeof AppState.addEventListener;

    try {
      const user = userEvent.setup();
      await renderPlayer();
      await user.press(screen.getByTestId('video-player-start'));
      expect(nativeVideo().props.paused).toBe(false);

      await act(() => listeners.forEach(listener => listener('background')));
      expect(nativeVideo().props.paused).toBe(true);
    } finally {
      AppState.addEventListener = original;
    }
  });

  test('only one demo plays at a time', async () => {
    const user = userEvent.setup();
    await render(
      <InScreen>
        <ExerciseVideoPlayer
          source={clip}
          poster={null}
          isRemote={false}
          title="A"
          testID="a"
        />
        <ExerciseVideoPlayer
          source={clip}
          poster={null}
          isRemote={false}
          title="B"
          testID="b"
        />
      </InScreen>,
    );
    await user.press(screen.getByTestId('a-start'));
    await user.press(screen.getByTestId('b-start'));

    expect(nativeVideo('a').props.paused).toBe(true);
    expect(nativeVideo('b').props.paused).toBe(false);
  });
});

test('formatTime', () => {
  expect(formatTime(0)).toBe('0:00');
  expect(formatTime(9.7)).toBe('0:09');
  expect(formatTime(75)).toBe('1:15');
  expect(formatTime(-3)).toBe('0:00');
});

test('playback coordinator pauses the previous player only', () => {
  const a = Symbol('a');
  const b = Symbol('b');
  const pauseA = jest.fn();
  const pauseB = jest.fn();
  claimPlayback(a, pauseA);
  claimPlayback(a, pauseA); // same player again: nothing to pause
  expect(pauseA).not.toHaveBeenCalled();
  claimPlayback(b, pauseB);
  expect(pauseA).toHaveBeenCalledTimes(1);
  releasePlayback(b);
  claimPlayback(a, pauseA);
  expect(pauseB).not.toHaveBeenCalled();
  releasePlayback(a);
});

describe('resolveMedia', () => {
  const base: ExerciseMedia = {
    id: 'curl-demo',
    exerciseId: 'dumbbell-curl',
    localAssetKey: null,
    remoteUrl: null,
    posterAssetKey: null,
    posterUrl: null,
    durationSeconds: 12,
    source: 'Recorded by the owner',
    permissionNotes: 'Owned',
    attribution: null,
    reviewStatus: 'approved',
  };
  const assets = {
    videos: { 'dumbbell-curl': 7 },
    posters: { 'dumbbell-curl': 8 },
  };

  test('prefers the bundled file and its poster', () => {
    expect(
      resolveMedia(
        {
          ...base,
          localAssetKey: 'dumbbell-curl',
          posterAssetKey: 'dumbbell-curl',
          remoteUrl: 'https://x/y.mp4',
        },
        assets,
      ),
    ).toEqual({ video: 7, poster: 8, isRemote: false });
  });

  test('falls back to an https URL and marks it remote', () => {
    expect(
      resolveMedia(
        { ...base, remoteUrl: 'https://cdn.example.com/c.mp4' },
        assets,
      ),
    ).toEqual({
      video: { uri: 'https://cdn.example.com/c.mp4' },
      poster: null,
      isRemote: true,
    });
  });

  test('returns null when the file is missing or the URL is not https', () => {
    expect(
      resolveMedia({ ...base, localAssetKey: 'not-bundled' }, assets),
    ).toBeNull();
    expect(
      resolveMedia({ ...base, remoteUrl: 'http://insecure/c.mp4' }, assets),
    ).toBeNull();
  });
});

test('a silent clip has no sound button', async () => {
  const user = userEvent.setup();
  await renderPlayer({ hasSound: false });
  await user.press(screen.getByTestId('video-player-start'));
  expect(screen.getByTestId('video-player-toggle')).toBeOnTheScreen();
  expect(screen.queryByTestId('video-player-mute')).not.toBeOnTheScreen();
});

describe('frameAspect', () => {
  test('landscape fills 16:9, portrait is capped at 4:5, unknown is 16:9', () => {
    expect(frameAspect(1280, 720)).toBeCloseTo(16 / 9);
    expect(frameAspect(640, 352)).toBeCloseTo(16 / 9);
    expect(frameAspect(720, 900)).toBeCloseTo(4 / 5);
    expect(frameAspect(720, 1280)).toBeCloseTo(4 / 5);
    expect(frameAspect(1000, 1000)).toBe(1);
    expect(frameAspect(undefined, 720)).toBeCloseTo(16 / 9);
  });
});
