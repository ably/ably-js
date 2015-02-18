"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  beforeAll(helper.setupApp);
  afterAll(helper.tearDownApp);

  describe('Realtime EventEmitter', function() {
    it('swallows exceptions, does not log the error, and leaves the suite hanging on failure waiting for a timeout', function(done) {
      var realtime = helper.AblyRealtime({ key: 1 });
      var channel = realtime.channels.get('doesNotHavePermission');

      channel.attach(function(err) {
        if (err) {
          fail(err);
        }
        assert.ok(true, 'passed');
        done();
      });
    }, 5000);
  });

  describe('Test suite behaviour', function() {
    it('shows the stracktrace for an actual exception', function(done) {
      setTimeout(function() {
        try {
          throw new Error("Intentional exception");
        } catch (e) {
          fail(e);
        }
      }, 50);
    }, 5000);

    it('reports on uncaught exceptions', function(done) {
      setTimeout(function() {
        throw new Error("Intentional uncaught exception");
      }, 50);
    }, 5000);

    it('times out but still catches a failed assert from a 3rd party library', function(done) {
      setTimeout(function() {
        assert(false, "Assert will raise an exception")
      }, 50);
    }, 5000);
  });
});
