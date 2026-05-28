'use strict';

/*
 * DX-1209 — hint pinning tests for inline SDK throw sites.
 *
 * Tests pin the hint strings so we don't drift the LLM-discoverable surface.
 * If you change a hint, update the assertion too — the drift check is the
 * point.
 *
 * Hints for server-relayed codes (40140 token expired, 40160 capability, etc.)
 * are out of scope for this ticket; that propagation is tracked separately.
 */

define(['chai', 'ably'], function (chai, Ably) {
  const { expect } = chai;

  describe('DX-1209 / error hints — inline at SDK throw sites', function () {
    describe('BaseClient / ClientOptions construction', function () {
      it('invalid key format (40400) carries a key-format hint', function () {
        try {
          new Ably.Rest({ key: 'not-a-valid-key' });
          throw new Error('expected constructor to throw');
        } catch (err) {
          expect(err.code).to.equal(40400);
          expect(err.hint).to.be.a('string');
          expect(err.hint).to.contain('appId');
          expect(err.hint).to.contain('keyId');
        }
      });

      it('wildcard clientId (40012) carries a defaultTokenParams hint', function () {
        try {
          new Ably.Rest({ key: 'a.b:c', clientId: '*' });
          throw new Error('expected constructor to throw');
        } catch (err) {
          expect(err.code).to.equal(40012);
          expect(err.hint).to.be.a('string');
          expect(err.hint).to.contain('defaultTokenParams');
        }
      });

      it('no auth options (40160) carries a key/authUrl/authCallback hint', function () {
        try {
          new Ably.Rest({});
          throw new Error('expected constructor to throw');
        } catch (err) {
          expect(err.code).to.equal(40160);
          expect(err.hint).to.be.a('string');
          expect(err.hint).to.contain('authUrl');
          expect(err.hint).to.contain('authCallback');
        }
      });

      it('endpoint + environment together (40106) carries a v2-naming hint', function () {
        try {
          new Ably.Rest({ key: 'a.b:c', endpoint: 'foo', environment: 'sandbox' });
          throw new Error('expected constructor to throw');
        } catch (err) {
          expect(err.code).to.equal(40106);
          expect(err.hint).to.be.a('string');
          expect(err.hint).to.contain('endpoint');
          expect(err.hint).to.contain('legacy');
        }
      });
    });

    describe('Utils.createMissingPluginError', function () {
      it('missing plugin error carries an import hint', function () {
        const rest = new Ably.Rest({ key: 'a.b:c' });
        try {
          // _FilteredSubscriptions is the stable internal trigger for
          // createMissingPluginError('MessageInteractions'); used here only
          // because no public API exposes the missing-plugin throw without
          // first connecting a Realtime client.
          rest._FilteredSubscriptions;
          throw new Error('expected getter to throw');
        } catch (err) {
          expect(err.code).to.equal(40019);
          expect(err.hint).to.be.a('string');
          expect(err.hint).to.contain('ably/modular');
          expect(err.hint).to.contain('plugins');
        }
      });
    });
  });
});
