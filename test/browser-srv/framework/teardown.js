var http = require('http');

exports.deleteAccount = function(testVars, callback) {
	var auth = 'Basic ' + new Buffer(testVars.testAppId + ':' + testVars.testKey0Id + ':' + testVars.testKey0Value).toString('base64');
	var delOptions = {
    host: testVars.realtimeHost,
    port: testVars.realtimePort,
    path: '/apps/' + testVars.testAppId,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    }
  };

  var response = '';
  var request = http.request(delOptions, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      response += chunk;
    });
    res.on('end', function() {
			if (res.statusCode !== 200) {
				console.log("Cannot tear down" + response);
				callback('Invalid HTTP request: ' + response + '; statusCode = ' + res.statusCode);
			} else {
				callback();
			}
    });
  });

  request.on('error', function(err) {
		callback(err);
  });

  request.end();
};
