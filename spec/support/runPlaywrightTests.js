const playwright = require('playwright');
const path = require('path');
const serverProcess = require('child_process').fork(path.resolve(__dirname, '..', 'web_server'), {
    env: { PLAYWRIGHT_TEST: 1 }
});

const port = process.env.PORT || 3000;
const host = 'localhost';

const browserEnv = process.env.PLAYWRIGHT_BROWSER;

if (!['chromium', 'firefox', 'webkit'].includes(browserEnv)) {
    throw new Error(`PLAYWRIGHT_BROWSER environment variable must be either 'chromium', 'webkit' or 'firefox' (currently ${browserEnv})`);
}

const runTests = async (browserType) => {
    const browser = await browserType.launch();
    const page = await browser.newPage();
    await page.goto(`http://${host}:${port}`);

    console.log(`\nrunning tests in ${browserType.name()}`);

    await new Promise((resolve) => {
        // Expose a function inside the playwright browser to log to the NodeJS process stdout
        page.exposeFunction('onTestLog', ({ detail }) => {
            console.log(detail);
        });

        // Expose a function inside the playwright browser to exit with the right status code when tests pass/fail
        page.exposeFunction('onTestResult', ({ detail }) => {
            console.log(`${browserType.name()} tests complete: ${detail.passes}/${detail.total} passed`);
            if (detail.pass) {
                browser.close();
                resolve();
            } else {
                console.log(`${browserType.name()} tests failed, exiting with code 1`);
                process.exit(1);
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
    } finally {
        serverProcess.kill();
    }
})();
