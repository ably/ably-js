nodeunit.async_run = nodeunit.run;

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

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

  function mergeInto(obj1, obj2){
    for (var attrname in obj2) { obj1[attrname] = obj2[attrname]; }
  }

  var header = getOrCreate('h1', 'nodeunit-header');
  var banner = getOrCreate('h2', 'nodeunit-banner');
  var userAgent = getOrCreate('h2', 'nodeunit-userAgent');
  var tests = getOrCreate('ol', 'nodeunit-tests');
  var result = getOrCreate('p', 'nodeunit-testresult');

  setText(userAgent, navigator.userAgent);

  var modulesBeingTested = [],
      allAssertions = [];

  for (var moduleId in modules) {
    if (modules.hasOwnProperty(moduleId)) {
      var moduleContainer = {
        moduleId: moduleId,
        module: modules[moduleId]
      };
      modulesBeingTested.push(moduleContainer);
      var moduleRunOptions = {};

      moduleContainer.runModule = function() {
        nodeunit.runModule(this.moduleId, this.module, moduleRunOptions, function() {
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
      };

      mergeInto(moduleRunOptions, {
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
          allAssertions = allAssertions.concat(assertions);
          modulesBeingTested.shift();
          if (modulesBeingTested.length && !options.runTestInParallel) {
            modulesBeingTested[0].runModule();
          }
        }
      });

      if (options.runTestInParallel || (modulesBeingTested.length <= 1)) {
        moduleContainer.runModule();
      }
    }
  }
};