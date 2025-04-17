const { openPlaywrightBrowser } = require('./playwrightHelpers');

(async function run() {
  await openPlaywrightBrowser(false /* headless */);
})();
