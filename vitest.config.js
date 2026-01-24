import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'ui/node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/types/**']
    },
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
