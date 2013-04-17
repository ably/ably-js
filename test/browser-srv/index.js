var async = require('async');
var server = require('./lib/server');
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

	server.start(opts, function(err, srv) {
		if(err) {
			console2.error('Unexpected error in server start: ' + err);
			process.exit(1);
		}
	});
};
