const playwright = require('playwright');
const path = require('path');
const serverProcess = require('child_process').fork(path.resolve(__dirname, '..', 'web_server'), {
  env: { PLAYWRIGHT_TEST: 1 },
});
const fs = require('fs');
const jUnitDirectoryPath = require('./junit_directory_path');

const port = process.env.PORT || 3000;
const host = 'localhost';

const browserEnv = process.env.PLAYWRIGHT_BROWSER;

if (!['chromium', 'firefox', 'webkit'].includes(browserEnv)) {
  throw new Error(
    `PLAYWRIGHT_BROWSER environment variable must be either 'chromium', 'webkit' or 'firefox' (currently ${browserEnv})`
  );
}

const runTests = async (browserType) => {
  const browser = await browserType.launch();
  const page = await browser.newPage();
  await page.goto(`http://${host}:${port}`);

  console.log(`\nrunning tests in ${browserType.name()}`);

  await new Promise((resolve, reject) => {
    // Expose a function inside the playwright browser to log to the NodeJS process stdout
    page.exposeFunction('onTestLog', ({ detail }) => {
      console.log(detail);
    });

    page.on('console', (msg) => {
      console.log(msg.text());
    });

    // Expose a function inside the playwright browser to exit with the right status code when tests pass/fail
    page.exposeFunction('onTestResult', ({ detail, jUnitReport }) => {
      console.log(`${browserType.name()} tests complete: ${detail.passes}/${detail.total} passed`);

      try {
        if (!fs.existsSync(jUnitDirectoryPath)) {
          fs.mkdirSync(jUnitDirectoryPath);
        }
        const filename = `playwright-${browserType.name()}.junit`;
        fs.writeFileSync(path.join(jUnitDirectoryPath, filename), detail.jUnitReport, { encoding: 'utf-8' });
      } catch (err) {
        reject(new Error(`Failed to write JUnit report: ${err.message}`));
      }

      if (detail.pass) {
        browser.close();
        resolve();
      } else {
        reject(new Error(`${browserType.name()} tests failed, exiting with code 1`));
      }
    });

    // Use page.evaluate to add these functions as event listeners to the 'testLog' and 'testResult' Custom Events.
    // These events are fired by the custom mocha reporter in playwrightSetup.js
    page.evaluate(() => {
      window.addEventListener('testLog', ({ type, detail }) => {
        onTestLog({ type, detail });
      });
      window.addEventListener('testResult', ({ type, detail }) => {
        onTestResult({ type, detail });
      });
    });
  });
};

(async () => {
  let caughtError;

  try {
    if (browserEnv) {
      // If the PLAYWRIGHT_BROWSER env var is set, only run tests in the specified browser...
      await runTests(playwright[browserEnv]);
    } else {
      // ...otherwise run all the browsers
      await runTests(playwright.chromium);
      await runTests(playwright.webkit);
      await runTests(playwright.firefox);
    }
  } catch (error) {
    caughtError = error;
  }

  serverProcess.kill();

  if (caughtError) {
    console.log(caughtError.message);
    process.exit(1);
  }
})();
