import { Linking, Pressable, StyleSheet } from 'react-native';
import { AppText, Card, Screen } from '../../components';
import { exerciseCatalogue } from '../../data/exerciseCatalogue';
import { licenceUrls, mediaCredits } from '../../data/mediaCatalogue';
import { spacing, touchTarget } from '../../theme';

const names = new Map(exerciseCatalogue.map(e => [e.id, e.name]));
const byName = (a: string, b: string) => a.localeCompare(b);

/**
 * Where every demonstration clip came from and under which licence, as the
 * Creative Commons licences require (author, source, licence link, changes).
 * Works offline; the links open in Safari.
 */
export function MediaCreditsScreen() {
  const credits = [...mediaCredits].sort((a, b) =>
    byName(names.get(a.exerciseId) ?? '', names.get(b.exerciseId) ?? ''),
  );
  const withVideo = new Set(mediaCredits.map(c => c.exerciseId));
  const withoutVideo = exerciseCatalogue
    .filter(e => !withVideo.has(e.id))
    .map(e => e.name)
    .sort(byName);

  return (
    <Screen edges={['left', 'right', 'bottom']} testID="media-credits-screen">
      <AppText variant="title">Video credits</AppText>
      <AppText tone="secondary">
        The demonstration clips come from wger.de, Wikimedia Commons, Pexels
        and Your Move, under licences that allow their use in apps. For Bodios
        each was trimmed, re-encoded and had its sound removed. The people
        shown don’t endorse Bodios. Clips from wger.de remain under CC BY-SA
        4.0 after these changes.
      </AppText>

      {credits.map(credit => (
        <Card key={credit.exerciseId} testID={`credit-${credit.exerciseId}`}>
          <AppText variant="heading">
            {names.get(credit.exerciseId) ?? credit.exerciseId}
          </AppText>
          <AppText>
            “{credit.title}” by {credit.author}
          </AppText>
          {credit.note ? (
            <AppText variant="caption" tone="secondary">
              {credit.note}
            </AppText>
          ) : null}
          <Link
            label={`Source: ${credit.sourceName}`}
            url={credit.sourceUrl}
          />
          <Link
            label={`Licence: ${credit.licence}`}
            url={licenceUrls[credit.licence]}
          />
        </Card>
      ))}

      {withoutVideo.length > 0 ? (
        <Card>
          <AppText variant="heading">No video yet</AppText>
          <AppText tone="secondary">
            Not available yet: {withoutVideo.join(', ')}. The written steps
            still work.
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

function Link({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityHint="Opens in Safari"
      style={styles.link}
    >
      <AppText tone="accent">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'flex-start',
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
});
