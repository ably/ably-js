var http = require('http');

exports.createAccountAppAndKeys = function(testVars, callback) {
	var postData = '{ "keys": [ {} ] }';
	var postOptions = {
    host: 'localhost',
    port: '8080',
    path: '/apps',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };

  var response = '';
  var request = http.request(postOptions, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      response += chunk;
    });
    res.on('end', function() {
			if (res.statusCode !== 200) {
				callback('Invalid HTTP request: ' + response);
			} else {
				response = JSON.parse(response);
				testVars.testAcctId = response.accountId;
				testVars.testAppId = response.id;
				testVars.testKey0Id = response.keys[0].id;
				testVars.testKey0Value = response.keys[0].value;
				callback();
			}
    });
  });

  request.on('error', function(err) {
		callback(err);
  });

  request.end(postData);
};
