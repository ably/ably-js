var async = require('async');
var server = require('./lib/server');
var setup = require('./framework/setup');
var teardown = require('./framework/teardown');
var testvars = require('./framework/testvars');
var noop = function() {};
var console2 = require('./lib/quietconsole');

var runModule = function(module, callback) {
	callback = callback || noop;
	var tasks = Object.keys(module).map(function(item) {
		return function(itemCb) {
			console2.log('Running ' + item + ' ...');
			module[item](testvars, itemCb);
		};
	});
	async.series(tasks, callback);
};

exports.start = function(opts) {
	if (opts.pipeJSON) console2.quiet(true);

	if (typeof(opts.testVars) == 'object') {
		for (var key in opts.testVars) {
			testvars[key] = opts.testVars[key];
		}
	}

	runModule(setup, function(err) {
		if(err) {
			console2.error('Unexpected error in server setup: ' + err.stack);
			process.exit(1);
		}
		console2.log('Starting server ...');
		server.start(opts, function(err, srv) {
			if(err) {
				console2.error('Unexpected error in server start: ' + err.stack);
				process.exit(1);
			}
			srv.on('close', function() {
				console2.log('Server exited');
				runModule(teardown, function(err) {
					if(err) {
						console2.error('Unexpected error in server teardown: ' + err.stack);
						process.exit(1);
					}
					process.exit(0);
				});
			});
		});
	});
};
