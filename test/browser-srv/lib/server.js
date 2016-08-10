var fs = require('fs');
var http = require('http');
var https = require('https');
var net = require('net');
var path = require('path');
var url = require('url');
var util = require('util');
var ejs = require('ejs');
var testvars = require('../framework/testvars');
var console2 = require('../lib/quietconsole');
var setup = require('../framework/setup');
var teardown = require('../framework/teardown');

var testAccounts = {}; // keep track of all accounts set up that have not yet been torn down

var ably_js = path.resolve(__dirname, '../../..');
var ably_realtime = path.resolve(ably_js, '../..');

var external = {
	'ably.js' : path.resolve(ably_js, 'browser/static/ably.js'),
	'ably.min.js' : path.resolve(ably_js, 'browser/static/ably.min.js'),
	'ably.noencryption.js' : path.resolve(ably_js, 'browser/static/ably.noencryption.js'),
	'ably.noencryption.min.js' : path.resolve(ably_js, 'browser/static/ably.noencryption.min.js'),
	'nodeunit.js' : path.resolve(ably_js, 'node_modules/nodeunit/examples/browser/nodeunit.js'),
	'nodeunit.css' : path.resolve(ably_js, 'node_modules/nodeunit/share/nodeunit.css'),
	'async.js' : path.resolve(ably_js, 'node_modules/async/lib/async.js')
};

var startsWith = function(string, substr) {
	return string.indexOf(substr) == 0;
};

var endsWith = function(string, substr) {
	return string.substr(string.length - substr.length) == substr;
};

var guessContentType = function(string) {
	var contentType = 'text/html';
	if(endsWith(string, '.css'))
		contentType = 'text/css';
	else if(endsWith(string, '.js'))
		contentType = 'application/javascript';
	else if(endsWith(string, '.js.ejs'))
		contentType = 'application/javascript';
	else if(endsWith(string, '.json'))
		contentType = 'application/json';
	return contentType;
};

var mixin = function(target, src) {
	for(var prop in src)
		target[prop] = src[prop];
	return target;
};

var corsOptionsHeaders = function(origin) {
	return {
		'Access-Control-Allow-Methods': 'GET,POST,DELETE',
		'Access-Control-Max-Age': 3600,
		'Access-Control-Expose-Headers' : 'Link',
		'Access-Control-Allow-Origin': (origin || '*'),
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Content-Length,Accept,Authorization'
	};
};

var corsResponseHeaders = function(origin) {
	return {
		'Access-Control-Expose-Headers' : 'Link',
		'Access-Control-Allow-Origin': (origin || '*'),
		'Access-Control-Allow-Credentials': 'true'
	};
};

