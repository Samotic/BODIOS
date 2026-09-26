/**
 * Bodios app entry. The database opens (and migrates) before any screen
 * renders; everything the app saves, including a workout in progress,
 * lives in that database.
 *
 * @format
 */

import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from './src/db/DatabaseProvider';
import { RootNavigator } from './src/navigation/RootNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <DatabaseProvider>
        <RootNavigator />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

export default App;
