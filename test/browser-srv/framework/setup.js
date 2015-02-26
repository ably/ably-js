var https = require('https');

exports.createAccountAppAndKeys = function (testVars, console, callback) {
	var postData = JSON.stringify({
		keys: [{}],
		connections: [{name: 'sole'}],
		channels: [{name: 'test', connection: 'sole', presence: [{clientId: 'testClient'}]}]
	});

	var postOptions = {
		host: testVars.realtimeHost,
		port: testVars.realtimeTlsPort,
		path: '/apps',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': postData.length
		}
	};

	var response = '';
	var request = https.request(postOptions, function (res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			response += chunk;
		});
		res.on('end', function () {
			var completeKey;
			if (res.statusCode >= 300) {
				callback('Invalid HTTP request: ' + response + '; statusCode = ' + res.statusCode);
			} else {
				response = JSON.parse(response);
				completeKey = response.appId + '.' + response.keys[0].id + ':' + response.keys[0].value;
				console.log("Test starting -> Account set up, account ID: `" + response.accountId + "`, app ID: `" + response.appId + "`, key: `" + completeKey + "`");
				callback(null, {
					acctId: response.accountId,
					appId: response.appId,
					key0Id: response.keys[0].id,
					key0Value: response.keys[0].value,
					key0Str: completeKey
				});
			}
		});
	});

	request.on('error', function (err) {
		callback(err);
	});

	request.end(postData);
};
