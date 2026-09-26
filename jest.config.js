module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Jest would pick lucide's ES-module build (.mjs), which the preset doesn't
  // transform; its CommonJS build is equivalent. Metro is unaffected.
  moduleNameMapper: {
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  // Bundled demo clips become asset numbers, as in the app.
  transform: {
    '\\.mp4$': '<rootDir>/test-utils/videoAssetTransformer.js',
  },
  // These packages ship untranspiled modern JS, so Jest has to transform them.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|lucide-react-native)/)',
  ],
};
