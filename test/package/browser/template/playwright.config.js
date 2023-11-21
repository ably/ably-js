import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test',
  webServer: {
    command: 'npm run test-support:server',
    url: 'http://localhost:4567',
  },
  use: {
    baseURL: 'http://localhost:4567',
  },
});
