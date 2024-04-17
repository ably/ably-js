const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const playwright = require('playwright');
const { randomUUID } = require('crypto');
const playwrightBrowsers = ['chromium', 'firefox', 'webkit'];

async function openPlaywrightBrowser(headless) {
  const browserEnv = process.env.PLAYWRIGHT_BROWSER;

  if (!playwrightBrowsers.includes(browserEnv)) {
    throw new Error(
      `PLAYWRIGHT_BROWSER environment variable must be one of: ${playwrightBrowsers.join(
        ', ',
      )}. Currently: ${browserEnv}`,
    );
  }

  const browserType = playwright[browserEnv];

  const options = {
    headless,
    // bypass localhost so that the proxy doesn’t need to be running in order for us to contact the control API to tell it to be started; TODO there is quite possibly a less convoluted way of starting the proxy in this case, also think in a more holistic manner about the various ways in which we make sure that only certain traffic is intercepted (there are notes dotted around about this)
    proxy: { server: 'localhost:8080', bypass: 'localhost' },
  };

  // (I originally tried using the ignoreHTTPSErrors Playwright option, but that doesn’t seem to work for CORS preflight requests)

  let browser;
  let context;

  if (browserEnv === 'firefox') {
    // TODO clean up when closing
    const profileDirectory = path.join('tmp', 'browser-profiles', `browserEnv-${randomUUID()}`);

    // We create and then discard a browser instance just to create the structure of the profile directory, which I guess certutil needs
    // TODO this probably isn’t necessary; I think we can just create the directory ahead of time and then use certutil to create the DB, like we do for Chromium
    const throwawayBrowser = await browserType.launchPersistentContext(profileDirectory, {
      ...options,
      headless: true,
    });
    await throwawayBrowser.close();

    // Install the mitmproxy root CA cert
    // https://github.com/microsoft/playwright/issues/18115#issuecomment-2067175748
    // https://wiki.mozilla.org/CA/AddRootToFirefox
    // https://sadique.io/blog/2012/06/05/managing-security-certificates-from-the-console-on-windows-mac-os-x-and-linux/#firefox
    // TODO document that on macOS you get certutil from `brew install nss`
    await exec(
      `certutil -A -d ${profileDirectory} -t C -n "Mitmproxy Root Cert" -i ~/.mitmproxy/mitmproxy-ca-cert.pem`,
    );

    browser = null;
    context = await browserType.launchPersistentContext(profileDirectory, options);
  } else {
    // TODO explain what to do for trust
    browser = await browserType.launch(options);
    context = await browser.newContext();
  }

  const page = await context.newPage();

  return { browserType, browser, page };
}

module.exports = { openPlaywrightBrowser };
