define(['shared_helper'], function (helper) {
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

  afterEach(helper.closeActiveClients);
  afterEach(helper.logTestResults);
  afterEach(helper.flushTestLogs);
  beforeEach(helper.clearTransportPreference);
});
