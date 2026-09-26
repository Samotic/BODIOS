import { VideoOff } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { demoNotes, silentMediaIds } from '../../data/mediaCatalogue';
import { useSettings } from '../../db/DatabaseProvider';
import { colors, radii, spacing, touchTarget } from '../../theme';
import { ExerciseVideoPlayer } from './media/ExerciseVideoPlayer';
import { resolveMedia } from './media/resolveMedia';
import type { ExerciseMedia } from './types';

/**
 * The demo area on exercise detail and in the workout's demo sheet. Shows
 * the player and its credit for an approved clip; otherwise says plainly
 * that there is no demo and points to the written steps, which always work,
 * even offline.
 */
export function ExerciseDemo({
  media,
  title,
  onShowCredits,
}: {
  media: ExerciseMedia | null;
  title: string;
  /** Opens the full list of sources and licences. */
  onShowCredits?: () => void;
}) {
  const { settings } = useSettings();

  if (!media) {
    return (
      <Unavailable heading="No demo video yet" testID="demo-unavailable" />
    );
  }

  const resolved = resolveMedia(media);
  if (!resolved) {
    // Metadata exists but the file isn't bundled in this build.
    return (
      <Unavailable
        heading="Demo video missing from this build"
        testID="demo-missing-file"
      />
    );
  }

  return (
    <View style={styles.demo}>
      <ExerciseVideoPlayer
        // A new clip (the workout sheet moving on) starts fresh.
        key={media.id}
        source={resolved.video}
        poster={resolved.poster}
        isRemote={resolved.isRemote}
        title={title}
        initiallyMuted={settings.demoStartMuted}
        hasSound={!silentMediaIds.has(media.id)}
        testID="demo-player"
      />
      {demoNotes[media.id] ? (
        <AppText tone="secondary" testID="demo-note">
          {demoNotes[media.id]}
        </AppText>
      ) : null}
      {media.attribution ? (
        <AppText variant="caption" tone="secondary" testID="demo-credit">
          {media.attribution}
        </AppText>
      ) : null}
      {onShowCredits ? (
        <Pressable
          onPress={onShowCredits}
          accessibilityRole="link"
          hitSlop={8}
          style={styles.link}
          testID="demo-credits-link"
        >
          <AppText variant="caption" tone="accent">
            Video sources and licences
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function Unavailable({ heading, testID }: { heading: string; testID: string }) {
  return (
    <View
      style={styles.frame}
      accessible
      accessibilityLabel={`${heading}. Follow the written steps below.`}
      testID={testID}
    >
      <VideoOff color={colors.textSecondary} size={32} strokeWidth={1.75} />
      <AppText variant="bodyStrong">{heading}</AppText>
      <AppText variant="caption" tone="secondary">
        Follow the written steps below.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  demo: {
    gap: spacing.xs,
  },
  link: {
    alignSelf: 'flex-start',
    minHeight: touchTarget,
    justifyContent: 'center',
  },
  frame: {
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
});
