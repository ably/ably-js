"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
  beforeAll(helper.setupApp);
  afterAll(helper.tearDownApp);

  describe('REST Auth', function() {
    var currentTime; // set by first test

    describe('Ably.Rest#time', function() {
      it('obtains the server time', function(done) {
        helper.AblyRest({ key: 0 }).time(function(err, time) {
          if(err) { throw err; }
          var timeOffset = time - Date.now();
          expect(Math.abs(timeOffset)).toBeLessThan(5000);
          currentTime = Math.floor(time/1000);
          done();
        });
      }, 5000);
    });

    describe('#requestToken', function() {
      var rest, auth;

      beforeEach(function() {
        rest = helper.AblyRest({ key: 0 });
        auth = rest.auth;
      });

      it('generates a valid new token', function(done) {
        auth.requestToken(function(err, tokenDetails) {
          if (err) { return fail(err); }

          assert.ok((tokenDetails.id), 'Verify token id');
          assert.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
          assert.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
          assert.equal(tokenDetails.expires, 60*60 + tokenDetails.issued_at, 'Verify default expiry period');
          assert.deepEqual(tokenDetails.capability, {'*':['*']}, 'Verify token capability');
          done();
        });
      });

      describe('with options', function() {
        it('generates a valid new token', function(done) {
          auth.requestToken(null, function(err, tokenDetails) {
            if (err) { return fail(err); }

            assert.ok((tokenDetails.id), 'Verify token id');
            assert.ok((tokenDetails.issued_at && tokenDetails.issued_at >= currentTime), 'Verify token issued_at');
            assert.ok((tokenDetails.expires && tokenDetails.expires > tokenDetails.issued_at), 'Verify token expires');
            assert.deepEqual(tokenDetails.capability, {'*':['*']}, 'Verify token capability');
            done();
          });
        });
      });
    });
  });
});
