'use strict';

define(['ably', 'chai'], function (Ably, chai) {
  var expect = chai.expect;

  describe('realtime/api', function () {
    /**
     * Spec does not have an explicit item that states that Realtime should be a class, it is shown in types instead.
     *
     * @nospec
     */
    it('Client constructors', function () {
      expect(typeof Ably.DefaultPubSubRealtimeClient).to.equal('function');
    });

    /**
     * It actually tests RSC1b, but in the context of Realtime class
     *
     * @specpartial RTC12
     */
    it('constructor without any arguments', function () {
      expect(() => new Ably.DefaultPubSubRealtimeClient()).to.throw(
        'must be initialized with either a client options object, an Ably API key, or an Ably Token',
      );
    });

    /**
     * @spec RSE1
     * @spec RSE2
     */
    it('Crypto', function () {
      expect(typeof Ably.DefaultPubSubRealtimeClient.Crypto).to.equal('function');
      expect(typeof Ably.DefaultPubSubRealtimeClient.Crypto.getDefaultParams).to.equal('function');
      expect(typeof Ably.DefaultPubSubRealtimeClient.Crypto.generateRandomKey).to.equal('function');
    });

    /** @specpartial TM3 - tests only functions exist */
    it('Message', function () {
      expect(typeof Ably.DefaultPubSubRealtimeClient.Message).to.equal('function');
      expect(typeof Ably.DefaultPubSubRealtimeClient.Message.fromEncoded).to.equal('function');
      expect(typeof Ably.DefaultPubSubRealtimeClient.Message.fromEncodedArray).to.equal('function');
    });

    /** @specpartial TP4 - tests only functions exist */
    it('PresenceMessage', function () {
      expect(typeof Ably.DefaultPubSubRealtimeClient.PresenceMessage).to.equal('function');
      expect(typeof Ably.DefaultPubSubRealtimeClient.PresenceMessage.fromEncoded).to.equal('function');
      expect(typeof Ably.DefaultPubSubRealtimeClient.PresenceMessage.fromEncodedArray).to.equal('function');
    });
  });
});
