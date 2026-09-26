import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { localDateString } from '../../lib/dates';
import { colors, radii, spacing } from '../../theme';
import { getWeekDays, isSameLocalDay } from './week';

/**
 * The current week with today highlighted. A dot under a date marks a day
 * with at least one finished workout (a shape, not just a colour).
 */
export function WeekStrip({
  today,
  activeDates = new Set<string>(),
}: {
  today: Date;
  /** Local dates ("2026-09-26") with a finished workout. */
  activeDates?: Set<string>;
}) {
  return (
    <View style={styles.row}>
      {getWeekDays(today).map(day => {
        const isToday = isSameLocalDay(day, today);
        const trained = activeDates.has(localDateString(day));
        const fullDate = day.toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        return (
          <View
            key={day.toISOString()}
            style={styles.day}
            accessible
            accessibilityLabel={`${isToday ? `Today, ${fullDate}` : fullDate}${
              trained ? ', workout logged' : ''
            }`}
            accessibilityState={{ selected: isToday }}
          >
            <AppText variant="caption" tone={isToday ? 'accent' : 'secondary'}>
              {day.toLocaleDateString(undefined, { weekday: 'short' })}
            </AppText>
            <View style={[styles.date, isToday && styles.today]}>
              <AppText
                variant="bodyStrong"
                tone={isToday ? 'onAccent' : 'primary'}
                maxFontSizeMultiplier={1.4}
              >
                {day.getDate()}
              </AppText>
            </View>
            <View style={[styles.dot, trained && styles.dotOn]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  date: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  today: {
    backgroundColor: colors.accent,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOn: {
    backgroundColor: colors.accent,
  },
});
