define(['shared_helper', 'interception_proxy_client'], function (Helper, interceptionProxyClient) {
  before(async function () {
    await interceptionProxyClient.connect();
  });

  after(function (done) {
    const helper = Helper.forHook(this);
    this.timeout(10 * 1000);
    helper.tearDownApp(function (err) {
      if (err) {
        done(err);
        return;
      }
      done();
    });
    helper.dumpPrivateApiUsage();
  });

  after(async () => {
    await interceptionProxyClient.disconnect();
  });

  // The `START TEST` and `END TEST` logs are to make it easy to see the IDs of interception proxy connections that were started during the test, to correlate with the proxy logs

  afterEach(function () {
    this.currentTest.helper.closeActiveClients();
  });
  afterEach(function () {
    this.currentTest.helper.logTestResults(this);
  });
  afterEach(function () {
    this.currentTest.helper.flushTestLogs();
  });
  afterEach(function () {
    console.log(`END TEST: ${this.currentTest.fullTitle()}`);
  });

  beforeEach(function () {
    console.log(`START TEST: ${this.currentTest.fullTitle()}`);
  });
  beforeEach(function () {
    this.currentTest.helper = Helper.forTest(this);
    this.currentTest.helper.recordTestStart();
  });
  beforeEach(function () {
    this.currentTest.helper.clearTransportPreference();
  });
});
