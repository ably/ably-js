"use strict";

define(['ably', 'globals'], function(Ably, ablyGlobals) {
  describe('Test runner tests', function() {
    var globalObject = isBrowser ? window : global,
        noop = function() {};

    describe('RequireJS dependencies', function() {
      describe('static generated ably.js library', function() {
        it('is loaded into the global namespace with the require name "ably"', function() {
          expect(Ably).not.toBeUndefined();
        });
      });
    });

    describe('Globals available to all tests', function() {
      var isBrowser = (typeof(window) == 'object');
      var environment = (isBrowser ? window.__env__ : process.env) || {};

      it('contains a valid environment', function() {
        expect(ablyGlobals.environment).toEqual(environment.ABLY_ENV || 'sandbox');
      });

      it('contains a valid non-TLS port', function() {
        expect(ablyGlobals.port).toEqual(environment.ABLY_PORT || 80);
      });

      it('contains a valid TLS port', function() {
        expect(ablyGlobals.tlsPort).toEqual(environment.ABLY_TLS_PORT || 443);
      });
    });

    describe('uncaught exceptions', function() {
      beforeEach(function() {
        spyOn(console, 'error');
        spyOn(jasmine.getEnv(), 'fail');
        spyOn(jasmine.getEnv(), 'done').and.callFake(noop);
      });

      it('catches them and reports them to the current test and calls done', function(done) {
        setTimeout(function() {
          throw "Uncaught exception";
        }, 100);

        setTimeout(function() {
          expect(console.error).toHaveBeenCalled();
          expect(jasmine.getEnv().fail).toHaveBeenCalled();
          expect(jasmine.getEnv().done).toHaveBeenCalled();
          done();
        }, 200);
      });
    });

    describe('Chai', function() {
      beforeEach(function() {
        spyOn(console, 'error');
        spyOn(jasmine.getEnv(), 'fail');
        spyOn(jasmine.getEnv(), 'done').and.callFake(noop);
      });

      describe('assert()', function() {
        it('provides all the matchers', function(done) {
          assert(true, 'valid assertion');
          expect(jasmine.getEnv().fail).not.toHaveBeenCalled();
          done();
        });

        it('on failure it fails an sync test immediately and calls the global fail method', function(done) {
          expect(function() {
            assert(false, 'invalid assertion');
          }).toThrowError(/invalid assertion/);
          expect(jasmine.getEnv().fail).toHaveBeenCalled();
          expect(jasmine.getEnv().done).toHaveBeenCalled();
          done();
        });

        it('... waits briefly for done blocks to finish', function(done) {
          setTimeout(function() { expect(true).toBeTruthy(); done(); }, 250);
        });
      });

      describe('assert.*()', function() {
        it('provides all the matchers', function(done) {
          assert.ok(true, 'valid assertion');
          expect(jasmine.getEnv().fail).not.toHaveBeenCalled();
          done();
        });

        it('on failure it fails an sync test immediately and calls the global fail method', function(done) {
          expect(function() {
            assert.ok(false, 'invalid assertion');
          }).toThrowError(/invalid assertion/);
          expect(jasmine.getEnv().fail).toHaveBeenCalled();
          expect(jasmine.getEnv().done).toHaveBeenCalled();
          done();
        });

        it('... waits briefly for done blocks to finish', function(done) {
          setTimeout(function() { expect(true).toBeTruthy(); done(); }, 250);
        });
      });
    });

    describe('fail', function() {
      beforeEach(function() {
        spyOn(console, 'error');
        spyOn(jasmine.getEnv(), 'fail');
        spyOn(jasmine.getEnv(), 'done').and.callFake(noop);
      });

      it('logs the error to console.error and calls async done', function(done) {
        fail('error message');
        expect(console.error).toHaveBeenCalled();
        expect(jasmine.getEnv().done).toHaveBeenCalled();
        done();
      });

      it('calls the fail() method in the Jasmine environment and calls async done', function(done) {
        fail('error message');
        expect(jasmine.getEnv().fail).toHaveBeenCalled();
        expect(jasmine.getEnv().done).toHaveBeenCalled();
        done();
      });
    });
  });
});
