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
          console.log(err);
          assert(false, 'failed');
        }
        assert.ok(true, 'passed');
        done();
      });
    }, 5000);
  });

  describe('Test suite behaviour', function() {
    it('stops immediately when an exception is raised in an async block', function(done) {
      setTimeout(function() {
        assert(false, 'failed');
      }, 1000);
    }, 5000);
  });
});
