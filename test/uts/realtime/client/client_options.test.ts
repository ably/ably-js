/**
 * UTS: Realtime Client Options Tests
 *
 * Spec points: RSC1, RSC1a, RSC1b, RSC1c, RTC12
 * Source: uts/test/realtime/unit/client/client_options.md
 *
 * RTC12: The Realtime client has the same constructors as the REST client.
 */

import { expect } from 'chai';
import { Ably, trackClient, restoreAll } from '../../helpers';

describe('uts/realtime/client/client_options', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RSC1a / RTC12 - API key string detected (contains :)
   */
  it('RSC1a - API key string (standard format)', function () {
    const client = new Ably.Realtime({ key: 'appId.keyId:keySecret', autoConnect: false });
    trackClient(client);
    expect(client.options.key).to.equal('appId.keyId:keySecret');
  });

  it('RSC1a - API key string (special chars)', function () {
    const client = new Ably.Realtime({ key: 'xVLyHw.A-pwh:5WEB4HEAT3pOqWp9', autoConnect: false });
    trackClient(client);
    expect(client.options.key).to.equal('xVLyHw.A-pwh:5WEB4HEAT3pOqWp9');
  });

  it('RSC1a - API key string (extended secret)', function () {
    const client = new Ably.Realtime({ key: 'xVLyHw.A-pwh:5WEB4HEAT3pOqWp9-the_rest', autoConnect: false });
    trackClient(client);
    expect(client.options.key).to.equal('xVLyHw.A-pwh:5WEB4HEAT3pOqWp9-the_rest');
  });

  /**
   * RSC1c / RTC12 - Token string detected (no : before first .)
   */
  it('RSC1c - token string (opaque)', function () {
    const client = new Ably.Realtime({ token: 'abcdef1234567890', autoConnect: false });
    trackClient(client);
    expect(client.options.token).to.equal('abcdef1234567890');
  });

  it('RSC1c - token string (JWT format)', function () {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const client = new Ably.Realtime({ token: jwt, autoConnect: false });
    trackClient(client);
    expect(client.options.token).to.equal(jwt);
  });

  /**
   * RSC1b / RTC12 - No credentials raises error
   */
  it('RSC1b - no credentials raises error', function () {
    if (!process.env.RUN_DEVIATIONS) this.skip(); // ably-js uses 40160 instead of 40106; see #2204
    try {
      new Ably.Realtime({ autoConnect: false } as any);
      expect.fail('Expected constructor to throw');
    } catch (e: any) {
      expect(e.code).to.equal(40106);
    }
  });

  it('RSC1b - useTokenAuth without means raises error', function () {
    try {
      new Ably.Realtime({ useTokenAuth: true, autoConnect: false } as any);
      expect.fail('Expected constructor to throw');
    } catch (e) {
      expect(e).to.be.an('error');
    }
  });

  it('RSC1b - clientId alone raises error', function () {
    if (!process.env.RUN_DEVIATIONS) this.skip(); // ably-js uses 40160 instead of 40106; see #2204
    try {
      new Ably.Realtime({ clientId: 'test', autoConnect: false } as any);
      expect.fail('Expected constructor to throw');
    } catch (e: any) {
      expect(e.code).to.equal(40106);
    }
  });

  /**
   * RSC1 / RTC12 - ClientOptions object preserves values
   */
  it('RSC1 - ClientOptions values preserved', function () {
    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      clientId: 'testClient',
      tls: true,
      idempotentRestPublishing: true,
      autoConnect: false,
    });
    trackClient(client);

    expect(client.options.key).to.equal('appId.keyId:keySecret');
    expect(client.options.clientId).to.equal('testClient');
    expect(client.options.tls).to.equal(true);
    expect(client.options.idempotentRestPublishing).to.equal(true);
  });
});
