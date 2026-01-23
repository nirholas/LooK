import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'ui/**',
        'bin/**'
      ]
    },
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules/**'],
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
