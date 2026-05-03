/**
 * UTS: UPDATE Events Tests
 *
 * Spec points: RTN24
 * Source: uts/test/realtime/unit/connection/update_events_test.md
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../../mock_websocket';
import { Ably, trackClient, installMockWebSocket, restoreAll } from '../../../helpers';

describe('uts/realtime/unit/connection/update_events', function () {
  let mock: MockWebSocket;

  afterEach(function () {
    restoreAll();
  });

  function setupConnectedClient(done: (client: any) => void) {
    mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected({
          connectionId: 'connection-id-1',
          connectionDetails: {
            connectionKey: 'connection-key-1',
            maxIdleInterval: 15000,
            connectionStateTtl: 120000,
          } as any,
        });
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connection.once('connected', () => {
      done(client);
    });

    client.connect();
  }

  /**
   * RTN24 - CONNECTED while already CONNECTED emits UPDATE event, not CONNECTED
   */
  it('RTN24 - CONNECTED while connected emits UPDATE not state change', function (done) {
    setupConnectedClient((client) => {
      const connectedEvents: any[] = [];

      client.connection.on('connected', (change: any) => {
        connectedEvents.push(change);
      });

      client.connection.on('update', (change: any) => {
        expect(client.connection.state).to.equal('connected');
        expect(connectedEvents).to.have.length(0);
        expect(change.previous).to.equal('connected');
        expect(change.current).to.equal('connected');

        client.close();
        done();
      });

      // Send another CONNECTED message (e.g., after reauth)
      mock.active_connection!.send_to_client({
        action: 4, // CONNECTED
        connectionId: 'connection-id-1',
        connectionKey: 'connection-key-1',
        connectionDetails: {
          connectionKey: 'connection-key-1',
          maxIdleInterval: 20000,
          connectionStateTtl: 120000,
        } as any,
      });
    });
  });

  /**
   * RTN24 - UPDATE event with error reason
   */
  it('RTN24 - UPDATE event carries error reason', function (done) {
    setupConnectedClient((client) => {
      client.connection.on('update', (change: any) => {
        expect(change.previous).to.equal('connected');
        expect(change.current).to.equal('connected');
        expect(change.reason).to.not.be.null;
        expect(change.reason.code).to.equal(40142);
        expect(change.reason.statusCode).to.equal(401);

        client.close();
        done();
      });

      mock.active_connection!.send_to_client({
        action: 4, // CONNECTED
        connectionId: 'connection-id-1',
        connectionKey: 'connection-key-1',
        connectionDetails: {
          connectionKey: 'connection-key-1',
          maxIdleInterval: 15000,
          connectionStateTtl: 120000,
        } as any,
        error: {
          code: 40142,
          statusCode: 401,
          message: 'Token expired; renewed automatically',
        },
      });
    });
  });

  /**
   * RTN24 - ConnectionDetails override
   */
  it('RTN24 - ConnectionDetails updated on new CONNECTED message', async function () {
    if (!process.env.RUN_DEVIATIONS) this.skip(); // ably-js doesn't update connection.id on subsequent CONNECTED
    mock = new MockWebSocket({
      onConnectionAttempt: (conn) => {
        mock.active_connection = conn;
        conn.respond_with_connected({
          connectionId: 'connection-id-1',
          connectionDetails: {
            connectionKey: 'connection-key-1',
            maxIdleInterval: 15000,
            connectionStateTtl: 120000,
          } as any,
        });
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });
    trackClient(client);

    client.connect();
    await new Promise<void>((resolve) => client.connection.once('connected', resolve));

    expect(client.connection.id).to.equal('connection-id-1');
    expect(client.connection.key).to.equal('connection-key-1');

    const updatePromise = new Promise<any>((resolve) =>
      client.connection.once('update', (change: any) => resolve(change)),
    );

    mock.active_connection!.send_to_client({
      action: 4, // CONNECTED
      connectionId: 'connection-id-2',
      connectionKey: 'connection-key-2',
      connectionDetails: {
        connectionKey: 'connection-key-2',
        maxIdleInterval: 20000,
        connectionStateTtl: 120000,
        maxMessageSize: 32768,
        serverId: 'server-2',
      } as any,
    });

    await updatePromise;

    expect(client.connection.state).to.equal('connected');
    expect(client.connection.id).to.equal('connection-id-2');
    expect(client.connection.key).to.equal('connection-key-2');

    client.close();
  });

  /**
   * RTN24 - No duplicate CONNECTED event
   */
  it('RTN24 - no duplicate CONNECTED state events', function (done) {
    setupConnectedClient((client) => {
      const connectedEvents: any[] = [];
      const updateEvents: any[] = [];

      client.connection.on('connected', (change: any) => {
        connectedEvents.push(change);
      });

      client.connection.on('update', (change: any) => {
        updateEvents.push(change);

        if (updateEvents.length === 3) {
          expect(connectedEvents).to.have.length(0);

          for (const evt of updateEvents) {
            expect(evt.previous).to.equal('connected');
            expect(evt.current).to.equal('connected');
          }

          client.close();
          done();
        }
      });

      // Send 3 CONNECTED messages
      for (let i = 0; i < 3; i++) {
        mock.active_connection!.send_to_client({
          action: 4, // CONNECTED
          connectionId: 'connection-id-1',
          connectionKey: 'connection-key-1',
          connectionDetails: {
            connectionKey: 'connection-key-1',
            maxIdleInterval: 15000,
            connectionStateTtl: 120000,
          } as any,
        });
      }
    });
  });
});
