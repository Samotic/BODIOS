import { useFocusEffect } from '@react-navigation/native';
import {
  Maximize,
  Pause,
  Play,
  RotateCcw,
  TriangleAlert,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
} from 'react-native';
import Video, {
  type ReactVideoSource,
  type VideoRef,
} from 'react-native-video';
import { AppText, Button, IconButton } from '../../../components';
import { colors, radii, spacing } from '../../../theme';
import { claimPlayback, releasePlayback } from './playbackCoordinator';
import type { MediaSource } from './resolveMedia';

type Props = {
  source: MediaSource;
  poster: MediaSource | null;
  /** Remote clips need a connection, which changes the error message. */
  isRemote: boolean;
  /** Exercise name, used in VoiceOver labels. */
  title: string;
  /** Profile → "Start demo videos with the sound off". */
  initiallyMuted?: boolean;
  /** Silent clips get no sound button (it would do nothing). */
  hasSound?: boolean;
  testID?: string;
};

/**
 * react-native-video 6 accepts a bundled file (the number require() returns)
 * directly as `source`, as its docs show, but its types only describe the
 * object form, hence the cast.
 */
function toVideoSource(source: MediaSource): ReactVideoSource {
  return typeof source === 'number'
    ? (source as unknown as ReactVideoSource)
    : { uri: source.uri };
}

/** Landscape clips fill a 16:9 frame; portrait ones get up to 4:5. */
const WIDEST = 16 / 9;
const TALLEST = 4 / 5;

export function frameAspect(width?: number, height?: number): number {
  if (!width || !height) {
    return WIDEST;
  }
  return Math.min(WIDEST, Math.max(TALLEST, width / height));
}

/** A bundled poster knows its size before anything loads. */
function posterAspect(poster: MediaSource | null): number {
  if (typeof poster !== 'number') {
    return WIDEST;
  }
  const asset = Image.resolveAssetSource(poster);
  return frameAspect(asset?.width, asset?.height);
}

export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * Exercise demonstration player (react-native-video 6).
 *
 * - Shows the poster and a play button first: nothing autoplays.
 * - Starts muted, loops, and mixes with the user's own music rather than
 *   stopping it. Respects the silent switch.
 * - Pauses when the screen loses focus or the app leaves the foreground, and
 *   only one demo plays at a time. No background audio.
 * - "contain" fitting so the whole movement stays in frame; the frame takes
 *   the clip's shape (16:9 down to 4:5) so portrait clips aren't tiny.
 * - Failing to load never blocks the rest of the screen.
 */
