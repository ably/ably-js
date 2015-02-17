"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  beforeAll(helper.setupApp);
  afterAll(helper.tearDownApp);

  describe('Realtime Auth', function() {
    describe('Ably.Realtime#time', function() {
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
