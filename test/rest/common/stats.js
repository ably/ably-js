"use strict";

exports.setup = function(base) {
	var rExports = {}, _rExports = {};
	var rest = base.rest;
	var displayError = base.displayError;
	var startTime, intervalStart;
	var timeOffset;

	if (!base.isBrowser)
		var async = require('async');

	rExports.setupstats = function(test) {
		rest = base.rest({
			//log: {level: 4},
			key: base.testVars.testAppId + '.' + base.testVars.testKey0Id + ':' + base.testVars.testKey0.value,
		});
		rest.time(function(err, time) {
			if(err) {
				test.ok(false, displayError(err));
				test.done();
				return;
			}
			var expectedTime = Date.now();
			timeOffset = time - expectedTime;
			test.ok((Math.abs(timeOffset) < 2000), 'Verify returned time matches current local time');
			test.done();
		});
	};

	rExports.statsWaitForNextInterval0 = function(test) {
		var currentTime = new Date(timeOffset + Date.now());
		var nextMinute = new Date(currentTime);
		nextMinute.setMinutes(currentTime.getMinutes() + 1);
		nextMinute.setSeconds(5);
		setTimeout(function(){
			test.done();
		}, nextMinute.getTime() - currentTime.getTime());
	};

	/**
	 * Publish events and check minute-level stats exist (forwards)
	 */
	rExports.appstats_minute0 = function(test) {
		test.expect(1);
		startTime = intervalStart = timeOffset + Date.now();

		/*publish some messages */
		var testchannel = rest.channels.get('appstats_0');
		for(var i = 0; i < 50; i++)
			testchannel.publish("stats" + i, i);

		/* add a delay to allow published messages to reach persistent storage */
		setTimeout(function() {
			/* so now the messages are there; try querying the stats */
			try {
				rest.stats({
					start: startTime,
					direction: 'forwards'
				}, function(err, stats) {
					//console.log(require('util').inspect(stats));
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					try {
						test.expect(2);
						test.ok(stats.length > 0, 'Verify stats records found');
						var totalMessages = 0;
						for(var i = 0; i < stats.length; i++)
							totalMessages += stats[i].inbound.all.messages.count;
						test.equal(totalMessages, 50, 'Verify all published messages found');
						test.done();
					} catch(e) {
						console.log(e);
					}
				});
			} catch(e) {
				console.log(e);
			}
		}, 10000);
	};

	/**
	 * Check hour-level stats exist (forwards)
	 */
	rExports.appstats_hour0 = function(test) {
		test.expect(1);
		try {
			rest.stats({
				start: startTime,
				direction: 'forwards',
				by: 'hour'
			}, function(err, stats) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(2);
				test.ok(stats.length > 0, 'Verify stats records found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 50, 'Verify all published messages found');
				test.done();
			});
		} catch(e) {
			console.log(e);
		}
	};

	/**
	 * Check day-level stats exist (forwards)
	 */
	rExports.appstats_day0 = function(test) {
		test.expect(1);
		try {
			rest.stats({
				start: startTime,
				direction: 'forwards',
				by: 'day'
			}, function(err, stats) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(2);
				test.ok(stats.length > 0, 'Verify stats records found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 50, 'Verify all published messages found');
				test.done();
			});
		} catch(e) {
			console.log(e);
		}
	};

	/**
	 * Check month-level stats exist (forwards)
	 */
	rExports.appstats_month0 = function(test) {
		test.expect(1);
		try {
			rest.stats({
				start: startTime,
				direction: 'forwards',
				by: 'month'
			}, function(err, stats) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(2);
				test.ok(stats.length > 0, 'Verify stats records found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 50, 'Verify all published messages found');
				test.done();
			});
		} catch(e) {
			console.log(e);
		}
	};

	rExports.statsWaitForNextInterval1 = function(test) {
		var currentTime = new Date(timeOffset + Date.now());
		var nextMinute = new Date(currentTime);
		nextMinute.setMinutes(currentTime.getMinutes() + 1);
		nextMinute.setSeconds(5);
		setTimeout(function(){
			test.done();
		}, nextMinute.getTime() - currentTime.getTime());
	};

	/**
	 * Publish events and check minute-level stats exist (backwards)
	 */
	rExports.appstats_minute1 = function(test) {
		test.expect(1);
		intervalStart = timeOffset + Date.now();

		/*publish some messages */
		var testchannel = rest.channels.get('appstats_1');
		for(var i = 0; i < 60; i++)
			testchannel.publish("stats" + i, i);

		/* add a delay to allow published messages to reach persistent storage */
		setTimeout(function() {
			/* so now the messages are there; try querying the stats */
			try {
				rest.stats({
					start: intervalStart,
					direction: 'backwards'
				}, function(err, stats) {
					//console.log(require('util').inspect(stats));
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					test.expect(2);
					test.ok(stats.length > 0, 'Verify stats records found');
					var totalMessages = 0;
					for(var i = 0; i < stats.length; i++)
						totalMessages += stats[i].inbound.all.messages.count;
					test.equal(totalMessages, 60, 'Verify all published messages found');
					test.done();
				});
			} catch(e) {
				console.log(e);
			}
		}, 10000);
	};

	/**
	 * Check hour-level stats exist (backwards)
	 */
	rExports.appstats_hour1 = function(test) {
		test.expect(1);
		try {
			rest.stats({
				start: startTime,
				direction: 'backwards',
				by: 'hour'
			}, function(err, stats) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(2);
				test.ok(stats.length > 0, 'Verify stats records found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 110, 'Verify all published messages found');
				test.done();
			});
		} catch(e) {
			console.log(e);
		}
	};

	/**
	 * Check day-level stats exist (backwards)
	 */
	rExports.appstats_day1 = function(test) {
		test.expect(1);
		try {
			rest.stats({
				start: startTime,
				direction: 'backwards',
				by: 'day'
			}, function(err, stats) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(2);
				test.ok(stats.length > 0, 'Verify stats records found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 110, 'Verify all published messages found');
				test.done();
			});
		} catch(e) {
			console.log(e);
		}
	};

	/**
	 * Check month-level stats exist (backwards)
	 */
	rExports.appstats_month1 = function(test) {
		test.expect(1);
		try {
			rest.stats({
				start: startTime,
				direction: 'backwards',
				by: 'month'
			}, function(err, stats) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(2);
				test.ok(stats.length > 0, 'Verify stats records found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 110, 'Verify all published messages found');
				test.done();
			});
		} catch(e) {
			console.log(e);
		}
	};

	rExports.statsWaitForNextInterval2 = function(test) {
		var currentTime = new Date(timeOffset + Date.now());
		var nextMinute = new Date(currentTime);
		nextMinute.setMinutes(currentTime.getMinutes() + 1);
		nextMinute.setSeconds(5);
		setTimeout(function(){
			test.done();
		}, nextMinute.getTime() - currentTime.getTime());
	};

	/**
	 * Publish events and check limit query param (backwards)
	 */
	rExports.appstats_limit0 = function(test) {
		test.expect(1);

		/*publish some messages */
		var testchannel = rest.channels.get('appstats_2');
		for(var i = 0; i < 70; i++)
			testchannel.publish("stats" + i, i);

		/* add a delay to allow published messages to reach persistent storage */
		setTimeout(function() {
			/* so now the messages are there; try querying the stats */
			try {
				rest.stats({
					start: startTime,
					direction: 'backwards',
					limit: 1
				}, function(err, stats) {
					//console.log(require('util').inspect(stats));
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					test.expect(2);
					test.ok(stats.length == 1, 'Verify exactly one stats record found');
					var totalMessages = 0;
					for(var i = 0; i < stats.length; i++)
						totalMessages += stats[i].inbound.all.messages.count;
					test.equal(totalMessages, 70, 'Verify all published messages found');
					test.done();
				});
			} catch(e) {
				console.log(e);
			}
		}, 10000);
	};

	/**
	 * Check limit query param (forwards)
	 */
	rExports.appstats_limit1 = function(test) {
		test.expect(1);
		try {
			rest.stats({
				start: startTime,
				direction: 'forwards',
				limit: 1
			}, function(err, stats) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(2);
				test.ok(stats.length == 1, 'Verify exactly one stats record found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 50, 'Verify all published messages found');
				test.done();
			});
		} catch(e) {
			console.log(e);
		}
	};

	/**
	 * Check query pagination (backwards)
	 */
	rExports.appstats_pagination0 = function(test) {
		test.expect(1);
		try {
			/* get initial query and page */
			rest.stats({
				start: startTime,
				direction: 'backwards',
				limit: 1
			}, function(err, stats, relLinks) {
				try {
					//console.log(require('util').inspect(stats));
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					test.expect(3);
					test.ok(stats.length == 1, 'Verify exactly one stats record found');
					var totalMessages = 0;
					for(var i = 0; i < stats.length; i++)
						totalMessages += stats[i].inbound.all.messages.count;
					test.equal(totalMessages, 70, 'Verify all published messages found');

					/* get next page */
					test.ok(relLinks && relLinks.next, 'Verify next page rel link present');
					rest.stats(relLinks.next, function(err, stats, relLinks) {
						if(err) {
							test.ok(false, displayError(err));
							test.done();
							return;
						}
						test.expect(6);
						test.ok(stats.length == 1, 'Verify exactly one stats record found');
						var totalMessages = 0;
						for(var i = 0; i < stats.length; i++)
							totalMessages += stats[i].inbound.all.messages.count;
						test.equal(totalMessages, 60, 'Verify all published messages found');

						/* get next page */
						test.ok(relLinks && relLinks.next, 'Verify next page rel link present');
						rest.stats(relLinks.next, function(err, stats, relLinks) {
							if(err) {
								test.ok(false, displayError(err));
								test.done();
								return;
							}
							test.expect(9);
							test.ok(stats.length == 1, 'Verify exactly one stats record found');
							var totalMessages = 0;
							for(var i = 0; i < stats.length; i++)
								totalMessages += stats[i].inbound.all.messages.count;
							test.equal(totalMessages, 50, 'Verify all published messages found');

							/* verify no further pages */
							test.ok(!(relLinks && relLinks.next), 'Verify next page rel link not present');

							/* that's it */
							test.done();
						});
					});
				} catch(e) {
					console.log(e);
				}
			});
		} catch(e) {
			console.log(e);
		}
	};

	/**
	 * Check query pagination (forwards)
	 */
	rExports.appstats_pagination1 = function(test) {
		test.expect(1);
		try {
			/* get initial query and page */
			rest.stats({
				start: startTime,
				direction: 'forwards',
				limit: 1
			}, function(err, stats, relLinks) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(3);
				test.ok(stats.length == 1, 'Verify exactly one stats record found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 50, 'Verify all published messages found');

				/* get next page */
				test.ok(relLinks && relLinks.next, 'Verify next page rel link present');
				rest.stats(relLinks.next, function(err, stats, relLinks) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					test.expect(6);
					test.ok(stats.length == 1, 'Verify exactly one stats record found');
					var totalMessages = 0;
					for(var i = 0; i < stats.length; i++)
						totalMessages += stats[i].inbound.all.messages.count;
					test.equal(totalMessages, 60, 'Verify all published messages found');

					/* get next page */
					test.ok(relLinks && relLinks.next, 'Verify next page rel link present');
					rest.stats(relLinks.next, function(err, stats, relLinks) {
						if(err) {
							test.ok(false, displayError(err));
							test.done();
							return;
						}
						test.expect(9);
						test.ok(stats.length == 1, 'Verify exactly one stats record found');
						var totalMessages = 0;
						for(var i = 0; i < stats.length; i++)
							totalMessages += stats[i].inbound.all.messages.count;
						test.equal(totalMessages, 70, 'Verify all published messages found');

						/* verify no further pages */
						test.ok(!(relLinks && relLinks.next), 'Verify next page rel link not present');

						/* that's it */
						test.done();
					});
				});
			});
		} catch(e) {
			console.log(e);
		}
	};

	/**
	 * Check query pagination rel="first" (backwards)
	 */
	rExports.appstats_pagination2 = function(test) {
		test.expect(1);
		try {
			/* get initial query and page */
			rest.stats({
				start: startTime,
				direction: 'backwards',
				limit: 1
			}, function(err, stats, relLinks) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(3);
				test.ok(stats.length == 1, 'Verify exactly one stats record found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 70, 'Verify all published messages found');

				/* get next page */
				test.ok(relLinks && relLinks.next, 'Verify next page rel link present');
				rest.stats(relLinks.next, function(err, stats, relLinks) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					test.expect(6);
					test.ok(stats.length == 1, 'Verify exactly one stats record found');
					var totalMessages = 0;
					for(var i = 0; i < stats.length; i++)
						totalMessages += stats[i].inbound.all.messages.count;
					test.equal(totalMessages, 60, 'Verify all published messages found');

					/* get next page */
					test.ok(relLinks && relLinks.next, 'Verify next page rel link present');
					rest.stats(relLinks.first, function(err, stats, relLinks) {
						if(err) {
							test.ok(false, displayError(err));
							test.done();
							return;
						}
						test.expect(8);
						test.ok(stats.length == 1, 'Verify exactly one stats record found');
						var totalMessages = 0;
						for(var i = 0; i < stats.length; i++)
							totalMessages += stats[i].inbound.all.messages.count;
						test.equal(totalMessages, 70, 'Verify all published messages found');

						/* that's it */
						test.done();
					});
				});
			});
		} catch(e) {
			console.log(e);
		}
	};

	/**
	 * Check query pagination rel="first" (forwards)
	 */
	rExports.appstats_pagination3 = function(test) {
		test.expect(1);
		try {
			/* get initial query and page */
			rest.stats({
				start: startTime,
				direction: 'forwards',
				limit: 1
			}, function(err, stats, relLinks) {
				//console.log(require('util').inspect(stats));
				if(err) {
					test.ok(false, displayError(err));
					test.done();
					return;
				}
				test.expect(3);
				test.ok(stats.length == 1, 'Verify exactly one stats record found');
				var totalMessages = 0;
				for(var i = 0; i < stats.length; i++)
					totalMessages += stats[i].inbound.all.messages.count;
				test.equal(totalMessages, 50, 'Verify all published messages found');

				/* get next page */
				test.ok(relLinks && relLinks.next, 'Verify next page rel link present');
				rest.stats(relLinks.next, function(err, stats, relLinks) {
					if(err) {
						test.ok(false, displayError(err));
						test.done();
						return;
					}
					test.expect(6);
					test.ok(stats.length == 1, 'Verify exactly one stats record found');
					var totalMessages = 0;
					for(var i = 0; i < stats.length; i++)
						totalMessages += stats[i].inbound.all.messages.count;
					test.equal(totalMessages, 60, 'Verify all published messages found');

					/* get next page */
					test.ok(relLinks && relLinks.next, 'Verify next page rel link present');
					rest.stats(relLinks.first, function(err, stats, relLinks) {
						if(err) {
							test.ok(false, displayError(err));
							test.done();
							return;
						}
						test.expect(8);
						test.ok(stats.length == 1, 'Verify exactly one stats record found');
						var totalMessages = 0;
						for(var i = 0; i < stats.length; i++)
							totalMessages += stats[i].inbound.all.messages.count;
						test.equal(totalMessages, 50, 'Verify all published messages found');

						/* that's it */
						test.done();
					});
				});
			});
		} catch(e) {
			console.log(e);
		}
	};

	return rExports;
};
