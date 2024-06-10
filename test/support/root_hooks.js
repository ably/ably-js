define(['shared_helper'], function (Helper) {
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
  });

  afterEach(function () {
    this.helper.closeActiveClients();
  });
  afterEach(function () {
    this.helper.logTestResults(this);
  });
  afterEach(function () {
    this.helper.flushTestLogs();
  });
  beforeEach(function () {
    this.helper = Helper.forTest(this);
  });
  beforeEach(function () {
    this.helper.clearTransportPreference();
  });
});
