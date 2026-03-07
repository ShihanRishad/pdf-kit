import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/e2e/**/*.test.js'],
    globalSetup: './tests/e2e/setup.js',
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
