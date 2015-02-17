"use strict";

define(['ably'], function(Ably) {
  describe('Static generated ably.js library', function() {
    it('is loaded into the global namespace', function() {
      expect(Ably).not.toBeUndefined();
    });
  });

  describe('Globals in support library', function() {
    var isBrowser = (typeof(window) == 'object');
    var environment = isBrowser ? window.__env__ : process.env;

    it('contains a valid environment', function() {
      expect(__ABLY__.environment).toEqual(environment.ABLY_ENV || 'sandbox');
    });

    it('contains a valid non-TLS port', function() {
      expect(__ABLY__.port).toEqual(environment.ABLY_PORT || 80);
    });

    it('contains a valid TLS port', function() {
      expect(__ABLY__.tlsPort).toEqual(environment.ABLY_TLS_PORT || 443);
    });
  });
});
