import { ExternalLink } from 'lucide-react-native';
import { Linking } from 'react-native';
import { AppText, Button, Card, Screen } from '../../components';
import { PRIVACY_POLICY_URL } from '../../config/links';
import { privacyPolicy, PRIVACY_POLICY_UPDATED } from './privacyPolicy';

/** The privacy policy, readable offline inside the app. */
export function PrivacyScreen() {
  return (
    <Screen edges={['left', 'right', 'bottom']} testID="privacy-screen">
      <AppText variant="title">Privacy policy</AppText>
      <AppText variant="caption" tone="secondary">
        Last updated {PRIVACY_POLICY_UPDATED}
      </AppText>
      {privacyPolicy.map(section => (
        <Card key={section.heading}>
          <AppText variant="heading">{section.heading}</AppText>
          <AppText tone="secondary">{section.body}</AppText>
        </Card>
      ))}
      {PRIVACY_POLICY_URL ? (
        <Button
          title="Open the online version"
          variant="secondary"
          icon={ExternalLink}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL as string)}
        />
      ) : null}
    </Screen>
  );
}