export function ExerciseVideoPlayer({
  source,
  poster,
  isRemote,
  title,
  initiallyMuted = true,
  hasSound = true,
  testID = 'video-player',
}: Props) {
  const videoRef = useRef<VideoRef>(null);
  const playerId = useRef(Symbol(title)).current;

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(initiallyMuted);
  const [rate, setRate] = useState<1 | 0.5>(1);
  const [loaded, setLoaded] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(() => posterAspect(poster));

  const pause = useCallback(() => setPaused(true), []);

  const play = useCallback(() => {
    claimPlayback(playerId, pause);
    setStarted(true);
    setPaused(false);
  }, [playerId, pause]);

  // Leaving the screen (back, swipe-back, another tab) pauses the demo.
  useFocusEffect(useCallback(() => pause, [pause]));

  // So does the app leaving the foreground (home screen, a call, Siri).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        pause();
      }
    });
    return () => subscription.remove();
  }, [pause]);

  useEffect(() => () => releasePlayback(playerId), [playerId]);

  const seekTo = (seconds: number) => {
    const target = Math.min(Math.max(seconds, 0), duration);
    videoRef.current?.seek(target);
    setPosition(target);
  };

  const replay = () => {
    videoRef.current?.seek(0);
    setPosition(0);
    play();
  };

  const retry = () => {
    setFailed(false);
    setLoaded(false);
    setPosition(0);
    setAttempt(n => n + 1);
    play();
  };

  const onTimelinePress = (event: GestureResponderEvent) => {
    if (timelineWidth > 0 && duration > 0) {
      seekTo((event.nativeEvent.locationX / timelineWidth) * duration);
    }
  };

  const onTimelineAction = (event: AccessibilityActionEvent) => {
    const step = Math.max(1, duration / 10);
    if (event.nativeEvent.actionName === 'increment') {
      seekTo(position + step);
    } else if (event.nativeEvent.actionName === 'decrement') {
      seekTo(position - step);
    }
  };

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <View style={styles.wrapper} testID={testID}>
      <View style={[styles.frame, { aspectRatio }]}>
        {started && !failed ? (
          <Video
            key={attempt}
            ref={videoRef}
            source={toVideoSource(source)}
            paused={paused}
            muted={muted}
            rate={rate}
            repeat
            resizeMode="contain"
            mixWithOthers="mix"
            ignoreSilentSwitch="obey"
            playInBackground={false}
            playWhenInactive={false}
            progressUpdateInterval={250}
            onLoad={data => {
              setDuration(data.duration);
              setLoaded(true);
              setAspectRatio(
                frameAspect(data.naturalSize?.width, data.naturalSize?.height),
              );
            }}
            onProgress={data => setPosition(data.currentTime)}
            onBuffer={data => setBuffering(data.isBuffering)}
            onError={() => {
              setFailed(true);
              setPaused(true);
              releasePlayback(playerId);
            }}
            style={StyleSheet.absoluteFill}
            testID={`${testID}-video`}
          />
        ) : null}

        {!started ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={play}
            accessibilityRole="button"
            accessibilityLabel={`Play ${title} demo`}
            testID={`${testID}-start`}
          >
            {poster !== null ? (
              <Image
                source={poster}
                resizeMode="contain"
                // Explicit size: with only absolute edges, a bundled poster
                // drew at its natural size and showed a zoomed-in corner.
                style={styles.poster}
                accessibilityIgnoresInvertColors
              />
            ) : null}
            <View style={styles.center}>
              <View style={styles.bigPlay}>
                <Play
                  color={colors.onAccent}
                  size={30}
                  fill={colors.onAccent}
                />
              </View>
            </View>
          </Pressable>
        ) : null}

        {started && !failed && (!loaded || buffering) ? (
          <View style={styles.center} pointerEvents="none">
            <ActivityIndicator
              color={colors.accent}
              accessibilityLabel="Loading demo"
            />
          </View>
        ) : null}

        {failed ? (
          <View
            style={[styles.center, styles.error]}
            testID={`${testID}-error`}
          >
            <TriangleAlert color={colors.textSecondary} size={28} />
            <AppText variant="bodyStrong" style={styles.errorText}>
              {isRemote
                ? 'Couldn’t load the demo. Online demos need an internet connection.'
                : 'Couldn’t play this demo.'}
            </AppText>
            <Button title="Try again" variant="secondary" onPress={retry} />
          </View>
        ) : null}
      </View>

      {started && !failed ? (
        <View style={styles.controls}>
          <View style={styles.timelineRow}>
            <Pressable
              style={styles.timeline}
              onLayout={e => setTimelineWidth(e.nativeEvent.layout.width)}
              onPress={onTimelinePress}
              accessibilityRole="adjustable"
              accessibilityLabel="Playback position"
              accessibilityValue={{
                text: `${formatTime(position)} of ${formatTime(duration)}`,
              }}
              accessibilityActions={[
                { name: 'increment' },
                { name: 'decrement' },
              ]}
              onAccessibilityAction={onTimelineAction}
              testID={`${testID}-timeline`}
            >
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />
              </View>
            </Pressable>
            <AppText
              variant="caption"
              tone="secondary"
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {formatTime(position)} / {formatTime(duration)}
            </AppText>
          </View>

          <View style={styles.buttons}>
            <IconButton
              label={paused ? `Play ${title} demo` : `Pause ${title} demo`}
              icon={paused ? Play : Pause}
              onPress={paused ? play : pause}
              testID={`${testID}-toggle`}
            />
            <IconButton
              label="Replay from the start"
              icon={RotateCcw}
              onPress={replay}
              testID={`${testID}-replay`}
            />
            <IconButton
              label={rate === 1 ? 'Speed: normal' : 'Speed: half'}
              accessibilityHint="Switches between normal and half speed"
              text={rate === 1 ? '1×' : '0.5×'}
              onPress={() => setRate(r => (r === 1 ? 0.5 : 1))}
              testID={`${testID}-speed`}
            />
            {hasSound ? (
              <IconButton
                label={muted ? 'Sound off. Turn on' : 'Sound on. Turn off'}
                icon={muted ? VolumeX : Volume2}
                onPress={() => setMuted(m => !m)}
                testID={`${testID}-mute`}
              />
            ) : null}
            <IconButton
              label="Full screen"
              accessibilityHint="Close full screen with the button in the corner"
              icon={Maximize}
              onPress={() => videoRef.current?.presentFullscreenPlayer()}
              testID={`${testID}-fullscreen`}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  frame: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlay: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorText: {
    textAlign: 'center',
  },
  controls: {
    gap: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeline: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    backgroundColor: colors.accent,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
