'use strict';

// How to execute this test suite
// 1) with rebuilding library (slow)
// npm run-script build
// 2) with already build library (faster, but changes can be not applied as expected)
// npx grunt mocha --test=spec/rest/uniqueLogger.test.js

// Run this test in browser
// 1) npm run-script test:webserver
// 2) open http://localhost:3000/mocha.html?grep=rest%2FuniqueLogger


define(['chai', 'shared_helper', 'async', 'globals'], function (chai, helper, async, globals) {
	var currentTime;
	var rest;
	var expect = chai.expect;
	describe('rest/uniqueLogger', function (){
		this.timeout(60 * 1000);
		var getServerTime = function (callback) {
			rest.time(function (err, time) {
				if (err) {
					callback(err);
				}
				callback(null, time);
			});
		};
		before(function (done) {
			helper.setupApp(function () {
				rest = helper.AblyRest({ queryTime: true });
				getServerTime(function (err, time) {
					if (err) {
						done(err);
						return;
					}
					currentTime = time;
					expect(true, 'Obtained time').to.be.ok;
					done();
				});
			});
		});

		it('constructs new logger 1');
		it('test logger 1 in action');
		it('constructs new logger 2');
		it('test logger 2 in action');
		it('proofs logger 1 and logger 2 are different entities');

		var rest1loggerId;
		var rest2loggerId;
		it('starts 1st client with unique, independent logger', function (done) {
			var logs = [];
			var rest1 = helper.AblyRest({
				defaultTokenParams: { ttl: 123, clientId: 'foo' },
			});
			rest1.setLog({
				level: 3, // minor
				handler: function (params) {
					console.log('Console for ably logger rest1 says:', params);
					logs.push({
						clientId: 'foo',
						logName: 'rest1',
						timestamp: new Date(),
						params: params,
					});
				}
			});
			rest1loggerId = rest1.logger.id;
			rest1.auth.requestToken(function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					// console.log(logs);
					/*

					[
						{
							clientId: 'foo',
							logName: 'rest1',
							timestamp: 2021-10-18T12:38:52.996Z,
							params: 'Ably: Auth.requestToken(): using token auth with client-side signing'
						},
						{
							clientId: 'foo',
							logName: 'rest1',
							timestamp: 2021-10-18T12:38:52.996Z,
							params: 'Ably: Auth.getTokenRequest(): generated signed request'
						},
						{
							clientId: 'foo',
							logName: 'rest1',
							timestamp: 2021-10-18T12:38:53.081Z,
							params: 'Ably: Auth.getToken(): token received'
						}
					]

					 */
					// ensure custom logger produced proper result
					expect(logs.length, 'No logs emitted').to.be.gte(0);
					expect(logs.length, 'wrong logs emitted').to.equal(3);
					logs.map(function logEntryChecker(entry){
						expect(entry.clientId, 'wrong client id').to.be.equal('foo');
						expect(entry.logName, 'wrong client id').to.be.equal('rest1');
						expect(entry.params.indexOf('Ably: Auth.'), 'wrong params').to.equal(0);
					});
					// ensure token generated properly
					expect(tokenDetails.token, 'Verify token value').to.be.ok;
					expect(tokenDetails.clientId).to.equal('foo', 'Verify client id from defaultTokenParams used');
					expect(tokenDetails.expires - tokenDetails.issued).to.equal(123, 'Verify ttl from defaultTokenParams used');
					done();
				} catch (err) {
					done(err);
				}
			});
		});
		it('it starts 2nd client with unique, independent logger', function (done) {
			var logs = [];
			var rest2 = helper.AblyRest({
				defaultTokenParams: { ttl: 123, clientId: 'foo' },
			});
			rest2.setLog({
				level: 3, // minor
				handler: function (params) {
					console.log('Console for Ably logger rest2 says', params);
					logs.push({
						logName: 'rest2',
						timestamp: new Date(),
						params: params,
					});
				}
			});
			rest2loggerId = rest2.logger.id;
			rest2.auth.requestToken({ clientId: 'bar' }, null, function (err, tokenDetails) {
				if (err) {
					done(err);
					return;
				}
				try {
					/*
					[
						{
							logName: 'rest2',
							timestamp: 2021-10-18T12:38:53.087Z,
							params: 'Ably: Auth.requestToken(): using token auth with client-side signing'
						},
						{
							logName: 'rest2',
							timestamp: 2021-10-18T12:38:53.088Z,
							params: 'Ably: Auth.getTokenRequest(): generated signed request'
						},
						{
							logName: 'rest2',
							timestamp: 2021-10-18T12:38:53.149Z,
							params: 'Ably: Auth.getToken(): token received'
						}
					]
					 */

					// ensure logs are correct
					expect(logs.length, 'No logs emitted').to.be.gte(0);
					expect(logs.length, 'Wrong number of logs is emitted').to.equal(3);
					logs.map(function logEntryChecker(entry){
						expect(entry.logName, 'wrong client id').to.be.equal('rest2');
						expect(entry.params.indexOf('Ably: Auth.'), 'wrong params').to.equal(0);
					});
					// ensure token details are correct
					expect(tokenDetails.clientId).to.equal(
						'bar',
						'Verify clientId passed in is used, not the one from defaultTokenParams'
					);
					expect(tokenDetails.expires - tokenDetails.issued).to.equal(
						60 * 60 * 1000,
						'Verify ttl from defaultTokenParams ignored completely, even though not overridden'
					);
					done();
				} catch (err) {
					done(err);
				}
			});
		});
		it('ensure that loggers are unique', function (done) {
			try {
				expect(rest1loggerId !== rest2loggerId, 'loggers are not unique').to.be.ok;
				done();
			} catch (err) {
				done(err);
			}
		});
	});
});
