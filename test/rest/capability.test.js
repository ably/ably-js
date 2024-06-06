'use strict';

define(['shared_helper', 'chai'], function (Helper, chai) {
  const helper = new Helper();

  var currentTime;
  var rest;
  var testApp;
  var expect = chai.expect;
  var invalid0 = {
    channel0: ['publish_'],
  };
  var invalid1 = {
    channel0: ['*', 'publish'],
  };
  var invalid2 = {
    channel0: [],
  };

  describe('rest/capability', function () {
    this.timeout(60 * 1000);

    before(function (done) {
      helper.setupApp(function () {
        rest = helper.AblyRest({ queryTime: true });
        testApp = helper.getTestApp();
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

    it('Blanket intersection with specified key', async function () {
      var testKeyOpts = { key: testApp.keys[1].keyStr };
      var testCapability = JSON.parse(testApp.keys[1].capability);
      var tokenDetails = await rest.auth.requestToken(null, testKeyOpts);
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
    });

    it('Equal intersection with specified key', async function () {
      var testKeyOpts = { key: testApp.keys[1].keyStr };
      var testCapability = JSON.parse(testApp.keys[1].capability);
      var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
    });

    it('Empty ops intersection', async function () {
      var testKeyOpts = { key: testApp.keys[1].keyStr };
      var testCapability = { 'canpublish:test': ['subscribe'] };
      try {
        var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      } catch (err) {
        expect(err.statusCode).to.equal(401, 'Verify request rejected with insufficient capability');
        return;
      }
      expect.fail('Invalid capability, expected rejection');
    });

    it('Empty paths intersection', async function () {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = { channelx: ['publish'] };
      try {
        var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      } catch (err) {
        expect(err.statusCode).to.equal(401, 'Verify request rejected with insufficient capability');
        return;
      }
      expect.fail('Invalid capability, expected rejection');
    });

    it('Ops intersection non-empty', async function () {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = { channel2: ['presence', 'subscribe'] };
      var expectedIntersection = { channel2: ['subscribe'] };
      var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
    });

    it('Paths intersection non-empty', async function () {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = {
        channel2: ['presence', 'subscribe'],
        channelx: ['presence', 'subscribe'],
      };
      var expectedIntersection = { channel2: ['subscribe'] };
      var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
    });

    it('Wildcard token with publish and subscribe key', async function () {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = { channel2: ['*'] };
      var expectedIntersection = { channel2: ['publish', 'subscribe'] };
      var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
    });

    it('Publish and subscribe token with wildcard key', async function () {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = { channel6: ['publish', 'subscribe'] };
      var expectedIntersection = { channel6: ['publish', 'subscribe'] };
      var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
    });

    it('Resources wildcard matching 1', async function () {
      var testKeyOpts = { key: testApp.keys[3].keyStr };
      var testCapability = { cansubscribe: ['subscribe'] };
      var expectedIntersection = testCapability;
      var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
    });

    it('Resources wildcard matching 2', async function () {
      var testKeyOpts = { key: testApp.keys[1].keyStr };
      var testCapability = { 'canpublish:check': ['publish'] };
      var expectedIntersection = testCapability;
      var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
    });

    it('Resources wildcard matching 3', async function () {
      var testKeyOpts = { key: testApp.keys[3].keyStr };
      var testCapability = { 'cansubscribe:*': ['subscribe'] };
      var expectedIntersection = testCapability;
      var tokenDetails = await rest.auth.requestToken({ capability: testCapability }, testKeyOpts);
      expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
    });

    /* Invalid capabilities */
    it('Invalid capabilities 1', async function () {
      try {
        var tokenDetails = await rest.auth.requestToken({ capability: invalid0 });
      } catch (err) {
        expect(err.statusCode).to.equal(400, 'Verify request rejected with bad capability');
        return;
      }
      expect.fail('Invalid capability, expected rejection');
    });

    it('Invalid capabilities 2', async function () {
      try {
        var tokenDetails = await rest.auth.requestToken({ capability: invalid1 });
      } catch (err) {
        expect(err.statusCode).to.equal(400, 'Verify request rejected with bad capability');
        return;
      }
      expect.fail('Invalid capability, expected rejection');
    });

    it('Invalid capabilities 3', async function () {
      try {
        var tokenDetails = await rest.auth.requestToken({ capability: invalid2 });
      } catch (err) {
        expect(err.statusCode).to.equal(400, 'Verify request rejected with bad capability');
        return;
      }
      expect.fail('Invalid capability, expected rejection');
    });
  });
});
