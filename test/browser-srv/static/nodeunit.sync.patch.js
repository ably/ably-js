nodeunit.async_run = nodeunit.run;

nodeunit.run = function(modules, options) {
  var start = new Date().getTime();
  options = options || {};

  function setText(el, txt) {
    if ('innerText' in el) {
      el.innerText = txt;
    }
    else if ('textContent' in el){
      el.textContent = txt;
    }
  }

  function getOrCreate(tag, id) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag);
      el.id = id;
      document.body.appendChild(el);
    }
    return el;
  }

  var header = getOrCreate('h1', 'nodeunit-header');
  var banner = getOrCreate('h2', 'nodeunit-banner');
  var userAgent = getOrCreate('h2', 'nodeunit-userAgent');
  var tests = getOrCreate('ol', 'nodeunit-tests');
  var result = getOrCreate('p', 'nodeunit-testresult');

  setText(userAgent, navigator.userAgent);

  var modulesBeingTested = [],
      allAssertions = [];

  for (var module in modules) {
    if (modules.hasOwnProperty(module)) {
      modulesBeingTested.push(module);
      var moduleRunOptions = {
        testStart: function(name) {
          $(tests).append($("<li>").text(name + " running..."));
        },
        testDone: function (name, assertions) {
          $(tests).find('li').filter(function() {
            return $(this).text().indexOf(name + " running") === 0;
          }).remove();
          var test = document.createElement('li');
          var strong = document.createElement('strong');
          strong.innerHTML = name + ' <b style="color: black;">(' +
            '<b class="fail">' + assertions.failures() + '</b>, ' +
            '<b class="pass">' + assertions.passes() + '</b>, ' +
            assertions.length +
          ')</b>';
          test.className = assertions.failures() ? 'fail': 'pass';
          test.appendChild(strong);

          var aList = document.createElement('ol');
          aList.style.display = 'none';
          test.onclick = function () {
            var d = aList.style.display;
            aList.style.display = (d == 'none') ? 'block': 'none';
          };
          for (var i=0; i<assertions.length; i++) {
            var li = document.createElement('li');
            var a = assertions[i];
            if (a.failed()) {
              li.innerHTML = (a.message || a.method || 'no message') +
                '<pre>' + (a.error.stack || a.error) + '</pre>';
              li.className = 'fail';
            }
            else {
              li.innerHTML = a.message || a.method || 'no message';
              li.className = 'pass';
            }
            aList.appendChild(li);
          }
          test.appendChild(aList);
          tests.appendChild(test);
        },
        moduleDone: function (name, assertions) {
          allAssertions.concat(assertions);
          modulesBeingTested.pop(module);
        }
      };
      nodeunit.runModule(module, modules[module], moduleRunOptions, function() {
        if (modulesBeingTested.length === 0) {
          var end = new Date().getTime(),
              duration = end - start,
              passes = 0,
              failures = 0;

          banner.className = 'pass';
          for (var i = 0; i < allAssertions.length; i++) {
            if (allAssertions[i].failed()) {
              banner.className = 'fail';
              failures++;
            } else {
              passes++;
            }
          }

          result.innerHTML = 'Tests completed in ' + duration +
            ' milliseconds.<br/><span class="passed">' +
            passes + '</span> assertions of ' +
            '<span class="all">' + allAssertions.length + '<span> passed, ' +
            failures + ' failed.';

          if (typeof(options.done) == 'function') options.done(allAssertions);
        }
      });
    }
  }
};