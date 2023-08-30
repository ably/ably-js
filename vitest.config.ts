import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'src/platform/react-hooks/src',
  plugins: [react() as any],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      ably: path.resolve(__dirname, 'build', 'ably.js'),
    },
  },
});