exports.start = function(opts, callback) {
	if (opts.pipeJSON || opts.onTestResult) console2.quiet(true);

	/* handlers */
	var res500 = function(res, err) {
		res.writeHead(500, corsResponseHeaders());
		res.end(require('util').inspect(err));
	};
	var res404 = function(res) {
		res.writeHead(404, corsResponseHeaders());
		res.end('404 - file missing');
	};
	var res200 = function(res, type, text, params) {
		if(type == 'application/json' && params && params.callback) {
			type = 'application/javascript';
			text = params.callback + '(' + text + ')';
		}
		res.writeHead(200, mixin({'Content-Type': type}, corsResponseHeaders()));
		res.end(text);
	};
	var resOptions = function(res) {
		res.writeHead(204, corsOptionsHeaders());
		res.end();
	};

	/* test server */
	var testSrv;
	if(opts.tls !== undefined && opts.tls !== 'false' && opts.tls !== 0) {
		var httpsOptions = {
			key: fs.readFileSync(ably_realtime + '/frontend/conf/certificates/localhost.ably.io.key'),
			cert: fs.readFileSync(ably_realtime + '/frontend/conf/certificates/server_with_intermediate.crt')
		};
		testSrv = https.createServer(httpsOptions);
	} else {
		testSrv = http.createServer();
	}

	testSrv.on('request', function(request, response) {
		var method = request.method,
			uri = url.parse(request.url, true),
			req = uri.pathname.substr(1) || 'index.html',
			params = uri.query;

		console2.log(method + ' ' + request.url);

		if(method == 'OPTIONS') {
			resOptions(response);
			return;
		}
		if(req == 'exit') {
			res200(response, 'text/plain', 'exiting...');
			process.nextTick(function() {
				testSrv.close();
				if(policySrv)
					policySrv.close();
			});
			return;
		}
		if(req == 'testvars') {
			res200(response, 'application/json', JSON.stringify(testvars), params);
			return;
		}
		for (var externalFileId in external) {
			var filename, match;
			if (externalFileId == req) {
				filename = external[externalFileId];
			} else if ( (externalFileId[0] == '^') && (match = new RegExp(externalFileId).exec(req)) ) {
				filename = external[externalFileId].replace('*', match[1]);
			}
			if (filename) {
				fs.readFile(filename, function(err, file) {
					if(err)
						res500(response, err);
					else
						res200(response, guessContentType(filename), file);
				});
				return;
			}
		}
		if (req == 'test/setup') {
			setup.createAccountAppAndKeys(testvars, console2, function(err, testAccount) {
				if (err) {
					res500(response, err);
				} else {
					testAccount.startedAt = new Date().getTime();
					testAccounts[testAccount.acctId] = testAccount;
					res200(response, 'application/json', JSON.stringify(testAccount), params);
				}
			});
			return;
		}
		if(startsWith(req, 'test/')) {
			/* return test file */
			var filename;
			['test/compat/', 'test/rest/', 'test/realtime/'].forEach(function(dir) {
				if (startsWith(req, dir))
					filename = path.normalize(__dirname + '/../../../' + req);
			});
			if(!filename)
				filename = path.normalize(__dirname + '/../../browser/' + req.substr('test/'.length));

			var readFileCallback = function(err, file) {
				if(err) {
					res500(response, err);
					return;
				}
				if(endsWith(filename, '.ejs')) file = ejs.render(file.toString(), { filename: filename });
				res200(response, guessContentType(filename), file, params);
			};
			if (fs.existsSync(filename) && fs.statSync(filename).isFile()) {
				fs.readFile(filename, readFileCallback);
				return;
			}
			filename = filename + '.ejs';
			if (fs.existsSync(filename) && fs.statSync(filename).isFile()) {
				fs.readFile(filename, readFileCallback);
				return;
			}
			res404(response);
			return;
		}
		if(req == 'tests-complete') {
			var body = '';
			request.on('data', function (data) {
				body += data;
			});
			request.on('end', function () {
				var postData = require('querystring').parse(body),
					testAccount = JSON.parse(postData.testAccount);
				res200(response, 'text/html', 'Test results received');
				if (testAccount) {
					if (testAccounts[testAccount.acctId]) {
						var timePassed = (new Date().getTime() - (testAccount.startedAt || 0) ) / 1000;
						console.log(' test with account ' + testAccount.acctId + ' finished in ' + Math.round(timePassed*10)/10 + 's');
						delete testAccounts[testAccount.acctId];
					}
					teardown.deleteAccount(testvars, testAccount, console2);
				}
				postData.tests = !isNaN(parseInt(postData.tests, 10)) ? Number(postData.tests) : 0;
				postData.failed = !isNaN(parseInt(postData.failed, 10)) ? Number(postData.failed) : 1;
				if (postData.tests === 0) {
					postData.failed++;
					postData.errors = postData.errors || [];
					postData.errors.push('No tests were run, something is wrong');
				}
				if (postData.failed === 0) {
					console2.log("Tests passed (" + postData.tests + ")");
					if (opts.pipeJSON) console.log(postData);
					if (opts.onTestResult) { opts.onTestResult(postData); }
					if (opts.exitAfterTests) process.exit();
				} else {
					console2.warn("Tests failed (" + postData.failed + " out of " + postData.tests + "):");
					console2.warn(postData);
					if (opts.pipeJSON) console.log(postData);
					if (opts.onTestResult) { opts.onTestResult(postData); }
					if (opts.exitAfterTests) process.exit(Number(postData.failed));
				}
			});
			return;
		}
		/* attempt to serve from static */
		var filename = path.resolve(__dirname + '/../static/', req);
		fs.readFile(filename, function(err, file) {
			if(err)
				res404(response);
			else
				res200(response, guessContentType(filename), file);
		});
	});
	testSrv.listen(opts.port, opts.host, function(err) {
		if(err) {
			callback(err, testSrv);
			return;
		}
		console2.log('Web server started with opts: ' + util.inspect(opts));
		callback(null, testSrv);
	});
	testSrv.on('close', function() {
		if(policySrv) {
			policySrv.close();
			console.log('Policy server closed');
		}
	});
};

function cleanUpAccounts() {
	for (var acctId in testAccounts) {
		var testAccount = testAccounts[acctId];
		console2.log('! Test Account ID: ' + testAccount.acctId + ' was not torn down, attempting to tear down now..');
		teardown.deleteAccount(testvars, testAccount, console2);
		delete testAccounts[acctId];
	}
}

process.on('exit', cleanUpAccounts);
process.on('SIGINT', function() {
	cleanUpAccounts();
	process.exit();
});
process.on('uncaughtException', function(err) {
  cleanUpAccounts();
});
