'use strict';

define(['shared_helper', 'chai'], function (helper, chai) {
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
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }

        rest = helper.AblyRest();
        testApp = helper.getTestApp();
        rest.time(function (err, time) {
          if (err) {
            done(err);
            return;
          }
          currentTime = time;
          done();
        });
      });
    });

    it('Blanket intersection with specified key', function (done) {
      var testKeyOpts = { key: testApp.keys[1].keyStr };
      var testCapability = JSON.parse(testApp.keys[1].capability);
      rest.auth.requestToken(null, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('Equal intersection with specified key', function (done) {
      var testKeyOpts = { key: testApp.keys[1].keyStr };
      var testCapability = JSON.parse(testApp.keys[1].capability);
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('Empty ops intersection', function (done) {
      var testKeyOpts = { key: testApp.keys[1].keyStr };
      var testCapability = { 'canpublish:test': ['subscribe'] };
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          try {
            expect(err.statusCode).to.equal(401, 'Verify request rejected with insufficient capability');
            done();
          } catch (err) {
            done(err);
          }
          return;
        }
        done(new Error('Invalid capability, expected rejection'));
      });
    });

    it('Empty paths intersection', function (done) {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = { channelx: ['publish'] };
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          try {
            expect(err.statusCode).to.equal(401, 'Verify request rejected with insufficient capability');
            done();
          } catch (err) {
            done(err);
          }
          return;
        }
        done('Invalid capability, expected rejection');
      });
    });

    it('Ops intersection non-empty', function (done) {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = { channel2: ['presence', 'subscribe'] };
      var expectedIntersection = { channel2: ['subscribe'] };
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('Paths intersection non-empty', function (done) {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = {
        channel2: ['presence', 'subscribe'],
        channelx: ['presence', 'subscribe'],
      };
      var expectedIntersection = { channel2: ['subscribe'] };
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('Wildcard token with publish and subscribe key', function (done) {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = { channel2: ['*'] };
      var expectedIntersection = { channel2: ['publish', 'subscribe'] };
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('Publish and subscribe token with wildcard key', function (done) {
      var testKeyOpts = { key: testApp.keys[2].keyStr };
      var testCapability = { channel6: ['publish', 'subscribe'] };
      var expectedIntersection = { channel6: ['publish', 'subscribe'] };
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('Resources wildcard matching 1', function (done) {
      var testKeyOpts = { key: testApp.keys[3].keyStr };
      var testCapability = { cansubscribe: ['subscribe'] };
      var expectedIntersection = testCapability;
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('Resources wildcard matching 2', function (done) {
      var testKeyOpts = { key: testApp.keys[1].keyStr };
      var testCapability = { 'canpublish:check': ['publish'] };
      var expectedIntersection = testCapability;
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('Resources wildcard matching 3', function (done) {
      var testKeyOpts = { key: testApp.keys[3].keyStr };
      var testCapability = { 'cansubscribe:*': ['subscribe'] };
      var expectedIntersection = testCapability;
      rest.auth.requestToken({ capability: testCapability }, testKeyOpts, function (err, tokenDetails) {
        if (err) {
          done(err);
          return;
        }
        try {
          expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    /* Invalid capabilities */
    it('Invalid capabilities 1', function (done) {
      rest.auth.requestToken({ capability: invalid0 }, function (err, tokenDetails) {
        if (err) {
          try {
            expect(err.statusCode).to.equal(400, 'Verify request rejected with bad capability');
            done();
          } catch (err) {
            done(err);
          }
          return;
        }
        done(new Error('Invalid capability, expected rejection'));
      });
    });

    it('Invalid capabilities 2', function (done) {
      rest.auth.requestToken({ capability: invalid1 }, function (err, tokenDetails) {
        if (err) {
          try {
            expect(err.statusCode).to.equal(400, 'Verify request rejected with bad capability');
            done();
          } catch (err) {
            done(err);
          }
          return;
        }
        done(new Error('Invalid capability, expected rejection'));
      });
    });

    it('Invalid capabilities 3', function (done) {
      rest.auth.requestToken({ capability: invalid2 }, function (err, tokenDetails) {
        if (err) {
          try {
            expect(err.statusCode).to.equal(400, 'Verify request rejected with bad capability');
            done();
          } catch (err) {
            done(err);
          }
          return;
        }
        done(new Error('Invalid capability, expected rejection'));
      });
    });
  });
});
