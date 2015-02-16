define(['ably'], function(ably) {
  describe('Static generated ably.js library', function() {
    it('is loaded into the global namespace', function() {
      expect(Ably).not.toBeUndefined();
    });
  });

  describe('Globals in support library', function() {
    it('contains a valid environment', function() {
      expect(__ABLY__.environment).toEqual(window.__env__.ABLY_ENV || 'sandbox');
    });

    it('contains a valid non-TLS port', function() {
      expect(__ABLY__.port).toEqual(window.__env__.ABLY_PORT || 80);
    });

    it('contains a valid TLS port', function() {
      expect(__ABLY__.tlsPort).toEqual(window.__env__.ABLY_TLS_PORT || 443);
    });
  });
});
