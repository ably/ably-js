define(['shared_helper', 'interception_proxy_client'], function (helper, interceptionProxyClient) {
  before(async function () {
    await interceptionProxyClient.connect();
  });

  after(function (done) {
    this.timeout(10 * 1000);
    helper.tearDownApp(function (err) {
      if (err) {
        done(err);
        return;
      }
      done();
    });
  });

  after(async () => {
    await interceptionProxyClient.disconnect();
  });

  // The `START TEST` and `END TEST` logs are to make it easy to see the IDs of interception proxy connections that were started during the test, to correlate with the proxy logs

  afterEach(helper.closeActiveClients);
  afterEach(helper.logTestResults);
  afterEach(helper.flushTestLogs);
  afterEach(function () {
    console.log(`END TEST: ${this.currentTest.fullTitle()}`);
  });

  beforeEach(function () {
    console.log(`START TEST: ${this.currentTest.fullTitle()}`);
  });
  beforeEach(helper.clearTransportPreference);
});
