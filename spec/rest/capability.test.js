"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	helper.describeWithCounter('rest/capability', function (expect, counter) {
		var currentTime, rest, testApp, exports = {};

		var invalid0 = {
				channel0:['publish_']
			};

		var invalid1 = {
				channel0:['*', 'publish']
			};

		var invalid2 = {
				channel0:[]
			};

		it('setupcapability', function(done) {
			counter.expect(1);
			helper.setupApp(function(err) {
				if(err) {
					expect(false, helper.displayError(err));
					done();
					return;
				}

				rest = helper.AblyRest();
				testApp = helper.getTestApp();
				rest.time(function(err, time) {
					if(err) {
						expect(false, displayError(err));
						done();
						return;
					}
					currentTime = time;
					expect(true, 'Obtained time');
					counter.assert();
					done();
				});
			});
		});

		/*
		* Blanket intersection with specified key
		*/
		it('authcapability0', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[1].keyStr};
			var testCapability = JSON.parse(testApp.keys[1].capability);
			rest.auth.requestToken(null, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Equal intersection with specified key
		*/
		it('authcapability1', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[1].keyStr};
		var testCapability = JSON.parse(testApp.keys[1].capability);
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(testCapability, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Empty ops intersection
		*/
		it('authcapability2', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[1].keyStr};
			var testCapability = {"canpublish:test":['subscribe']};
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(401, 'Verify request rejected with insufficient capability');
					counter.assert();
					done();
					return;
				}
				expect(false, 'Invalid capability, expected rejection');
				done();
			});
		});

		/*
		* Empty paths intersection
		*/
		it('authcapability3', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[2].keyStr};
			var testCapability = {channelx:['publish']};
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(401, 'Verify request rejected with insufficient capability');
					counter.assert();
					done();
					return;
				}
				expect(false, 'Invalid capability, expected rejection');
				done();
			});
		});

		/*
		* Ops intersection non-empty
		*/
		it('authcapability4', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[2].keyStr};
			var testCapability = {channel2:['presence', 'subscribe']};
			var expectedIntersection = {channel2:['subscribe']};
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Paths intersection non-empty
		*/
		it('authcapability5', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[2].keyStr};
			var testCapability = {
				channel2:['presence', 'subscribe'],
				channelx:['presence', 'subscribe']
			};
			var expectedIntersection = {channel2:['subscribe']};
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
				done();
			});
		});

		/*
		* Ops wildcard matching
		*/
		it('authcapability6', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[2].keyStr};
			var testCapability = {channel2:['*']};
			var expectedIntersection = {channel2:['publish', 'subscribe']};
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		it('authcapability7', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[2].keyStr};
			var testCapability = {channel6:['publish', 'subscribe']};
			var expectedIntersection = {channel6:['publish', 'subscribe']};
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/*
		* Resources wildcard matching
		*/
		it('authcapability8', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[3].keyStr};
			var testCapability = {cansubscribe:['subscribe']};
			var expectedIntersection = testCapability;
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		it('authcapability9', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[1].keyStr};
			var testCapability = {'canpublish:check':['publish']};
			var expectedIntersection = testCapability;
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		it('authcapability10', function(done) {
			counter.expect(1);
		var testKeyOpts = {key: testApp.keys[3].keyStr};
			var testCapability = {'cansubscribe:*':['subscribe']};
			var expectedIntersection = testCapability;
			rest.auth.requestToken({capability: testCapability}, testKeyOpts, function(err, tokenDetails) {
				if(err) {
					expect(false, displayError(err));
					done();
					return;
				}
				expect(JSON.parse(tokenDetails.capability)).to.deep.equal(expectedIntersection, 'Verify token capability');
				counter.assert();
				done();
			});
		});

		/* Invalid capabilities */
		it('invalid0', function(done) {
			counter.expect(1);
			rest.auth.requestToken({capability: invalid0}, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(400, 'Verify request rejected with bad capability');
					counter.assert();
					done();
					return;
				}
				expect(false, 'Invalid capability, expected rejection');
				done();
			});
		});

		it('invalid1', function(done) {
			counter.expect(1);
			rest.auth.requestToken({capability: invalid1}, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(400, 'Verify request rejected with bad capability');
					counter.assert();
					done();
					return;
				}
				expect(false, 'Invalid capability, expected rejection');
				done();
			});
		});

		it('invalid2', function(done) {
			counter.expect(1);
			rest.auth.requestToken({capability: invalid2}, function(err, tokenDetails) {
				if(err) {
					expect(err.statusCode).to.equal(400, 'Verify request rejected with bad capability');
					counter.assert();
					done();
					return;
				}
				expect(false, 'Invalid capability, expected rejection');
				done();
			});
		});
	});
});
