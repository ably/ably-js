"use strict";

exports.setup = function(base) {
	var rExports = {}, _rExports = {};
	var rest = base.rest;
	var containsValue = base.containsValue;
	var displayError = base.displayError;
	var currentTime;

	var invalid0 = {
			channel0:['publish_']
		};

	var invalid1 = {
			channel0:['*', 'publish']
		};

	var invalid2 = {
			channel0:[]
		};

	rExports.setupcapability = function(test) {
		test.expect(1);
		rest = base.rest({
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value
		});
		rest.time(function(err, time) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			currentTime = time;
			test.ok(true, 'Obtained time');
			test.done();
		});
	};

	/*
	 * Blanket intersection with specified key
	 */
	rExports.authcapability0 = function(test) {
		test.expect(1);
		var key1Id = base.testVars.testAppId + '.' + base.testVars.testKey1Id;
		var testKeyOpts = {keyId: key1Id, keyValue: base.testVars.testKey1.value};
		var testCapability = JSON.parse(base.testVars.testKey1.capability);
		rest.auth.requestToken(testKeyOpts, null, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.deepEqual(tokenDetails.capability, testCapability, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Equal intersection with specified key
	 */
	rExports.authcapability1 = function(test) {
		test.expect(1);
		var key1Id = base.testVars.testAppId + '.' + base.testVars.testKey1Id;
		var testKeyOpts = {keyId: key1Id, keyValue: base.testVars.testKey1.value};
		var testCapability = JSON.parse(base.testVars.testKey1.capability);
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.deepEqual(tokenDetails.capability, testCapability, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Empty ops intersection
	 */
	rExports.authcapability2 = function(test) {
		test.expect(1);
		var key1Id = base.testVars.testAppId + '.' + base.testVars.testKey1Id;
		var testKeyOpts = {keyId: key1Id, keyValue: base.testVars.testKey1.value};
		var testCapability = {testchannel:['subscribe']};
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 401, 'Verify request rejected with insufficient capability');
				test.done();
				return;
			}
			test.ok(false, 'Invalid capability, expected rejection');
			test.done();
		});
	};

	/*
	 * Empty paths intersection
	 */
	rExports.authcapability3 = function(test) {
		test.expect(1);
		var key4Id = base.testVars.testAppId + '.' + base.testVars.testKey4Id;
		var testKeyOpts = {keyId: key4Id, keyValue: base.testVars.testKey4.value};
		var testCapability = {channelx:['publish']};
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 401, 'Verify request rejected with insufficient capability');
				test.done();
				return;
			}
			test.ok(false, 'Invalid capability, expected rejection');
			test.done();
		});
	};

	/*
	 * Ops intersection non-empty
	 */
	rExports.authcapability4 = function(test) {
		test.expect(1);
		var key4Id = base.testVars.testAppId + '.' + base.testVars.testKey4Id;
		var testKeyOpts = {keyId: key4Id, keyValue: base.testVars.testKey4.value};
		var testCapability = {channel2:['presence', 'subscribe']};
		var expectedIntersection = {channel2:['subscribe']};
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Paths intersection non-empty
	 */
	rExports.authcapability5 = function(test) {
		test.expect(1);
		var key4Id = base.testVars.testAppId + '.' + base.testVars.testKey4Id;
		var testKeyOpts = {keyId: key4Id, keyValue: base.testVars.testKey4.value};
		var testCapability = {
			channel2:['presence', 'subscribe'],
			channelx:['presence', 'subscribe']
		};
		var expectedIntersection = {channel2:['subscribe']};
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Ops wildcard matching
	 */
	rExports.authcapability6 = function(test) {
		test.expect(1);
		var key4Id = base.testVars.testAppId + '.' + base.testVars.testKey4Id;
		var testKeyOpts = {keyId: key4Id, keyValue: base.testVars.testKey4.value};
		var testCapability = {channel2:['*']};
		var expectedIntersection = {channel2:['publish', 'subscribe']};
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
			test.done();
		});
	};
	rExports.authcapability7 = function(test) {
		test.expect(1);
		var key4Id = base.testVars.testAppId + '.' + base.testVars.testKey4Id;
		var testKeyOpts = {keyId: key4Id, keyValue: base.testVars.testKey4.value};
		var testCapability = {channel6:['publish', 'subscribe']};
		var expectedIntersection = {channel6:['publish', 'subscribe']};
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
			test.done();
		});
	};

	/*
	 * Resources wildcard matching
	 */
	rExports.authcapability8 = function(test) {
		test.expect(1);
		var key2Id = base.testVars.testAppId + '.' + base.testVars.testKey2Id;
		var testKeyOpts = {keyId: key2Id, keyValue: base.testVars.testKey2.value};
		var testCapability = {cansubscribe:['subscribe']};
		var expectedIntersection = testCapability;
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
			test.done();
		});
	};
	rExports.authcapability9 = function(test) {
		test.expect(1);
		var key2Id = base.testVars.testAppId + '.' + base.testVars.testKey2Id;
		var testKeyOpts = {keyId: key2Id, keyValue: base.testVars.testKey2.value};
		var testCapability = {'canpublish:check':['publish']};
		var expectedIntersection = testCapability;
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
			test.done();
		});
	};
	rExports.authcapability10 = function(test) {
		test.expect(1);
		var key2Id = base.testVars.testAppId + '.' + base.testVars.testKey2Id;
		var testKeyOpts = {keyId: key2Id, keyValue: base.testVars.testKey2.value};
		var testCapability = {'cansubscribe:*':['subscribe']};
		var expectedIntersection = testCapability;
		rest.auth.requestToken(testKeyOpts, {capability: testCapability}, function(err, tokenDetails) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			test.deepEqual(tokenDetails.capability, expectedIntersection, 'Verify token capability');
			test.done();
		});
	};

	/* Invalid capabilities */
	rExports.invalid0 = function(test) {
		test.expect(1);
		rest.auth.requestToken({capability: invalid0}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 400, 'Verify request rejected with bad capability');
				test.done();
				return;
			}
			test.ok(false, 'Invalid capability, expected rejection');
			test.done();
		});
	};
	rExports.invalid1 = function(test) {
		test.expect(1);
		rest.auth.requestToken({capability: invalid1}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 400, 'Verify request rejected with bad capability');
				test.done();
				return;
			}
			test.ok(false, 'Invalid capability, expected rejection');
			test.done();
		});
	};
	rExports.invalid2 = function(test) {
		test.expect(1);
		rest.auth.requestToken({capability: invalid2}, function(err, tokenDetails) {
			if(err) {
				test.equal(err.statusCode, 400, 'Verify request rejected with bad capability');
				test.done();
				return;
			}
			test.ok(false, 'Invalid capability, expected rejection');
			test.done();
		});
	};

	return rExports;
};
