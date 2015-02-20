"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  beforeAll(helper.setupApp);
  afterAll(helper.tearDownApp);

  describe('Realtime EventEmitter', function() {
    it('1) swallows exceptions, does not log the error, however it passes an err object that can be passed to fail() for immediate failure', function(done) {
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

    it('2) ensure an assert.function failure in a callback raises an error in the test suite', function(done) {
      var realtime = helper.AblyRealtime({ key: 1 });
      var channel = realtime.channels.get('doesNotHavePermission');

      channel.attach(function(err) {
        assert.ok(false, "Expect this failed assertion to be shown in the test suite");
        done();
      });
    }, 5000);

    it('2) ensure an assert() function failure in a callback raises an error in the test suite', function(done) {
      var realtime = helper.AblyRealtime({ key: 1 });
      var channel = realtime.channels.get('doesNotHavePermission');

      channel.attach(function(err) {
        assert(false, "Expect this failed assertion to be shown in the test suite");
        done();
      });
    }, 5000);

    it('3) ensure an expect failure in a callback raises an error in the test suite', function(done) {
      var realtime = helper.AblyRealtime({ key: 1 });
      var channel = realtime.channels.get('doesNotHavePermission');

      channel.attach(function(err) {
        expect(false).toBe(true);
        done();
      });
    }, 5000);
  });

  describe('Test suite behaviour', function() {
    it('1) shows the stracktrace for an actual exception', function(done) {
      setTimeout(function() {
        try {
          throw new Error("Intentional exception");
        } catch (e) {
          fail(e);
        }
      }, 50);
    }, 5000);

    it('2) reports on uncaught exceptions', function(done) {
      setTimeout(function() {
        throw new Error("Intentional uncaught exception");
      }, 50);
    }, 5000);

    it('3) times out but still catches a failed assert from a 3rd party library', function(done) {
      setTimeout(function() {
        assert(false, "Assert will raise an exception")
      }, 50);
    }, 5000);
  });
});
