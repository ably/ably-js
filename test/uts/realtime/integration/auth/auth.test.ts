/**
 * UTS Integration: Realtime Auth Tests
 *
 * Spec points: RTC8a, RTC8c, RSA8, RSA7
 * Source: uts/realtime/integration/auth.md
 */

import { expect } from 'chai';
import {
  Ably,
  SANDBOX_ENDPOINT,
  setupSandbox,
  teardownSandbox,
  getApiKey,
  getKeyParts,
  trackClient,
  connectAndWait,
  closeAndWait,
  generateJWT,
  uniqueChannelName,
} from '../sandbox';

describe('uts/realtime/integration/auth/auth', function () {
  this.timeout(30000);

  before(async function () {
    await setupSandbox();
  });

  after(async function () {
    await teardownSandbox();
  });

  /**
   * RSA8 - Token auth on realtime connection
   */
  it('RSA8 - JWT token auth connects successfully', async function () {
    const { keyName, keySecret } = getKeyParts(getApiKey());

    const client = new Ably.Realtime({
      authCallback: (_params: any, cb: any) => {
        cb(null, generateJWT({ keyName, keySecret, ttl: 3600000 }));
      },
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    await connectAndWait(client);

    expect(client.connection.state).to.equal('connected');
    expect(client.connection.id).to.not.be.null;
    expect(client.connection.errorReason).to.be.null;

    await closeAndWait(client);
  });

  /**
   * RTC8a - In-band reauthorization on CONNECTED client
   */
  it('RTC8a - authorize on connected client does not disconnect', async function () {
    const { keyName, keySecret } = getKeyParts(getApiKey());

    const client = new Ably.Realtime({
      authCallback: (_params: any, cb: any) => {
        cb(null, generateJWT({ keyName, keySecret, ttl: 3600000 }));
      },
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    await connectAndWait(client);
    const connectionIdBefore = client.connection.id;

    const stateChanges: any[] = [];
    client.connection.on((change: any) => stateChanges.push(change));

    const token = await client.auth.authorize();

    expect(token).to.not.be.null;
    expect(client.connection.state).to.equal('connected');
    expect(client.connection.id).to.equal(connectionIdBefore);

    const stateTransitions = stateChanges.filter((c: any) => c.current !== c.previous);
    expect(stateTransitions).to.have.length(0);

    await closeAndWait(client);
  });

  /**
   * RTC8c - authorize() from INITIALIZED initiates connection
   */
  it('RTC8c - authorize from initialized state initiates connection', async function () {
    const { keyName, keySecret } = getKeyParts(getApiKey());

    const client = new Ably.Realtime({
      authCallback: (_params: any, cb: any) => {
        cb(null, generateJWT({ keyName, keySecret, ttl: 3600000 }));
      },
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    expect(client.connection.state).to.equal('initialized');

    const token = await client.auth.authorize();

    expect(token).to.not.be.null;
    expect(client.connection.state).to.equal('connected');
    expect(client.connection.id).to.not.be.null;

    await closeAndWait(client);
  });

  /**
   * RSA7 - Matching clientId succeeds
   */
  it('RSA7 - matching clientId in JWT and options succeeds', async function () {
    const { keyName, keySecret } = getKeyParts(getApiKey());
    const testClientId = `test-client-${Math.random().toString(36).substring(2, 8)}`;

    const client = new Ably.Realtime({
      authCallback: (_params: any, cb: any) => {
        cb(null, generateJWT({ keyName, keySecret, clientId: testClientId, ttl: 3600000 }));
      },
      clientId: testClientId,
      endpoint: SANDBOX_ENDPOINT,
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    await connectAndWait(client);

    expect(client.connection.state).to.equal('connected');
    expect(client.auth.clientId).to.equal(testClientId);

    await closeAndWait(client);
  });
});
