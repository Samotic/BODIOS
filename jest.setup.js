/* global jest */

// Safe-area insets come from native code; use the library's own test mock.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// OP-SQLite is native. In Jest the app gets a fresh in-memory database backed
// by Node's built-in SQLite instead, running the same migrations and SQL.
jest.mock('./src/db/openDatabase', () => ({
  openDatabase: () =>
    require('./test-utils/nodeSqliteDatabase').openNodeSqliteDatabase(
      ':memory:',
    ),
}));

// react-native-video is a native view. This stand-in renders a plain View
// with the same props, so tests can check what the player asks for (paused,
// muted, rate...) and fire its events (onLoad, onError...).
jest.mock('react-native-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockVideoRef = {
    seek: jest.fn(),
    presentFullscreenPlayer: jest.fn(),
  };
  const Video = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => mockVideoRef);
    return React.createElement(View, props);
  });
  return { __esModule: true, default: Video, mockVideoRef };
});
