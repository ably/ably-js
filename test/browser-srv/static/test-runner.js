var TestsPath = window.location.pathname + 'test/';

function endsWith(string, substr) {
	return string.substr(string.length - substr.length) == substr;
}

var consoleErrors = [];
var oldConsoleErrorFn = window.console.error;
window.console.error = function(err) {
	consoleErrors.push(err);
	return oldConsoleErrorFn.apply(window.console, arguments);
}
window.onerror=function(msg, url, line){
	consoleErrors.push('Error in ' + url + ':' + line + ' - ' + msg);
	return true;
}

// monkey patch runModules so that it supports passing of additional callback options
// as we would like to keep the HTML formatting logic that exists when using nodeunit.run
nodeunit._runModules = nodeunit.runModules;
nodeunit._globalRunModuleOptions = {};
nodeunit.runModules = function(modules, options) {
	var globalOptions = nodeunit._globalRunModuleOptions;
	for (var option in globalOptions) {
		if (globalOptions.hasOwnProperty(option)) {
			if (options[option]) {
				var callback = options[option];
				options[option] = function() {
					callback.apply(this, arguments);
					return globalOptions[option].apply(this, arguments);
				}
			} else {
				options[option] = globalOptions[option];
			}
		}
	}
	return nodeunit._runModules(modules, options);
}

$(function() {
	$('button#manual-start').on('click', function() {
		setupTests();
	});
	setupConfToggles();
	setupTests();
});

var confParams = {
	sync: false,
	noencrypt: false
};

function getConfParams() {
	var search = '';
	for(var prop in confParams) {
		if(confParams[prop]) {
			search += (search ? '&' : '?') + prop + '=' + confParams[prop];
		}
	}
	return search;
};

function setupConfToggles() {
	if (document.location.search.indexOf('sync=true') > -1) {
		$('#sync-parallel-toggle').prop('checked', true);
		confParams.sync = true;
	}
	$('#sync-parallel-toggle').on('change', function () {
		confParams.sync = $(this).is(':checked');
		document.location.search = getConfParams();
	});

	if (document.location.search.indexOf('noencrypt=true') > -1) {
		$('#noencrypt-parallel-toggle').prop('checked', true);
		confParams.noencrypt = true;
	}
	$('#noencrypt-parallel-toggle').on('change', function () {
		confParams.noencrypt = $(this).is(':checked');
		document.location.search = getConfParams();
	});
}

function setupTests() {
	$('button#manual-start').hide();
	$('#test-setup').show();

	$.ajax('/testvars')
		.fail(function(e) {
			alert('Error: Could not get Ably endpoint details.\n\n' + JSON.stringify(e));
			setupFail();
		})
		.done(function(testVars) {
			window.testVars = testVars;
			$.post('/test/setup')
				.fail(function(e) {
					alert('Error: Could not run setup for tests.\n\n' + JSON.stringify(e));
					setupFail();
				})
				.done(function(testAccount) {
					if (window.console) {
						console.log('Test account set up, details are:');
						console.log(testAccount);
					}
					testVars.testAccount = testAccount;
					for (var needle in testAccount) {
						testVars[needle] = testAccount[needle];
					}
					var ablyScript = confParams.noencrypt ? 'ably.noencryption.js' : 'ably.js';
					$.ajax({
						url: ablyScript,
						crossDomain: true,
						dataType: 'script',
						cache: true
					})
						.fail(function (_xhr, _stg, err) {
							alert('Error: Could not load ably library.\n\n' + err);
							setupFail();
						})
						.done(function() {
							$.get('/test/index.json' + getConfParams())
								.fail(function (_xhr, err) {
									alert('Error: Could not get test case index.\n\n' + err);
									setupFail();
								})
								.done(function (testModules) {
									var scripts = [];
									for (var name in testModules)
										scripts.push($.ajax({
											url: TestsPath + testModules[name],
											crossDomain: true,
											dataType: 'script',
											cache: true
										}));
										//scripts.push($.getScript(TestsPath + testModules[name]));
									$.when.apply($, scripts)
										.fail(function (err) {
											alert('Error: Could not get load test modules.\n\n' + err);
											setupFail();
										})
										.done(function () {
											$('#test-setup').hide();
											runTests(testModules);
										});
								});
						});
				});
		});
}

function setupFail() {
	$('button#manual-start').show();
	$('#test-setup').hide();
}

function runTests(testDescription) {
	var moduleSet = {},
		testTimeout;

	$('#nodeunit-header').show();
	$('#nodeunit-header-path').html(TestsPath);
	consoleErrors = [];

	for(var module in testDescription) {
		var moduleId = testDescription[module];
		if(endsWith(moduleId, '.js'))
			moduleId = moduleId.substr(0, moduleId.length-3);
		moduleSet[module] = window[moduleId];
	}
	function getErrorsFromNodeUnitUI() {
		var errors = [];
		$('ol#nodeunit-tests>li.fail').each(function() {
			var method = $(this).find('strong').text().replace(/\s*\([^\)]+\)$/,''),
				methodErrors = $(this).find('ol>li.fail').map(function() { return $(this).text().replace($(this).find('pre').text(),'') });
			errors.push("Method: " + method + "\nError" + (errors.length != 1 ? 's' : '') + ": " + Array.prototype.join.call(methodErrors, ', '));
		})
		return errors;
	}
	var runOptions = {
		done: function(assertions) {
			var errors = getErrorsFromNodeUnitUI();
			clearTimeout(testTimeout);

			var payload = {
				testAccount: JSON.stringify(testVars.testAccount),
				tests: $('ol#nodeunit-tests>li').length,
				failed: errors.length,
				errors: errors,
				consoleErrors: consoleErrors
			};
			console.log(payload);
			$.post('/tests-complete', payload);

			if (errors.length) {
				if (window.console) {
					console.log('There were ' + errors.length + ' error(s) out of ' + payload.tests + ' test(s)\n --------------------------- \n');
					console.log(errors.join('\n --------------------------- \n'));
				}
			} else {
				if (window.console) console.log('All ' + payload.tests + ' test(s) passed');
			}
			var runAgainLink = $('<a href="#">Run the tests again with the same set of keys »</a>')
			$('#nodeunit-banner').html(runAgainLink);
			runAgainLink.on('click', function() {
				runAgainLink.remove();
				$('#nodeunit-testresult').remove();
				$('#nodeunit-banner').removeClass('pass').removeClass('fail');
				$('#nodeunit-tests li').remove();
				runTests();
				return (false);
			})
		},
		runTestInParallel: !confParams.sync
	};
	nodeunit.run(moduleSet, runOptions);

	// if tests don't complete in TEST_TIMEOUT_SECONDS seconds, send a notice of failure
	var TEST_TIMEOUT_SECONDS = 600;
	testTimeout = setTimeout(function() {
		$.post('/tests-complete', {
			testAccount: JSON.stringify(testVars.testAccount),
			tests: $('ol#nodeunit-tests>li').length,
			failed: getErrorsFromNodeUnitUI().length,
			errors: ["Browser-side timeout - Tests did not complete in under " + TEST_TIMEOUT_SECONDS + " seconds so had to abort.  All test are assumed to have failed."],
			consoleErrors: consoleErrors
		});
	}, 1000*TEST_TIMEOUT_SECONDS);
}