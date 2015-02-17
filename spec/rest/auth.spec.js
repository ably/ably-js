/* global define, describe, it, beforeAll, afterAll, expect, Ably, __ABLY__ */

"use strict";

define(['ably', 'testapp_module', 'client_module'], function(Ably, testAppHelper, clientHelper) {
  beforeAll(testAppHelper.setup);
  afterAll(testAppHelper.tearDown);

  describe('REST Auth', function() {
    var currentTime; // set by first test

    describe('Ably.Rest#time', function() {
      it('obtains the server time', function(done) {
        clientHelper.AblyRest({ key: 0 }).time(function(err, time) {
          if(err) { throw err; }
          var timeOffset = time - Date.now();
          expect(Math.abs(timeOffset)).toBeLessThan(5000);
          currentTime = Math.floor(time/1000);
          done();
        });
      }, 5000);
    });

    describe('#requestToken', function() {
      it('generates a valid new token', function(done) {
        clientHelper.AblyRest({ key: 0 }).auth.requestToken(function(err, tokenDetails) {
          if(err) { throw err; }

          expect(tokenDetails.id).toBeDefined();
          expect(tokenDetails.issued_at).toBeGreaterThan(currentTime - 1);
          expect(tokenDetails.expires).toBeGreaterThan(tokenDetails.issued_at);
          expect(tokenDetails.expires).toEqual(60*60 + tokenDetails.issued_at);
          expect(tokenDetails.capability).toEqual({'*':['*']});
          done();
        });
      });
    });
  });
});
