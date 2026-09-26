import { useNavigation } from '@react-navigation/native';
import { Clapperboard, ShieldCheck, Share2, Trash2 } from 'lucide-react-native';
import { Alert, Share, StyleSheet, Switch, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  FilterChip,
  Screen,
  Stepper,
} from '../../components';
import { useRepositories, useSettings } from '../../db/DatabaseProvider';
import { useGuardedAction } from '../../hooks/useGuardedAction';
import { colors, spacing } from '../../theme';
import { formatSeconds, limits } from '../routines/rules';

/** Settings and "your data": units, default rest, demos, export and reset. */
export function ProfileScreen() {
  const navigation = useNavigation();
  const { settings, updateSettings } = useSettings();
  const { history } = useRepositories();
  const { run } = useGuardedAction();

  const exportData = () =>
    run(async () => {
      const data = await history.exportData();
      // Shared as text through the iOS share sheet (Save to Files, Mail…).
      // No temporary file is written, so nothing is left behind.
      await Share.share({
        title: 'Bodios export',
        message: JSON.stringify(data, null, 2),
      });
    }, 'Couldn’t export');

  const confirmReset = () =>
    Alert.alert(
      'Delete all your data?',
      'This deletes every routine, every workout (including one in progress) and your settings from this phone. Export first if you want a copy. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => run(() => history.resetAll(), 'Couldn’t delete'),
        },
      ],
    );

  return (
    <Screen testID="profile-screen">
      <AppText variant="display">Profile</AppText>
      <AppText variant="heading">Settings</AppText>

      <Card>
        <AppText variant="bodyStrong">Units</AppText>
        <View style={styles.row}>
          <FilterChip
            label="Kilograms (kg)"
            selected={settings.preferredUnit === 'kg'}
            onPress={() => run(() => updateSettings({ preferredUnit: 'kg' }))}
          />
          <FilterChip
            label="Pounds (lb)"
            selected={settings.preferredUnit === 'lb'}
            onPress={() => run(() => updateSettings({ preferredUnit: 'lb' }))}
          />
        </View>
        <AppText variant="caption" tone="secondary">
          Weights are saved in kilograms; this only changes how they’re shown
          and typed.
        </AppText>
      </Card>

      <Card>
        <Stepper
          label="Default rest"
          accessibilityName="default rest"
          value={settings.defaultRestSeconds}
          {...limits.restSeconds}
          format={formatSeconds}
          onChange={value =>
            run(() => updateSettings({ defaultRestSeconds: value }))
          }
          testID="default-rest"
        />
        <AppText variant="caption" tone="secondary">
          Used for exercises you add to a routine from now on.
        </AppText>
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <AppText variant="bodyStrong" style={styles.flex}>
            Start demo videos with the sound off
          </AppText>
          <Switch
            value={settings.demoStartMuted}
            onValueChange={value =>
              run(() => updateSettings({ demoStartMuted: value }))
            }
            trackColor={{ true: colors.accent, false: colors.surfaceRaised }}
            thumbColor={colors.text}
            accessibilityLabel="Start demo videos with the sound off"
            testID="demo-muted-switch"
          />
        </View>
      </Card>

      <AppText variant="heading">Your data</AppText>
      <Card>
        <AppText tone="secondary">
          Your routines and workouts are stored only on this phone. They aren’t
          sent anywhere. Deleting the app deletes them.
        </AppText>
        <Button
          title="Export data"
          variant="secondary"
          icon={Share2}
          onPress={exportData}
          testID="export-data"
        />
        <Button
          title="Delete all data"
          variant="ghost"
          icon={Trash2}
          accessibilityHint="Asks for confirmation before deleting"
          onPress={confirmReset}
          testID="reset-data"
        />
        <Button
          title="Privacy policy"
          variant="ghost"
          icon={ShieldCheck}
          onPress={() => navigation.navigate('PrivacyPolicy')}
          testID="privacy-policy"
        />
        <Button
          title="Video credits"
          variant="ghost"
          icon={Clapperboard}
          onPress={() => navigation.navigate('MediaCredits')}
          testID="media-credits"
        />
      </Card>

    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
});
