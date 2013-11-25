var TestsPath = window.location.pathname + 'test/';

function __populateTests(testDescription) {
  window.testDescription = testDescription;
  for(var test in testDescription) {
    var script = $('<script>');
    script.attr('src', TestsPath + testDescription[test]);
    $('head').append(script);
  }
}
function __setTestvars(testVars) {
  window.testVars = testVars;
}

// ensure console and error messages in older browsers do not cause errors
if (!window.console) window.console = {};
if (!window.console.log) window.console.log = function() { };
if (!window.console.error) window.console.error = function() { };