module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  // Keep test files out of the shipped bundle / native folders. `native/`
  // holds local native modules whose spec files match the *.spec.ts pattern.
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '<rootDir>/native/'],
  // The jest-expo preset allows transforming the RN ecosystem; add the
  // Redux packages (react-redux v9 ships an ESM build Jest must compile).
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|react-redux|@reduxjs|redux|redux-persist|reselect|immer))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
