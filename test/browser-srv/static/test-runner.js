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
  setupTests();
});

var runTestInParallel = false;
if (document.location.href.indexOf('sync=true') === -1) {
  $('#parallel-toggle').prop('checked', true);
  runTestInParallel = true;
}
$('#parallel-toggle').on('change', function() {
  if ($(this).is(':checked')) {
    document.location.href = document.location.href.replace(/\?sync=true/,'');
  } else {
    document.location.href = document.location.href + '?sync=true';
  }
});

function setupTests() {
  $('button#manual-start').hide();
  $('#test-setup').show();
  $.post('/test/setup')
    .done(function(testAccount) {
      if (window.console) {
        console.log('Test account set up, details are:');
        console.log(testAccount);
      }
      testVars.testAccount = testAccount;
      for (var needle in testAccount) {
        testVars[needle] = testAccount[needle];
      }
      $('#test-setup').hide();
      runTests();
    })
    .fail(function(e) {
      alert('Error: Could not run setup for tests.\n\n' + JSON.stringify(e));
      $('button#manual-start').show();
      $('#test-setup').hide();
    });
}

function runTests() {
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
    runTestInParallel: runTestInParallel
  };
  nodeunit.run(moduleSet, runOptions);

  // if tests don't complete in TEST_TIMEOUT_SECONDS seconds, send a notice of failure
  var TEST_TIMEOUT_SECONDS = 60;
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