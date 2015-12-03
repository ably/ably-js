"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var rest, exports = {},
			displayError = helper.displayError,
			startTime, intervalStart, timeOffset;

	var lastYear = new Date().getUTCFullYear() - 1;
	var anHourAgo = new Date().valueOf() - 60 * 60 * 1000;

	// Set last interval to 3rd Feb 20xx 16:03:00, Javascript uses zero based months
	var firstIntervalEpoch = Date.UTC(lastYear, 1, 3, 15, 3, 0);

	var statsFixtures = [
		{
			intervalId: lastYear + '-02-03:15:03',
			inbound:  { realtime: { messages: { count: 50, data: 5000 } } },
			outbound: { realtime: { messages: { count: 20, data: 2000 } } }
		},
		{
			intervalId: lastYear + '-02-03:15:04',
			inbound:  { realtime: { messages: { count: 60, data: 6000 } } },
			outbound: { realtime: { messages: { count: 10, data: 1000 } } }
		},
		{
			intervalId: lastYear + '-02-03:15:05',
			inbound:       { realtime: { messages: { count: 70, data: 7000 } } },
			outbound:      { realtime: { messages: { count: 40, data: 4000 } } },
			persisted:     { presence: { count: 20, data: 2000 } },
			connections:   { tls:      { peak: 20,  opened: 10 } },
			channels:      { peak: 50, opened: 30 },
			apiRequests:   { succeeded: 50, failed: 10 },
			tokenRequests: { succeeded: 60, failed: 20 }
		}
	];

	exports.setup_stats = function(test) {
		test.expect(1);
		// force a new app to be created with first argument true so that stats are not effected by other tests
		helper.setupApp(true, function() {
			rest = helper.AblyRest();
			helper.createStats(helper.getTestApp(), statsFixtures, function(err) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.ok(true, 'Stats fixtures data created');
				test.done();
			});
		});
	};

	/**
	 * Using an interval ID string format, check minute-level inbound and outbound stats match fixture data (forwards)
	 */
	exports.appstats_minute0 = function(test) {
		test.expect(1);
		rest.stats({
			start: lastYear + '-02-03:15:03',
			end: anHourAgo,
			direction: 'forwards'
		}, function(err, page) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			try {
				test.expect(3);
				var stats = page.items;
				test.equal(stats.length, 3, 'Verify 3 stat records found');

				var totalInbound = 0, totalOutbound = 0;
				for(var i = 0; i < stats.length; i++) {
					totalInbound += stats[i].inbound.all.messages.count;
					totalOutbound += stats[i].outbound.all.messages.count;
				}

				test.equal(totalInbound, 50 + 60 + 70, 'Verify all inbound messages found');
				test.equal(totalOutbound, 20 + 10 + 40, 'Verify all outbound messages found');
				test.done();
			} catch(e) {
				console.log(e);
			}
		});
	};

	/**
	 * Using milliseconds since epoch, check minute-level inbound and outbound stats match fixture data (forwards)
	 */
	exports.appstats_minute1 = function(test) {
		test.expect(1);
		rest.stats({
			start: firstIntervalEpoch,
			end: anHourAgo,
			direction: 'forwards'
		}, function(err, page) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			try {
				test.expect(3);
				var stats = page.items;
				test.equal(stats.length, 3, 'Verify 3 stat records found');

				var totalInbound = 0, totalOutbound = 0;
				for(var i = 0; i < stats.length; i++) {
					totalInbound += stats[i].inbound.all.messages.count;
					totalOutbound += stats[i].outbound.all.messages.count;
				}

				test.equal(totalInbound, 50 + 60 + 70, 'Verify all inbound messages found');
				test.equal(totalOutbound, 20 + 10 + 40, 'Verify all outbound messages found');
				test.done();
			} catch(e) {
				console.log(e);
			}
		});
	};

	/**
	 * Check hour-level inbound and outbound stats match fixture data (forwards)
	 */
	exports.appstats_hour0 = function(test) {
		test.expect(1);
		rest.stats({
			start: lastYear + '-02-03:15',
			end: anHourAgo,
			direction: 'forwards',
			by: 'hour'
		}, function(err, page) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			try {
				test.expect(3);
		var stats = page.items;
				test.equal(stats.length, 1, 'Verify 1 stat record found');

				var totalInbound = 0, totalOutbound = 0;
				for(var i = 0; i < stats.length; i++) {
					totalInbound += stats[i].inbound.all.messages.count;
					totalOutbound += stats[i].outbound.all.messages.count;
				}

				test.equal(totalInbound, 50 + 60 + 70, 'Verify all inbound messages found');
				test.equal(totalOutbound, 20 + 10 + 40, 'Verify all outbound messages found');
				test.done();
			} catch(e) {
				console.log(e);
			}
		});
	};

	/**
	 * Check day-level stats exist (forwards)
	 */
	exports.appstats_day0 = function(test) {
		test.expect(1);
		rest.stats({
			end: lastYear + '-02-03',
			direction: 'forwards',
			by: 'day'
		}, function(err, page) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			try {
				test.expect(3);
		var stats = page.items;
				test.ok(stats.length == 1, 'Verify 1 stat records found');

				var totalInbound = 0, totalOutbound = 0;
				for(var i = 0; i < stats.length; i++) {
					totalInbound += stats[i].inbound.all.messages.count;
					totalOutbound += stats[i].outbound.all.messages.count;
				}

				test.equal(totalInbound, 50 + 60 + 70, 'Verify all inbound messages found');
				test.equal(totalOutbound, 20 + 10 + 40, 'Verify all outbound messages found');
				test.done();
			} catch(e) {
				console.log(e);
			}
		});
	};

	/**
	 * Check month-level stats exist (forwards)
	 */
	exports.appstats_month0 = function(test) {
		test.expect(1);
		rest.stats({
			end: lastYear + '-02',
			direction: 'forwards',
			by: 'month'
		}, function(err, page) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			try {
				test.expect(3);
		var stats = page.items;
				test.ok(stats.length == 1, 'Verify 1 stat records found');

				var totalInbound = 0, totalOutbound = 0;
				for(var i = 0; i < stats.length; i++) {
					totalInbound += stats[i].inbound.all.messages.count;
					totalOutbound += stats[i].outbound.all.messages.count;
				}

				test.equal(totalInbound, 50 + 60 + 70, 'Verify all inbound messages found');
				test.equal(totalOutbound, 20 + 10 + 40, 'Verify all outbound messages found');
				test.done();
			} catch(e) {
				console.log(e);
			}
		});
	};

	/**
	 * Check limit query param (backwards)
	 */
	exports.appstats_limit0 = function(test) {
		test.expect(1);
		rest.stats({
			end: lastYear + '-02-03:15:04',
			direction: 'backwards',
			limit: 1
		}, function(err, page) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			try {
				test.expect(3);
		var stats = page.items;
				test.ok(stats.length == 1, 'Verify 1 stat records found');

				var totalInbound = 0, totalOutbound = 0;
				for(var i = 0; i < stats.length; i++) {
					totalInbound += stats[i].inbound.all.messages.count;
					totalOutbound += stats[i].outbound.all.messages.count;
				}

				test.equal(totalInbound, 60, 'Verify all inbound messages found');
				test.equal(totalOutbound, 10, 'Verify all outbound messages found');
				test.done();
			} catch(e) {
				console.log(e);
			}
		});
	};

	/**
	 * Check limit query param (forwards)
	 */
	exports.appstats_limit1 = function(test) {
		test.expect(1);
		rest.stats({
			end: lastYear + '-02-03:15:04',
			direction: 'backwards',
			limit: 1
		}, function(err, page) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			try {
				test.expect(3);
		var stats = page.items;
				test.ok(stats.length == 1, 'Verify 1 stat records found');

				var totalInbound = 0, totalOutbound = 0;
				for(var i = 0; i < stats.length; i++) {
					totalInbound += stats[i].inbound.all.messages.count;
					totalOutbound += stats[i].outbound.all.messages.count;
				}

				test.equal(totalInbound, 60, 'Verify all inbound messages found');
				test.equal(totalOutbound, 10, 'Verify all outbound messages found');
				test.done();
			} catch(e) {
				console.log(e);
			}
		});
	};

	/**
	 * Check query pagination (backwards)
	 */
	exports.appstats_pagination_backwards = function(test) {
		test.expect(1);
		rest.stats({
			end: lastYear + '-02-03:15:05',
			direction: 'backwards',
			limit: 1
		}, function(err, page) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}

			test.expect(3);
			var stats = page.items;
			test.ok(stats.length == 1, 'Verify exactly one stats record found');
			var totalData = 0;
			for(var i = 0; i < stats.length; i++)
				totalData += stats[i].inbound.all.messages.data;
			test.equal(totalData, 7000, 'Verify all published message data found');

			/* get next page */
			test.ok(page.hasNext(), 'Verify next page rel link present');
			page.next(function(err, page) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(6);
		var stats = page.items;
				test.ok(stats.length == 1, 'Verify exactly one stats record found');
				var totalData = 0;
				for(var i = 0; i < stats.length; i++)
					totalData += stats[i].inbound.all.messages.data;
				test.equal(totalData, 6000, 'Verify all published message data found');

				/* get next page */
				test.ok(page.hasNext(), 'Verify next page rel link present');
				page.next(function(err, page) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					test.expect(9);
	      var stats = page.items;
					test.ok(stats.length == 1, 'Verify exactly one stats record found');
					var totalData = 0;
					for(var i = 0; i < stats.length; i++)
						totalData += stats[i].inbound.all.messages.data;
					test.equal(totalData, 5000, 'Verify all published message data found');

					/* verify no further pages */
					test.ok(page.isLast(), 'Verify last page');

					test.expect(10);

					page.first(function(err, page) {
						var totalData = 0;
			var stats = page.items;
						for(var i = 0; i < stats.length; i++)
							totalData += stats[i].inbound.all.messages.data;
						test.equal(totalData, 7000, 'Verify all published message data found');

						/* that's it */
						test.done();
					});
				});
			});
		});
	};

	/**
	 * Check query pagination (backwards)
	 */
	exports.appstats_pagination_forwards = function(test) {
		test.expect(1);
		rest.stats({
			end: lastYear + '-02-03:15:05',
			direction: 'forwards',
			limit: 1
		}, function(err, page) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}

			test.expect(3);
			var stats = page.items;
			test.ok(stats.length == 1, 'Verify exactly one stats record found');
			var totalData = 0;
			for(var i = 0; i < stats.length; i++)
				totalData += stats[i].inbound.all.messages.data;
			test.equal(totalData, 5000, 'Verify all published message data found');

			/* get next page */
			test.ok(page.hasNext(), 'Verify next page rel link present');
			page.next(function(err, page) {
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(6);
		var stats = page.items;
				test.ok(stats.length == 1, 'Verify exactly one stats record found');
				var totalData = 0;
				for(var i = 0; i < stats.length; i++)
					totalData += stats[i].inbound.all.messages.data;
				test.equal(totalData, 6000, 'Verify all published message data found');

				/* get next page */
				test.ok(page.hasNext(), 'Verify next page rel link present');
				page.next(function(err, page) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					test.expect(9);
	      var stats = page.items;
					test.ok(stats.length == 1, 'Verify exactly one stats record found');
					var totalData = 0;
					for(var i = 0; i < stats.length; i++)
						totalData += stats[i].inbound.all.messages.data;
					test.equal(totalData, 7000, 'Verify all published message data found');

					/* verify no further pages */
					test.ok(page.isLast(), 'Verify last page');

					test.expect(10);

					page.first(function(err, page) {
						var totalData = 0;
			var stats = page.items;
						for(var i = 0; i < stats.length; i++)
							totalData += stats[i].inbound.all.messages.data;
						test.equal(totalData, 5000, 'Verify all published message data found');

						/* that's it */
						test.done();
					});
				});
			});
		});
	};

	return module.exports = helper.withTimeout(exports);
});
