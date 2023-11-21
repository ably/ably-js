import { test, expect } from '@playwright/test';

test.describe('NPM package', () => {
  test('can be imported and provides access to Ably functionality', async ({ page }) => {
    const pageResultPromise = new Promise<void>((resolve, reject) => {
      page.exposeFunction('onResult', (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    await page.goto('/');
    await pageResultPromise;
  });
});
