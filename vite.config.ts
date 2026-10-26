import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Browser tests live in tests/browser and run under Playwright.
    projects: [
      {
        // Pure logic, in Node: the game, the rules, the machine, the data.
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'node',
        },
      },
      {
        // React screens, in a DOM with no browser and no WebGL. See
        // docs/agents/dom-tests.md.
        extends: true,
        test: {
          name: 'dom',
          include: ['tests/dom/**/*.test.tsx'],
          environment: 'happy-dom',
          setupFiles: ['tests/dom/setup.ts'],
        },
      },
    ],
  },
});
