import { expect, test } from '@playwright/experimental-ct-react';

import { App } from '../src/ReactApp';

test.describe('NPM package', () => {
  for (const scenario of [{ name: 'react export' }]) {
    test.describe(scenario.name, () => {
      test('can be imported and provides access to Ably functionality', async ({ mount, page }) => {
        const pageResultPromise = new Promise<void>((resolve, reject) => {
          page.exposeFunction('onResult', (error: Error | null) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });

        const component = await mount(<App />);
        await pageResultPromise;
        await expect(component).toContainText('Ably NPM package test (react export)');
      });
    });
  }
});
