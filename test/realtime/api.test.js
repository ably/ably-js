'use strict';

define(['ably', 'chai'], function (Ably, chai) {
  var expect = chai.expect;

  describe('realtime/api', function () {
    it('Client constructors', function () {
      expect(typeof Ably.Realtime).to.equal('function');
      expect(typeof Ably.Realtime.Promise).to.equal('function');
      expect(typeof Ably.Realtime.Callbacks).to.equal('function');
      expect(Ably.Realtime.Callbacks).to.equal(Ably.Realtime);
    });

    it('Crypto', function () {
      expect(typeof Ably.Realtime.Crypto).to.equal('function');
      expect(typeof Ably.Realtime.Crypto.getDefaultParams).to.equal('function');
      expect(typeof Ably.Realtime.Crypto.generateRandomKey).to.equal('function');
    });

    it('Message', function () {
      expect(typeof Ably.Realtime.Message).to.equal('function');
      expect(typeof Ably.Realtime.Message.fromEncoded).to.equal('function');
      expect(typeof Ably.Realtime.Message.fromEncodedArray).to.equal('function');
    });

    it('PresenceMessage', function () {
      expect(typeof Ably.Realtime.PresenceMessage).to.equal('function');
      expect(typeof Ably.Realtime.PresenceMessage.fromEncoded).to.equal('function');
      expect(typeof Ably.Realtime.PresenceMessage.fromEncodedArray).to.equal('function');
    });
  });
});
