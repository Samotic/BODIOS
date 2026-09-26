import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, Button } from '../components';
import {
  CATALOGUE_VERSION,
  exerciseCatalogue,
} from '../data/exerciseCatalogue';
import { mediaCatalogue } from '../data/mediaCatalogue';
import {
  createExerciseRepository,
  type ExerciseRepository,
} from '../features/exercises/exerciseRepository';
import {
  createHistoryRepository,
  type HistoryRepository,
} from '../features/progress/historyRepository';
import {
  createRoutineRepository,
  type RoutineRepository,
} from '../features/routines/routineRepository';
import {
  createSettingsRepository,
  defaultSettings,
  type Settings,
  type SettingsRepository,
} from '../features/settings/settingsRepository';
import {
  createWorkoutRepository,
  type WorkoutRepository,
} from '../features/workouts/workoutRepository';
import { colors, screenPadding, spacing } from '../theme';
import { syncCatalogue, type Catalogue } from './catalogue';
import { migrate } from './migrations';
import { openDatabase } from './openDatabase';
import type { Database } from './types';

export type Repositories = {
  exercises: ExerciseRepository;
  routines: RoutineRepository;
  workouts: WorkoutRepository;
  history: HistoryRepository;
  settings: SettingsRepository;
};

const RepositoriesContext = createContext<Repositories | null>(null);

type SettingsValue = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsValue>({
  settings: defaultSettings,
  updateSettings: async () => {},
});

/**
 * Goes up by one after every saved change. Screens pass it to useAsyncData
 * as a refresh key, so lists update after edits made on other screens.
 */
const DataVersionContext = createContext(0);

const bundledCatalogue: Catalogue = {
  version: CATALOGUE_VERSION,
  exercises: exerciseCatalogue,
  media: mediaCatalogue,
};

type StartupState =
  | { status: 'loading' }
  | { status: 'ready'; repositories: Repositories; settings: Settings }
  | { status: 'error'; message: string };

type Props = {
  children: ReactNode;
  /** Swappable so tests can use an in-memory database. */
  open?: () => Database;
  catalogue?: Catalogue;
};

/**
 * Opens the database, applies migrations and syncs the exercise catalogue
 * before any screen renders, then hands repositories to the screens.
 */
export function DatabaseProvider({
  children,
  open = openDatabase,
  catalogue = bundledCatalogue,
}: Props) {
  const [state, setState] = useState<StartupState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const onChange = useCallback(() => setDataVersion(v => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    let db: Database | null = null;

    (async () => {
      try {
        db = open();
        await migrate(db);
        await syncCatalogue(db, catalogue);
        const repositories: Repositories = {
          exercises: createExerciseRepository(db),
          routines: createRoutineRepository(db, { onChange }),
          workouts: createWorkoutRepository(db, { onChange }),
          history: createHistoryRepository(db, { onChange }),
          settings: createSettingsRepository(db, { onChange }),
        };
        const settings = await repositories.settings.get();
        if (!cancelled) {
          setState({ status: 'ready', repositories, settings });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      db?.close();
    };
  }, [open, catalogue, attempt, onChange]);

  // Re-read settings after any change (including "reset all data").
  const settingsRepository =
    state.status === 'ready' ? state.repositories.settings : null;
  useEffect(() => {
    if (!settingsRepository || dataVersion === 0) {
      return;
    }
    let current = true;
    settingsRepository.get().then(settings => {
      if (current) {
        setState(s => (s.status === 'ready' ? { ...s, settings } : s));
      }
    });
    return () => {
      current = false;
    };
  }, [settingsRepository, dataVersion]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (settingsRepository) {
        await settingsRepository.update(patch);
      }
    },
    [settingsRepository],
  );

  if (state.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading" />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={[styles.centered, styles.error]}>
        <AppText variant="heading" style={styles.text}>
          Bodios couldn’t open its data
        </AppText>
        <AppText tone="secondary" style={styles.text}>
          Your saved data has not been deleted. Try again, and if this keeps
          happening, update the app.
        </AppText>
        <AppText variant="caption" tone="secondary" style={styles.text}>
          {state.message}
        </AppText>
        <Button
          title="Try again"
          onPress={() => {
            setState({ status: 'loading' });
            setAttempt(n => n + 1);
          }}
        />
      </View>
    );
  }

  return (
    <RepositoriesContext.Provider value={state.repositories}>
      <DataVersionContext.Provider value={dataVersion}>
        <SettingsContext.Provider
          value={{ settings: state.settings, updateSettings }}
        >
          {children}
        </SettingsContext.Provider>
      </DataVersionContext.Provider>
    </RepositoriesContext.Provider>
  );
}

/** The saved settings, and a way to change them. */
export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}

/** Changes after every saved write; use as useAsyncData's refreshKey. */
export function useDataVersion(): number {
  return useContext(DataVersionContext);
}

export function useRepositories(): Repositories {
  const value = useContext(RepositoriesContext);
  if (!value) {
    throw new Error('useRepositories must be used inside <DatabaseProvider>');
  }
  return value;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    paddingHorizontal: screenPadding,
    gap: spacing.md,
  },
  text: {
    textAlign: 'center',
  },
});
