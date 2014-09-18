var https = require('https');

exports.deleteAccount = function (testVars, testAccount, console, callback) {
	var auth = 'Basic ' + new Buffer(testAccount.appId + '.' + testAccount.key0Id + ':' + testAccount.key0Value).toString('base64');
	var delOptions = {
		host: testVars.realtimeHost,
		port: testVars.realtimeTlsPort,
		path: '/apps/' + testAccount.appId,
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': auth
		}
	};

	callback = callback || (function () {
	});

	var response = '';
	var request = https.request(delOptions, function (res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			response += chunk;
		});
		res.on('end', function () {
			if (res.statusCode !== 200) {
				console.log("Cannot tear down" + response);
				callback('Invalid HTTP request: ' + response + '; statusCode = ' + res.statusCode);
			} else {
				console.log(' account ID: ' + testAccount.acctId + ' & app ID:' + testAccount.appId + ' has been torn down');
				callback();
			}
		});
	});

	request.on('error', function (err) {
		callback(err);
	});

	request.end();
};
