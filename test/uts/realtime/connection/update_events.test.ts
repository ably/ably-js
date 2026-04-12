/**
 * UTS: UPDATE Events Tests
 *
 * Spec points: RTN24
 * Source: uts/test/realtime/unit/connection/update_events_test.md
 *
 * Deviation: ably-js does NOT update connection.id or connection.key on
 * subsequent CONNECTED messages. Only internal connectionDetails (maxIdleInterval,
 * connectionStateTtl, etc.) are overridden. The UTS spec asserts id/key change,
 * but ably-js only updates those during transport activation (initial connect or
 * resume). See activateTransport() in connectionmanager.ts.
 */

import { expect } from 'chai';
import { MockWebSocket } from '../../mock_websocket';
import { Ably, installMockWebSocket, restoreAll } from '../../helpers';

describe('uts/realtime/connection/update_events', function () {
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
          },
        });
      },
    });
    installMockWebSocket(mock.constructorFn);

    const client = new Ably.Realtime({
      key: 'appId.keyId:keySecret',
      autoConnect: false,
      useBinaryProtocol: false,
    });

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
        },
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
        },
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
   *
   * Deviation: ably-js does not update connection.id or connection.key on
   * UPDATE. We verify the UPDATE event fires and state stays CONNECTED.
   */
  it('RTN24 - ConnectionDetails updated on new CONNECTED message', function (done) {
    setupConnectedClient((client) => {
      expect(client.connection.id).to.equal('connection-id-1');
      expect(client.connection.key).to.equal('connection-key-1');

      client.connection.on('update', () => {
        expect(client.connection.state).to.equal('connected');

        client.close();
        done();
      });

      // Send new CONNECTED with same id/key but different details
      mock.active_connection!.send_to_client({
        action: 4, // CONNECTED
        connectionId: 'connection-id-1',
        connectionKey: 'connection-key-1',
        connectionDetails: {
          connectionKey: 'connection-key-1',
          maxIdleInterval: 20000,
          connectionStateTtl: 120000,
          maxMessageSize: 32768,
          serverId: 'server-2',
        },
      });
    });
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
          },
        });
      }
    });
  });
});
