import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: { title: string; onPress: () => void };
};

/** Honest "nothing here yet" block. Use instead of sample data. */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon color={colors.accent} size={28} strokeWidth={2} />
      </View>
      <AppText variant="heading" style={styles.center}>
        {title}
      </AppText>
      <AppText tone="secondary" style={styles.center}>
        {message}
      </AppText>
      {action ? (
        <View style={styles.action}>
          <Button title={action.title} onPress={action.onPress} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  center: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
