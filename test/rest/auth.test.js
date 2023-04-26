'use strict';

define(['chai', 'shared_helper', 'async', 'globals'], function (chai, helper, async, globals) {
  var currentTime;
  var rest;
  var expect = chai.expect;
  var utils = helper.Utils;
  var echoServer = 'https://echo.ably.io';

  describe('rest/auth', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function () {
        rest = helper.AblyRestPromise({ queryTime: true });
        rest
          .time()
          .then(function (time) {
            currentTime = time;
            expect(true, 'Obtained time').to.be.ok;
            done();
          })
          .catch(function (err) {
            done(err);
          });
      });
    });

    it('Base token generation case', async function () {
      var tokenDetails = await rest.auth.requestToken();
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
      expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
      expect(tokenDetails.expires).to.equal(60 * 60 * 1000 + tokenDetails.issued, 'Verify default expiry period');
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
    });

    it('Base token generation with options', async function () {
      var tokenDetails = await rest.auth.requestToken(null);
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
      expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
    });

    it('Generate token and init library with it', async function () {
      var tokenDetails = await rest.auth.requestToken();
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      helper.AblyRestPromise({ token: tokenDetails.token });
    });

    it('Token generation with explicit timestamp', async function () {
      var serverTime = await rest.time();
      var tokenDetails = await rest.auth.requestToken({ timestamp: serverTime });
      expect(tokenDetails.token).to.be.ok;
      expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
      expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
    });

    it('Token generation with invalid timestamp', async function () {
      var badTime = utils.now() - 30 * 60 * 1000;
      try {
        var tokenDetails = await rest.auth.requestToken({ timestamp: badTime });
      } catch (err) {
        expect(err.statusCode).to.equal(401, 'Verify token request rejected with bad timestamp');
        return;
      }
      throw new Error('Invalid timestamp, expected rejection');
    });

    it('Token generation with system timestamp', async function () {
      var tokenDetails = await rest.auth.requestToken();
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
      expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
    });

    it('Token generation with duplicate nonce', async function () {
      var serverTime = await rest.time();
      await rest.auth.requestToken({ timestamp: serverTime, nonce: '1234567890123456' });
      try {
        await rest.auth.requestToken({ timestamp: serverTime, nonce: '1234567890123456' });
      } catch (err) {
        expect(err.statusCode).to.equal(401, 'Verify request rejected with duplicated nonce');
        return;
      }
      throw new Error('Invalid nonce, expected rejection');
    });

    it('Token generation with clientId', async function () {
      var testClientId = 'test client id';
      var tokenDetails = await rest.auth.requestToken({ clientId: testClientId });
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
      expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
      expect(tokenDetails.clientId).to.equal(testClientId, 'Verify client id');
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal({ '*': ['*'] }, 'Verify token capability');
    });

    it('Token generation with empty string clientId should error', async function () {
      try {
        var tokenDetails = await rest.auth.requestToken({ clientId: '' });
      } catch (err) {
        expect(err.code).to.equal(40012);
        return;
      }
      throw new Error('Expected token generation to error with empty string clientId');
    });

    it('Token generation with capability that subsets key capability', async function () {
      var testCapability = { onlythischannel: ['subscribe'] };
      var tokenDetails = await rest.auth.requestToken({ capability: testCapability });
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
      expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
    });

    it('Token generation with specified key', async function () {
      var testKeyOpts = { key: helper.getTestApp().keys[1].keyStr };
      var testCapability = JSON.parse(helper.getTestApp().keys[1].capability);
      var tokenDetails = await rest.auth.requestToken(null, testKeyOpts);
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
      expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
      expect(tokenDetails.keyName).to.equal(helper.getTestApp().keys[1].keyName, 'Verify token key');
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
    });

    it('Token generation with explicit auth', async function () {
      var authHeaders = await new Promise((resolve, reject) => {
        rest.auth.getAuthHeaders(function (err, authHeaders) {
          if (err) {
            reject(err);
            return;
          }
          resolve(authHeaders);
        });
      });
      rest.auth.authOptions.requestHeaders = authHeaders;
      var tokenDetails = await rest.auth.requestToken();
      delete rest.auth.authOptions.requestHeaders;
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
      expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
      expect(tokenDetails.keyName).to.equal(helper.getTestApp().keys[0].keyName, 'Verify token key');
    });

    it('Token generation with explicit auth, different key', async function () {
      var authHeaders = await new Promise((resolve, reject) => {
        rest.auth.getAuthHeaders(function (err, authHeaders) {
          if (err) {
            reject(err);
            return;
          }
          resolve(authHeaders);
        });
      });
      var testKeyOpts = { key: helper.getTestApp().keys[1].keyStr };
      var testCapability = JSON.parse(helper.getTestApp().keys[1].capability);
      var tokenDetails = await rest.auth.requestToken(null, testKeyOpts);
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      expect(tokenDetails.issued && tokenDetails.issued >= currentTime, 'Verify token issued').to.be.ok;
      expect(tokenDetails.expires && tokenDetails.expires > tokenDetails.issued, 'Verify token expires').to.be.ok;
      expect(tokenDetails.keyName).to.equal(helper.getTestApp().keys[1].keyName, 'Verify token key');
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
    });

    it('Token generation with invalid mac', async function () {
      try {
        var tokenDetails = await rest.auth.requestToken({ mac: '12345' });
      } catch (err) {
        expect(err.statusCode).to.equal(401, 'Verify request rejected with bad mac');
        return;
      }
      throw new Error('Invalid mac, expected rejection');
    });

    it('Token generation with defaultTokenParams set and no tokenParams passed in', async function () {
      var rest1 = helper.AblyRestPromise({ defaultTokenParams: { ttl: 123, clientId: 'foo' } });
      var tokenDetails = await rest1.auth.requestToken();
      expect(tokenDetails.token, 'Verify token value').to.be.ok;
      expect(tokenDetails.clientId).to.equal('foo', 'Verify client id from defaultTokenParams used');
      expect(tokenDetails.expires - tokenDetails.issued).to.equal(123, 'Verify ttl from defaultTokenParams used');
    });

    it('Token generation: if tokenParams passed in, defaultTokenParams should be ignored altogether, not merged', async function () {
      var rest1 = helper.AblyRestPromise({ defaultTokenParams: { ttl: 123, clientId: 'foo' } });
      var tokenDetails = await rest1.auth.requestToken({ clientId: 'bar' }, null);
      expect(tokenDetails.clientId).to.equal(
        'bar',
        'Verify clientId passed in is used, not the one from defaultTokenParams'
      );
      expect(tokenDetails.expires - tokenDetails.issued).to.equal(
        60 * 60 * 1000,
        'Verify ttl from defaultTokenParams ignored completely, even though not overridden'
      );
    });

    /*
     * authorize with different args
     */
    it('Authorize with different args', async function () {
      var results = await Promise.all([
        rest.auth.authorize(),
        rest.auth.authorize(null),
        rest.auth.authorize(null, null),
      ]);

      results.forEach((tokenDetails) => {
        expect(tokenDetails.token, 'Check token obtained').to.be.ok;
      });
    });

    it('Specify non-default ttl', async function () {
      var tokenDetails = await rest.auth.requestToken({ ttl: 100 * 1000 });
      expect(tokenDetails.expires).to.equal(100 * 1000 + tokenDetails.issued, 'Verify non-default expiry period');
    });

    it('Should error with excessive ttl', async function () {
      try {
        var tokenDetails = await rest.auth.requestToken({ ttl: 365 * 24 * 60 * 60 * 1000 });
      } catch (err) {
        expect(err.statusCode).to.equal(400, 'Verify request rejected with excessive expiry');
        return;
      }
      throw new Error('Excessive expiry, expected rejection');
    });

    it('Should error with negative ttl', async function () {
      try {
        var tokenDetails = await rest.auth.requestToken({ ttl: -1 });
      } catch (err) {
        expect(err.statusCode).to.equal(400, 'Verify request rejected with negative expiry');
        return;
      }
      throw new Error('Negative expiry, expected rejection');
    });

    it('Should error with invalid ttl', async function () {
      try {
        var tokenDetails = await rest.auth.requestToken({ ttl: 'notanumber' });
      } catch (err) {
        expect(err.statusCode).to.equal(400, 'Verify request rejected with invalid expiry');
        return;
      }
      throw new Error('Invalid expiry, expected rejection');
    });

    /*
     * createTokenRequest uses the key it was initialized with if authOptions is null,
     * and the token request includes all the fields it should include, but
     * doesn't include ttl or capability by default
     */
    it('createTokenRequest without authOptions', async function () {
      var tokenRequest = await rest.auth.createTokenRequest(null, null);
      expect('mac' in tokenRequest, 'check tokenRequest contains a mac').to.be.ok;
      expect('nonce' in tokenRequest, 'check tokenRequest contains a nonce').to.be.ok;
      expect('timestamp' in tokenRequest, 'check tokenRequest contains a timestamp').to.be.ok;
      expect(!('ttl' in tokenRequest), 'check tokenRequest does not contains a ttl by default').to.be.ok;
      expect(!('capability' in tokenRequest), 'check tokenRequest does not contains capabilities by default').to.be.ok;
      expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
    });

    it('createTokenRequest uses the key it was initialized with if authOptions does not have a "key" key', async function () {
      var tokenRequest = await rest.auth.createTokenRequest();
      expect(tokenRequest.keyName).to.equal(helper.getTestApp().keys[0].keyName);
    });

    it('createTokenRequest should serialise capability object as JSON', async function () {
      var capability = { '*': ['*'] };
      var tokenRequest = await rest.auth.createTokenRequest({ capability: capability }, null);
      expect(JSON.parse(tokenRequest.capability)).to.deep.equal(
        capability,
        'Verify createTokenRequest has JSON-stringified capability'
      );
    });

    /**
     * Creates a test fixture which checks that the rest client can succesfully make a stats request with the given authParams.
     * @param {string} description Mocha test description
     * @param {object} params The authParams to be tested
     */
    function testJWTAuthParams(description, params) {
      it(description, async function () {
        var currentKey = helper.getTestApp().keys[0];
        var keys = { keyName: currentKey.keyName, keySecret: currentKey.keySecret };
        var authParams = utils.mixin(keys, params);
        var authUrl = echoServer + '/createJWT' + utils.toQueryString(authParams);
        var restJWTRequester = helper.AblyRestPromise({ authUrl: authUrl });

        var tokenDetails = await restJWTRequester.auth.requestToken();
        var restClient = helper.AblyRestPromise({ token: tokenDetails.token });
        await restClient.stats();
      });
    }

    /* RSC1, RSC1a, RSC1c, RSA4f, RSA8c, RSA3d
     * Tests the different combinations of authParams declared above, with valid keys
     */
    testJWTAuthParams('Basic rest JWT', {});
    testJWTAuthParams('Rest JWT with return type ', { returnType: 'jwt' });
    /* The embedded tests rely on the echoserver getting a token from realtime, so won't work against a local realtime */
    if (globals.environment !== 'local') {
      testJWTAuthParams('Rest embedded JWT', { jwtType: 'embedded', environment: globals.environment });
      testJWTAuthParams('Rest embedded JWT with encryption', {
        jwtType: 'embedded',
        environment: globals.environment,
        encrypted: 1,
      });
    }

    it('JWT request with invalid key', async function () {
      var keys = { keyName: 'invalid.invalid', keySecret: 'invalidinvalid' };
      var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
      var restJWTRequester = helper.AblyRestPromise({ authUrl: authUrl });

      var tokenDetails = await restJWTRequester.auth.requestToken();
      var restClient = helper.AblyRestPromise({ token: tokenDetails.token });
      try {
        var stats = await restClient.stats();
      } catch (err) {
        expect(err.code).to.equal(40400, 'Verify token is invalid because app id does not exist');
        expect(err.statusCode).to.equal(404, 'Verify token is invalid because app id does not exist');
        return;
      }
      throw new Error('Expected restClient.stats() to throw token error');
    });

    /*
     * RSA8g
     */
    it('Rest JWT with authCallback', async function () {
      var currentKey = helper.getTestApp().keys[0];
      var keys = { keyName: currentKey.keyName, keySecret: currentKey.keySecret };
      var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
      var restJWTRequester = helper.AblyRestPromise({ authUrl: authUrl });

      var authCallback = function (tokenParams, callback) {
        restJWTRequester.auth.requestToken().then(function (tokenDetails) {
          callback(null, tokenDetails.token);
        });
      };

      var restClient = helper.AblyRestPromise({ authCallback: authCallback });
      var stats = await restClient.stats();
    });

    /*
     * RSA8g
     */
    it('Rest JWT with authCallback and invalid keys', async function () {
      var keys = { keyName: 'invalid.invalid', keySecret: 'invalidinvalid' };
      var authUrl = echoServer + '/createJWT' + utils.toQueryString(keys);
      var restJWTRequester = helper.AblyRestPromise({ authUrl: authUrl });

      var authCallback = function (tokenParams, callback) {
        restJWTRequester.auth.requestToken().then(function (tokenDetails) {
          callback(null, tokenDetails.token);
        });
      };

      var restClient = helper.AblyRestPromise({ authCallback: authCallback });
      try {
        await restClient.stats();
      } catch (err) {
        expect(err.code).to.equal(40400, 'Verify code is 40400');
        expect(err.statusCode).to.equal(404, 'Verify token is invalid because app id does not exist');
        return;
      }
      throw new Error('Expected restClient.stats() to throw token error');
    });

    it('authCallback is only invoked once on concurrent auth', async function () {
      var authCallbackInvocations = 0;
      function authCallback(tokenParams, callback) {
        authCallbackInvocations++;
        rest.auth.createTokenRequest(tokenParams).then(function (tokenRequest) {
          callback(null, tokenRequest);
        });
      }

      /* Example client-side using the token */
      var restClient = helper.AblyRestPromise({ authCallback: authCallback });
      var channel = restClient.channels.get('auth_concurrent');

      await Promise.all([channel.history(), channel.history()]);
      expect(authCallbackInvocations).to.equal(
        1,
        'Check authCallback only invoked once -- was: ' + authCallbackInvocations
      );
    });
  });
});
