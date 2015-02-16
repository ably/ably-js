define(['ably'], function(ably) {
  describe('Static generated ably.js library', function() {
    it('is loaded into the global namespace', function() {
      expect(Ably).not.toBeUndefined();
    });
  });
});
