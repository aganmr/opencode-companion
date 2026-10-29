// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Global Jest setup file: not a test file, so the jest env isn't applied.
    files: ['jest-setup.js'],
    languageOptions: {
      globals: { jest: 'readonly' },
    },
  },
]);
