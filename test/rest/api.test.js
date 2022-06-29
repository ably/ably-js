'use strict';

define(['ably', 'chai'], function (Ably, chai) {
  var expect = chai.expect;

  describe('rest/api', function () {
    it('Client constructors', function () {
      expect(typeof Ably.Rest).to.equal('function');
      expect(typeof Ably.Rest.Promise).to.equal('function');
      expect(typeof Ably.Rest.Callbacks).to.equal('function');
      expect(Ably.Rest.Callbacks).to.equal(Ably.Rest);
    });

    it('Crypto', function () {
      expect(typeof Ably.Rest.Crypto).to.equal('function');
      expect(typeof Ably.Rest.Crypto.getDefaultParams).to.equal('function');
      expect(typeof Ably.Rest.Crypto.generateRandomKey).to.equal('function');
    });

    it('Message', function () {
      expect(typeof Ably.Rest.Message).to.equal('function');
      expect(typeof Ably.Rest.Message.fromEncoded).to.equal('function');
      expect(typeof Ably.Rest.Message.fromEncodedArray).to.equal('function');
    });

    it('PresenceMessage', function () {
      expect(typeof Ably.Rest.PresenceMessage).to.equal('function');
      expect(typeof Ably.Rest.PresenceMessage.fromEncoded).to.equal('function');
      expect(typeof Ably.Rest.PresenceMessage.fromEncodedArray).to.equal('function');
    });
  });
});
