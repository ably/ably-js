define(['shared_helper'], function (Helper) {
  const helper = new Helper();

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

  afterEach(function () {
    helper.closeActiveClients();
  });
  afterEach(function () {
    helper.logTestResults(this);
  });
  afterEach(function () {
    helper.flushTestLogs();
  });
  beforeEach(function () {
    helper.clearTransportPreference();
  });
});
