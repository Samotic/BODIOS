import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';
import {
  ChartNoAxesColumn,
  Dumbbell,
  House,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { HomeScreen } from '../features/home/HomeScreen';
import { WorkoutsScreen } from '../features/exercises/WorkoutsScreen';
import { ProgressScreen } from '../features/progress/ProgressScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { colors } from '../theme';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const tabIcons: Record<keyof TabParamList, LucideIcon> = {
  Home: House,
  Workouts: Dumbbell,
  Progress: ChartNoAxesColumn,
  Profile: User,
};

// Defined outside the component so the icon renderers aren't recreated on every render.
const screenOptions = ({
  route,
}: {
  route: RouteProp<TabParamList>;
}): BottomTabNavigationOptions => {
  const Icon = tabIcons[route.name];
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarStyle: styles.tabBar,
    tabBarLabelStyle: styles.tabLabel,
    tabBarIcon: ({ color, size }) => (
      <Icon color={color} size={size} strokeWidth={2} />
    ),
  };
};

export function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Workouts" component={WorkoutsScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
  },
  tabLabel: {
    fontWeight: '600',
  },
});
