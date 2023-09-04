import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'src/platform/react-hooks/sample-app',
  server: {
    port: 8080,
    strictPort: true,
    host: true,
  },
  plugins: [react() as any],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  optimizeDeps: {
    include: ['ably'],
  },
  resolve: {
    alias: {
      ably: path.resolve(__dirname, 'build', 'ably.js'),
    },
  },
});
