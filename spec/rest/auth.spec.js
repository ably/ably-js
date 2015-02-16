/* global define, describe, it, beforeAll, afterAll, expect, Ably, __ABLY__ */

"use strict";

define(['ably', 'testapp_helper'], function(Ably, helper) {
  describe('REST Auth', function() {
    describe('Ably.Rest#time', function() {
      it('obtains the server time', function(done) {
        helper.AblyRealtime({ key: 0 }).time(function(err, time) {
          if(err) {
            throw err;
          }
          var timeOffset = time - Date.now();
          expect(Math.abs(timeOffset)).toBeLessThan(5000);
          done();
        });
      }, 5000);
    });
  });
});
