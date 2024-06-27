'use strict';

define([], function () {
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
    'new.Crypto.CipherParams', // This is not _really_ a private API since the CipherParams class is part of the IDL (although not part of the JS typings)
    'pass.clientOption.connectivityCheckUrl', // actually ably-js public API but no other SDK has it and it doesn’t enable ably-js-specific functionality
    'pass.clientOption.disableConnectivityCheck', // actually ably-js public API but no other SDK has it and it doesn’t enable ably-js-specific functionality
    'pass.clientOption.webSocketConnectTimeout',
    'read.Defaults.protocolVersion',
    'read.Defaults.version',
    'read.EventEmitter.events',
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
          console.log(`(${loggingDescription}) Recorded private API: ${privateAPIIdentifier}`);
          this.privateAPIUsages.push({ context, privateAPIIdentifier });
        },
      };
    }

    dumpToConsole() {
      const data = JSON.stringify(this.privateAPIUsages);
      console.log('Private API usages:\n', data);
    }
  }

  return (module.exports = new PrivateApiRecorder());
});
