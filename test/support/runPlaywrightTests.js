const path = require('path');
const MochaServer = require('../web_server');
const fs = require('fs');
const jUnitDirectoryPath = require('./junit_directory_path');
const { openPlaywrightBrowser } = require('./playwrightHelpers');

const port = process.env.PORT || 3000;
const host = 'localhost';
const mochaServer = new MochaServer(/* playwrightTest: */ true);

const runTests = async () => {
  const { browserType, browser, page } = await openPlaywrightBrowser(true /* headless */);

  await mochaServer.listen();
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
    page.exposeFunction('onTestResult', ({ detail }) => {
      console.log(`${browserType.name()} tests complete: ${detail.passes}/${detail.total} passed`);

      try {
        if (!fs.existsSync(jUnitDirectoryPath)) {
          fs.mkdirSync(jUnitDirectoryPath);
        }
        const filename = `playwright-${browserType.name()}.junit`;
        fs.writeFileSync(path.join(jUnitDirectoryPath, filename), detail.jUnitReport, { encoding: 'utf-8' });
      } catch (err) {
        console.log('Failed to write JUnit report, exiting with code 2: ', err);
        process.exit(2);
      }

      if (detail.pass) {
        context.close();
        if (browser) {
          browser.close();
        }
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
    await runTests();
  } catch (error) {
    // save error for now, we must ensure we end mocha web server first.
    // if we end current process too early, mocha web server will be left running,
    // causing problems when launching tests the second time.
    caughtError = error;
  }

  mochaServer.close();

  // now when mocha web server is terminated, if there was an error, we can log it and exit with a failure code
  if (caughtError) {
    console.log(caughtError.message);
    process.exit(1);
  }
})();
