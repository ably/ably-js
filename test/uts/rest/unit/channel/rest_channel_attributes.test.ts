/**
 * UTS: REST Channel Attributes Tests
 *
 * Spec points: RSL7, RSL8, RSL8a, RSL9
 * Source: uts/test/rest/unit/channel/rest_channel_attributes.md
 */

import { expect } from 'chai';
import { MockHttpClient } from '../../../mock_http';
import { Ably, installMockHttp, restoreAll } from '../../../helpers';

describe('uts/rest/unit/channel/rest_channel_attributes', function () {
  afterEach(function () {
    restoreAll();
  });

  /**
   * RSL9 - channel name attribute
   *
   * The channel object must expose its name via a name attribute,
   * including any namespace prefix.
   */
  it('RSL9 - channel name attribute', function () {
    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });

    const ch1 = client.channels.get('my-channel');
    expect(ch1.name).to.equal('my-channel');

    const ch2 = client.channels.get('namespace:channel-name');
    expect(ch2.name).to.equal('namespace:channel-name');
  });

  /**
   * RSL7 - setOptions completes without error
   *
   * Calling setOptions with an empty options object must complete
   * successfully without throwing.
   */
  it('RSL7 - setOptions completes without error', async function () {
    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const channel = client.channels.get('test-channel');

    await channel.setOptions({});
  });

  /**
   * RSL8 - status sends GET to correct path
   *
   * Calling status() on a channel sends a GET request to
   * /channels/<channelName>.
   */
  it('RSL8 - status sends GET to correct path', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, {
          channelId: 'test-channel',
          status: {
            isActive: true,
            occupancy: { metrics: { connections: 5 } },
          },
        });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const ch = client.channels.get('test-channel');
    await ch.status();

    expect(captured).to.have.length(1);
    expect(captured[0].method).to.equal('get');
    expect(captured[0].path).to.equal('/channels/test-channel');
  });

  /**
   * RSL8 - status URL encodes channel name
   *
   * Channel names containing special characters (colons, spaces, etc.)
   * must be URL-encoded in the request path.
   */
  it('RSL8 - status URL encodes channel name', async function () {
    const captured: any[] = [];
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        captured.push(req);
        req.respond_with(200, {
          channelId: 'namespace:my channel',
          status: {
            isActive: true,
            occupancy: { metrics: { connections: 1 } },
          },
        });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const ch = client.channels.get('namespace:my channel');
    await ch.status();

    expect(captured).to.have.length(1);
    expect(captured[0].path).to.contain(encodeURIComponent('namespace:my channel'));
  });

  /**
   * RSL8a - status returns ChannelDetails
   *
   * The status() method returns a ChannelDetails object with channelId,
   * status.isActive, and status.occupancy.metrics fields.
   */
  it('RSL8a - status returns ChannelDetails', async function () {
    const mock = new MockHttpClient({
      onConnectionAttempt: (conn) => conn.respond_with_success(),
      onRequest: (req) => {
        req.respond_with(200, {
          channelId: 'test-RSL8a',
          status: {
            isActive: true,
            occupancy: {
              metrics: {
                connections: 5,
                publishers: 2,
                subscribers: 3,
              },
            },
          },
        });
      },
    });
    installMockHttp(mock);

    const client = new Ably.Rest({ key: 'appId.keyId:keySecret', useBinaryProtocol: false });
    const ch = client.channels.get('test-RSL8a');
    const result = await ch.status();

    expect(result.channelId).to.equal('test-RSL8a');
    expect(result.status.isActive).to.equal(true);
    expect(result.status.occupancy.metrics.connections).to.equal(5);
    expect(result.status.occupancy.metrics.publishers).to.equal(2);
    expect(result.status.occupancy.metrics.subscribers).to.equal(3);
  });
});
