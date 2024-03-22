'use strict';

define(['ably', 'chai'], function (Ably, chai) {
  var expect = chai.expect;

  describe('realtime/api', function () {
    it('Client constructors', function () {
      expect(typeof Ably.Realtime).to.equal('function');
    });

    it('constructor without any arguments', function () {
      expect(() => new Ably.Realtime()).to.throw(
        'must be initialized with either a client options object, an Ably API key, or an Ably Token',
      );
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
