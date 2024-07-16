'use strict';

define(['test/support/output_directory_paths'], function (outputDirectoryPaths) {
  const privateAPIIdentifiers = [
    'call.BufferUtils.areBuffersEqual',
    'call.BufferUtils.base64Decode',
    'call.BufferUtils.base64Encode',
    'call.BufferUtils.hexEncode',
    'call.BufferUtils.isBuffer',
    'call.BufferUtils.toArrayBuffer',
    'call.BufferUtils.utf8Encode',
    'call.ConnectionManager.supportedTransports',
    'call.Defaults.getHost',
    'call.Defaults.getHost',
    'call.Defaults.getHosts',
    'call.Defaults.getPort',
    'call.Defaults.normaliseOptions',
    'call.EventEmitter.emit',
    'call.Message.decode',
    'call.Message.encode',
    'call.Platform.Config.push.storage.clear',
    'call.Platform.nextTick',
    'call.PresenceMessage.fromValues',
    'call.ProtocolMessage.setFlag',
    'call.Utils.copy',
    'call.Utils.getRetryTime',
    'call.Utils.inspectError',
    'call.Utils.keysArray',
    'call.Utils.mixin',
    'call.Utils.toQueryString',
    'call.auth.getAuthHeaders',
    'call.channel.checkPendingState',
    'call.channel.processMessage',
    'call.channel.requestState',
    'call.channel.sendPresence',
    'call.channel.sync',
    'call.connectionManager.activeProtocol.getTransport',
    'call.connectionManager.disconnectAllTransports',
    'call.connectionManager.notifyState',
    'call.connectionManager.onChannelMessage',
    'call.connectionManager.requestState',
    'call.connectionManager.send',
    'call.filteredSubscriptions.has',
    'call.http._getHosts',
    'call.http.checkConnectivity',
    'call.http.doUri',
    'call.msgpack.decode',
    'call.msgpack.encode',
    'call.presence._myMembers.put',
    'call.presence.waitSync',
    'call.protocolMessageFromDeserialized',
    'call.realtime.baseUri',
    'call.rest.baseUri',
    'call.rest.http.do',
    'call.restChannel._publish',
    'call.transport.onProtocolMessage',
    'call.transport.send',
    'delete.auth.authOptions.requestHeaders',
    'deserialize.recoveryKey',
    'listen.channel._allChannelChanges.attached',
    'listen.channel._allChannelChanges.update',
    'listen.connectionManager.connectiondetails',
    'listen.connectionManager.transport.active',
    'listen.connectionManager.transport.pending',
    'listen.transport.disposed',
    'new.Crypto.CipherParams', // This is in a bit of a grey area re whether it’s private API. The CipherParams class is indeed part of the public API in the spec, but it’s not clear whether you’re meant to be construct one directly, and furthermore the spec doesn’t describe it as being exposed as a property on Crypto.
    'pass.clientOption.connectivityCheckUrl', // actually ably-js public API (i.e. it’s in the TypeScript typings) but no other SDK has it and it doesn’t enable ably-js-specific functionality
    'pass.clientOption.disableConnectivityCheck', // actually ably-js public API (i.e. it’s in the TypeScript typings) but no other SDK has it and it doesn’t enable ably-js-specific functionality
    'pass.clientOption.pushRecipientChannel',
    'pass.clientOption.webSocketConnectTimeout',
    'read.Defaults.protocolVersion',
    'read.Defaults.version',
    'read.EventEmitter.events',
    'read.Platform.Config.push',
    'read.Realtime._transports',
    'read.auth.authOptions.authUrl',
    'read.auth.key',
    'read.auth.method',
    'read.auth.tokenParams.version',
    'read.channel.channelOptions',
    'read.channel.channelOptions.cipher',
    'read.connectionManager.activeProtocol',
    'read.connectionManager.activeProtocol.transport',
    'read.connectionManager.baseTransport',
    'read.connectionManager.connectionId',
    'read.connectionManager.connectionId',
    'read.connectionManager.connectionStateTtl',
    'read.connectionManager.httpHosts',
    'read.connectionManager.msgSerial',
    'read.connectionManager.options',
    'read.connectionManager.options.timeouts.httpMaxRetryDuration',
    'read.connectionManager.options.timeouts.httpRequestTimeout',
    'read.connectionManager.pendingTransport',
    'read.connectionManager.queuedMessages.messages',
    'read.connectionManager.states.disconnected.retryDelay',
    'read.connectionManager.states.suspended.retryDelay',
    'read.connectionManager.webSocketTransportAvailable',
    'read.realtime.options',
    'read.realtime.options.key',
    'read.realtime.options.maxMessageSize',
    'read.realtime.options.token',
    'read.rest._currentFallback',
    'read.rest._currentFallback.host',
    'read.rest._currentFallback.validUntil',
    'read.rest.options.key',
    'read.rest.options.realtimeHost',
    'read.rest.options.token',
    'read.rest.serverTimeOffset',
    'read.transport.params.mode',
    'read.transport.recvRequest.recvUri',
    'read.transport.uri',
    'replace.channel.attachImpl',
    'replace.channel.processMessage',
    'replace.channel.sendMessage',
    'replace.channel.sendPresence',
    'replace.connectionManager.onChannelMessage',
    'replace.connectionManager.send',
    'replace.connectionManager.tryATransport',
    'replace.http.doUri',
    'replace.rest.http.do',
    'replace.rest.time',
    'replace.restChannel._publish',
    'replace.transport.onProtocolMessage',
    'replace.transport.send',
    'serialize.recoveryKey',
    'write.Defaults.ENVIRONMENT',
    'write.Platform.Config.push', // This implies using a mock implementation of the internal IPlatformPushConfig interface. Our mock (in push_channel_transport.js) then interacts with internal objects and private APIs of public objects to implement this interface; I haven’t added annotations for that private API usage, since there wasn’t an easy way to pass test context information into the mock. I think that for now we can just say that if we wanted to get rid of this private API usage, then we’d need to remove this mock entirely.
    'write.auth.authOptions.requestHeaders',
    'write.auth.key',
    'write.auth.tokenDetails.token',
    'write.channel._lastPayload',
    'write.channel.state',
    'write.connectionManager.connectionDetails.maxMessageSize',
    'write.connectionManager.connectionId',
    'write.connectionManager.connectionKey',
    'write.connectionManager.lastActivity',
    'write.connectionManager.msgSerial',
    'write.realtime.options.timeouts.realtimeRequestTimeout',
    'write.rest._currentFallback.validUntil',
  ];

  class PrivateApiRecorder {
    privateAPIUsages = [];

    /**
     * Creates a recording context for the current Mocha test case.
     *
     * @param context A description of the context for which the calls will be recorded.
     */
    createContext(context) {
      if (!context) {
        throw new Error('No description passed to createContext');
      }

      const loggingDescription = JSON.stringify(context);

      return {
        record: (privateAPIIdentifier) => {
          if (privateAPIIdentifiers.indexOf(privateAPIIdentifier) == -1) {
            throw new Error(`(${loggingDescription}) Recorded unknown private API: ${privateAPIIdentifier}`);
          }
          this.privateAPIUsages.push({ context, privateAPIIdentifier });
        },
        recordTestStart: () => {
          this.privateAPIUsages.push({ context, privateAPIIdentifier: null });
        },
      };
    }

    dump() {
      if (isBrowser) {
        window.dispatchEvent(new CustomEvent('privateApiUsageData', { detail: this.privateAPIUsages }));
      } else {
        try {
          const fs = require('fs');
          const path = require('path');

          if (!fs.existsSync(outputDirectoryPaths.privateApiUsage)) {
            fs.mkdirSync(outputDirectoryPaths.privateApiUsage);
          }
          const filename = `node-${process.version.split('.')[0]}.json`;
          fs.writeFileSync(
            path.join(outputDirectoryPaths.privateApiUsage, filename),
            JSON.stringify(this.privateAPIUsages),
            { encoding: 'utf-8' },
          );
        } catch (err) {
          console.log('Failed to write private API usage data: ', err);
          throw err;
        }
      }
    }
  }

  return (module.exports = new PrivateApiRecorder());
});
