"use strict";

/* testapp module is responsible for setting up and tearing down apps in the test environment */
define(['globals', 'browser-base64'], function(ablyGlobals, base64) {
  var restHost = ablyGlobals.restHost || prefixDomainWithEnvironment('rest.ably.io', ablyGlobals.environment),
      tlsPort  = ablyGlobals.tlsPort;

  var isBrowser = (typeof(window) === 'object'),
      httpReq   = httpReqFunction(),
      toBase64  = base64Function();

  var appSpec = {
    namespaces: [
      { id: "persisted", persisted: true }
    ],
    keys : [
      {}, /* key0 is blanket capability */
      {   /* key1 is specific channel and ops */
        capability: JSON.stringify({ testchannel:['publish'] })
      },
      {   /* key2 is wildcard channel spec */
        capability: JSON.stringify({
          '*':['subscribe'],
          'canpublish:*':['publish'],
          'canpublish:andpresence':['presence', 'publish']
        })
      },
      {   /* key3 is wildcard ops spec */
        capability: JSON.stringify({ 'candoall':['*'] })
      },
      {   /* key4 is multiple resources */
        capability: JSON.stringify({
          channel0:['publish'],
          channel1:['publish'],
          channel2:['publish', 'subscribe'],
          channel3:['subscribe'],
          channel4:['presence', 'publish', 'subscribe'],
          channel5:['presence'],
          channel6:['*']
        })

      },
      {   /* key5 has wildcard clientId */
        privileged: true,
        capability: JSON.stringify({
          channel0:['publish'],
          channel1:['publish'],
          channel2:['publish', 'subscribe'],
          channel3:['subscribe'],
          channel4:['presence', 'publish', 'subscribe'],
          channel5:['presence'],
          channel6:['*']
        })
      }
    ]
  };

  function prefixDomainWithEnvironment(domain, environment) {
    if (environment.toLowerCase() === 'production') {
      return domain;
    } else {
      return environment + '-' + domain;
    }
  }

  function createXHR() {
    var result = new XMLHttpRequest();
    if ('withCredentials' in result)
      return result;
    if(typeof XDomainRequest !== "undefined")
      return new XDomainRequest();        /* Use IE-specific "CORS" code with XDR */
    return null;
  }

  function base64Function() {
    if (isBrowser) {
      return base64.encode;
    } else {
      return function (str) { return (new Buffer(str, 'ascii')).toString('base64'); };
    }
  }

  function httpReqFunction() {
    if (isBrowser) {
      return function(options, callback) {
        var uri = options.scheme + '://' + options.host + ':' + options.port + options.path;
        var xhr = createXHR();
        xhr.open(options.method, uri);
        if (options.headers) {
          for (var h in options.headers) if (h !== 'Content-Length') xhr.setRequestHeader(h, options.headers[h]);
        }
        xhr.onerror = function(err) { callback(err); };
        xhr.onreadystatechange = function() {
          if(xhr.readyState == 4) {
            if (xhr.status >= 300) {
              callback('HTTP request failed '+xhr.status);
              return;
            }
            callback(null, xhr.responseText);
          }
        };
        xhr.send(options.body);
      };
    } else {
      var http = require('http'),
          https = require('https');

      return function(options, callback) {
        var body = options.body;
        delete options.body;
        var response = '';
        var request = (options.scheme == 'http' ? http : https).request(options, function (res) {
          res.setEncoding('utf8');
          res.on('data', function (chunk) { response += chunk; });
          res.on('end', function () {
            if (res.statusCode >= 300) {
              callback('Invalid HTTP request: ' + response + '; statusCode = ' + res.statusCode);
            } else {
              callback(null, response);
            }
          });
        });
        request.on('error', function (err) { callback(err); });
        request.end(body);
      };
    }
  }

  function createNewApp(callback) {
    var postData = JSON.stringify(appSpec);
    var postOptions = {
      host: restHost, port: tlsPort, path: '/apps', method: 'POST', scheme: 'https',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Content-Length': postData.length },
      body: postData
    };

    httpReq(postOptions, function(err, res) {
      if (err) {
        callback(err);
      } else {
        if (typeof(res) === 'string') res = JSON.parse(res);
        if (res.keys.length != appSpec.keys.length) {
          callback('Failed to create correct number of keys for app');
        } else if (res.namespaces.length != appSpec.namespaces.length) {
          callback('Failed to create correct number of namespaces for app');
        } else {
          var testApp = {
            accountId: res.accountId,
            appId: res.appId,
          };
          for (var i=0; i<res.keys.length; i++) {
            testApp['key'+i] = res.keys[i];
            testApp['key'+i+'Id'] = res.keys[i].id;
            testApp['key'+i+'Value'] = res.keys[i].value;
            testApp['key'+i+'Str'] = res.appId + '.' + res.keys[i].id + ':' + res.keys[i].value;
          }
          callback(null, testApp);
        }
      }
    });
  }

  function createStatsFixtureData(app, statsData, callback) {
    var postData = JSON.stringify(statsData);

    var authKey = app.appId + '.' + app.key0Id + ':' + app.key0Value,
        authHeader = toBase64(authKey);

    var postOptions = {
      host: restHost, port: tlsPort, path: '/stats', method: 'POST', scheme: 'https',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'Authorization': 'Basic ' + authHeader
      },
      body: postData
    };

    httpReq(postOptions, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }

  function deleteApp(app, callback) {
    var authKey = app.appId + '.' + app.key0Id + ':' + app.key0Value,
        authHeader = toBase64(authKey);

    var delOptions = {
      host: restHost, port: tlsPort, method: 'DELETE', path: '/apps/' + app.appId,
      scheme: 'https', headers: { 'Authorization': 'Basic ' + authHeader }
    };

    httpReq(delOptions, function(err) { callback(err); });
  }

  return module.exports = {
    setup: createNewApp,
    tearDown: deleteApp,
    createStatsFixtureData: createStatsFixtureData,
    httpReq: httpReq
  };
});
