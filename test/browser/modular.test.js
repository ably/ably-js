import {
  BaseRest,
  BaseRealtime,
  Rest,
  generateRandomKey,
  getDefaultCryptoParams,
  decodeMessage,
  decodeEncryptedMessage,
  decodeMessages,
  decodeEncryptedMessages,
  Crypto,
  MsgPack,
  RealtimePresence,
  decodePresenceMessage,
  decodePresenceMessages,
  constructPresenceMessage,
  XHRPolling,
  XHRStreaming,
  WebSocketTransport,
  FetchRequest,
  XHRRequest,
  MessageInteractions,
} from '../../build/modular/index.mjs';

function registerAblyModularTests(helper) {
  describe('browser/modular', function () {
    this.timeout(10 * 1000);
    const expect = chai.expect;
    const BufferUtils = BaseRest.Platform.BufferUtils;
    const ablyClientOptions = helper.ablyClientOptions;
    const testResourcesPath = helper.testResourcesPath;
    const testMessageEquality = helper.testMessageEquality;
    const randomString = helper.randomString;
    const getTestApp = helper.getTestApp;
    const loadTestData = async (dataPath) => {
      return new Promise((resolve, reject) => {
        helper.loadTestData(dataPath, (err, testData) => (err ? reject(err) : resolve(testData)));
      });
    };

    before((done) => {
      helper.setupApp(done);
    });

    describe('without any plugins', () => {
      for (const clientClass of [BaseRest, BaseRealtime]) {
        describe(clientClass.name, () => {
          it('throws an error due to the absence of an HTTP plugin', () => {
            expect(() => new clientClass(ablyClientOptions(), {})).to.throw(
              'No HTTP request plugin provided. Provide at least one of the FetchRequest or XHRRequest plugins.',
            );
          });
        });
      }
    });

    describe('Rest', () => {
      const restScenarios = [
        {
          description: 'use push admin functionality',
          action: (client) => client.push.admin.publish({ clientId: 'foo' }, { data: { bar: 'baz' } }),
        },
        { description: 'call `time()`', action: (client) => client.time() },
        {
          description: 'call `auth.createTokenRequest()` with `queryTime` option enabled',
          action: (client) =>
            client.auth.createTokenRequest(undefined, {
              key: getTestApp().keys[0].keyStr /* if passing authOptions you have to explicitly pass the key */,
              queryTime: true,
            }),
        },
        { description: 'call `stats()`', action: (client) => client.stats() },
        { description: 'call `request(...)`', action: (client) => client.request('get', '/channels/channel', 2) },
        {
          description: 'call `batchPublish(...)`',
          action: (client) => client.batchPublish({ channels: ['channel'], messages: { data: { foo: 'bar' } } }),
        },
        {
          description: 'call `batchPresence(...)`',
          action: (client) => client.batchPresence(['channel']),
        },
        {
          description: 'call `auth.revokeTokens(...)`',
          getAdditionalClientOptions: () => {
            const testApp = getTestApp();
            return { key: testApp.keys[4].keyStr /* this key has revocableTokens enabled */ };
          },
          action: (client) => client.auth.revokeTokens([{ type: 'clientId', value: 'foo' }]),
        },
        {
          description: 'call channel’s `history()`',
          action: (client) => client.channels.get('channel').history(),
        },
        {
          description: 'call channel’s `presence.history()`',
          additionalRealtimePlugins: { RealtimePresence },
          action: (client) => client.channels.get('channel').presence.history(),
        },
        {
          description: 'call channel’s `status()`',
          action: (client) => client.channels.get('channel').status(),
        },
      ];

      describe('BaseRest without explicit Rest', () => {
        for (const scenario of restScenarios) {
          it(`allows you to ${scenario.description}`, async () => {
            const client = new BaseRest(
              ablyClientOptions({ ...scenario.getAdditionalClientOptions?.(), plugins: { FetchRequest } }),
            );

            let thrownError = null;
            try {
              await scenario.action(client);
            } catch (error) {
              thrownError = error;
            }

            expect(thrownError).to.be.null;
          });
        }
      });

      describe('BaseRealtime with Rest', () => {
        for (const scenario of restScenarios) {
          it(`allows you to ${scenario.description}`, async () => {
            const client = new BaseRealtime(
              ablyClientOptions({
                ...scenario.getAdditionalClientOptions?.(),
                plugins: {
                  WebSocketTransport,
                  FetchRequest,
                  Rest,
                  ...scenario.additionalRealtimePlugins,
                },
              }),
            );

            let thrownError = null;
            try {
              await scenario.action(client);
            } catch (error) {
              thrownError = error;
            }

            expect(thrownError).to.be.null;
          });
        }
      });

      describe('BaseRealtime without Rest', () => {
        it('still allows publishing and subscribing', async () => {
          const client = new BaseRealtime(ablyClientOptions({ plugins: { WebSocketTransport, FetchRequest } }));

          const channel = client.channels.get('channel');
          await channel.attach();

          const recievedMessagePromise = new Promise((resolve) => {
            channel.subscribe((message) => {
              resolve(message);
            });
          });

          await channel.publish({ data: { foo: 'bar' } });

          const receivedMessage = await recievedMessagePromise;
          expect(receivedMessage.data).to.eql({ foo: 'bar' });
        });

        it('allows `auth.createTokenRequest()` without `queryTime` option enabled', async () => {
          const client = new BaseRealtime(ablyClientOptions({ plugins: { WebSocketTransport, FetchRequest } }));

          const tokenRequest = await client.auth.createTokenRequest();
          expect(tokenRequest).to.be.an('object');
        });

        for (const scenario of restScenarios) {
          it(`throws an error when attempting to ${scenario.description}`, async () => {
            const client = new BaseRealtime(
              ablyClientOptions({
                ...scenario.getAdditionalClientOptions?.(),
                plugins: {
                  WebSocketTransport,
                  FetchRequest,
                  ...scenario.additionalRealtimePlugins,
                },
              }),
            );

            let thrownError = null;
            try {
              await scenario.action(client);
            } catch (error) {
              thrownError = error;
            }

            expect(thrownError).not.to.be.null;
            expect(thrownError.message).to.equal('Rest plugin not provided');
          });
        }
      });
    });

    describe('Crypto standalone functions', () => {
      it('generateRandomKey', async () => {
        const key = await generateRandomKey();
        expect(key).to.be.an('ArrayBuffer');
      });

      it('getDefaultCryptoParams', async () => {
        const key = await generateRandomKey();
        const params = getDefaultCryptoParams({ key });
        expect(params).to.be.an('object');
      });
    });

    describe('Message standalone functions', () => {
      async function testDecodesMessageData(functionUnderTest) {
        const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');

        const item = testData.items[1];
        const decoded = await functionUnderTest(item.encoded);

        expect(decoded.data).to.be.an('ArrayBuffer');
      }

      describe('decodeMessage', () => {
        it('decodes a message’s data', async () => {
          testDecodesMessageData(decodeMessage);
        });

        it('throws an error when given channel options with a cipher', async () => {
          const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');
          const key = BufferUtils.base64Decode(testData.key);
          const iv = BufferUtils.base64Decode(testData.iv);

          let thrownError = null;
          try {
            await decodeMessage(testData.items[0].encrypted, { cipher: { key, iv } });
          } catch (error) {
            thrownError = error;
          }

          expect(thrownError).not.to.be.null;
          expect(thrownError.message).to.equal('Crypto plugin not provided');
        });
      });

      describe('decodeEncryptedMessage', async () => {
        it('decodes a message’s data', async () => {
          testDecodesMessageData(decodeEncryptedMessage);
        });

        it('decrypts a message', async () => {
          const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');

          const key = BufferUtils.base64Decode(testData.key);
          const iv = BufferUtils.base64Decode(testData.iv);

          for (const item of testData.items) {
            const [decodedFromEncoded, decodedFromEncrypted] = await Promise.all([
              decodeMessage(item.encoded),
              decodeEncryptedMessage(item.encrypted, { cipher: { key, iv } }),
            ]);

            testMessageEquality(decodedFromEncoded, decodedFromEncrypted);
          }
        });
      });

      async function testDecodesMessagesData(functionUnderTest) {
        const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');

        const items = [testData.items[1], testData.items[3]];
        const decoded = await functionUnderTest(items.map((item) => item.encoded));

        expect(decoded[0].data).to.be.an('ArrayBuffer');
        expect(decoded[1].data).to.be.an('array');
      }

      describe('decodeMessages', () => {
        it('decodes messages’ data', async () => {
          testDecodesMessagesData(decodeMessages);
        });

        it('throws an error when given channel options with a cipher', async () => {
          const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');
          const key = BufferUtils.base64Decode(testData.key);
          const iv = BufferUtils.base64Decode(testData.iv);

          let thrownError = null;
          try {
            await decodeMessages(
              testData.items.map((item) => item.encrypted),
              { cipher: { key, iv } },
            );
          } catch (error) {
            thrownError = error;
          }

          expect(thrownError).not.to.be.null;
          expect(thrownError.message).to.equal('Crypto plugin not provided');
        });
      });

      describe('decodeEncryptedMessages', () => {
        it('decodes messages’ data', async () => {
          testDecodesMessagesData(decodeEncryptedMessages);
        });

        it('decrypts messages', async () => {
          const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');

          const key = BufferUtils.base64Decode(testData.key);
          const iv = BufferUtils.base64Decode(testData.iv);

          const [decodedFromEncoded, decodedFromEncrypted] = await Promise.all([
            decodeMessages(testData.items.map((item) => item.encoded)),
            decodeEncryptedMessages(
              testData.items.map((item) => item.encrypted),
              { cipher: { key, iv } },
            ),
          ]);

          for (let i = 0; i < decodedFromEncoded.length; i++) {
            testMessageEquality(decodedFromEncoded[i], decodedFromEncrypted[i]);
          }
        });
      });
    });

    describe('Crypto', () => {
      describe('without Crypto', () => {
        async function testThrowsAnErrorWhenGivenChannelOptionsWithACipher(clientClassConfig) {
          const client = new clientClassConfig.clientClass(
            ablyClientOptions({
              plugins: {
                ...clientClassConfig.additionalPlugins,
                FetchRequest,
              },
            }),
          );
          const key = await generateRandomKey();
          expect(() => client.channels.get('channel', { cipher: { key } })).to.throw('Crypto plugin not provided');
        }

        for (const clientClassConfig of [
          { clientClass: BaseRest },
          { clientClass: BaseRealtime, additionalPlugins: { WebSocketTransport } },
        ]) {
          describe(clientClassConfig.clientClass.name, () => {
            it('throws an error when given channel options with a cipher', async () => {
              await testThrowsAnErrorWhenGivenChannelOptionsWithACipher(clientClassConfig);
            });
          });
        }
      });

      describe('with Crypto', () => {
        async function testIsAbleToPublishEncryptedMessages(clientClassConfig) {
          const clientOptions = ablyClientOptions();

          const key = await generateRandomKey();

          // Publish the message on a channel configured to use encryption, and receive it on one not configured to use encryption

          const rxClient = new BaseRealtime({ ...clientOptions, plugins: { WebSocketTransport, FetchRequest } });
          const rxChannel = rxClient.channels.get('channel');
          await rxChannel.attach();

          const rxMessagePromise = new Promise((resolve, _) => rxChannel.subscribe((message) => resolve(message)));

          const encryptionChannelOptions = { cipher: { key } };

          const txMessage = { name: 'message', data: 'data' };
          const txClient = new clientClassConfig.clientClass({
            ...clientOptions,
            plugins: {
              ...clientClassConfig.additionalPlugins,
              FetchRequest,
              Crypto,
            },
          });
          const txChannel = txClient.channels.get('channel', encryptionChannelOptions);
          await txChannel.publish(txMessage);

          const rxMessage = await rxMessagePromise;

          // Verify that the message was published with encryption
          expect(rxMessage.encoding).to.equal('utf-8/cipher+aes-256-cbc');

          // Verify that the message was correctly encrypted
          const rxMessageDecrypted = await decodeEncryptedMessage(rxMessage, encryptionChannelOptions);
          testMessageEquality(rxMessageDecrypted, txMessage);
        }

        for (const clientClassConfig of [
          { clientClass: BaseRest },
          { clientClass: BaseRealtime, additionalPlugins: { WebSocketTransport } },
        ]) {
          describe(clientClassConfig.clientClass.name, () => {
            it('is able to publish encrypted messages', async () => {
              await testIsAbleToPublishEncryptedMessages(clientClassConfig);
            });
          });
        }
      });
    });

    describe('MsgPack', () => {
      async function testRestUsesContentType(rest, expectedContentType) {
        const channelName = 'channel';
        const channel = rest.channels.get(channelName);
        const contentTypeUsedForPublishPromise = new Promise((resolve, reject) => {
          rest.http.do = async (method, path, headers, body, params) => {
            if (!(method == 'post' && path == `/channels/${channelName}/messages`)) {
              return new Promise(() => {});
            }
            resolve(headers['content-type']);
            return { error: null };
          };
        });

        await channel.publish('message', 'body');

        const contentTypeUsedForPublish = await contentTypeUsedForPublishPromise;
        expect(contentTypeUsedForPublish).to.equal(expectedContentType);
      }

      async function testRealtimeUsesFormat(realtime, expectedFormat) {
        const formatUsedForConnectionPromise = new Promise((resolve, reject) => {
          realtime.connection.connectionManager.connectImpl = (transportParams) => {
            resolve(transportParams.format);
          };
        });
        realtime.connect();

        const formatUsedForConnection = await formatUsedForConnectionPromise;
        expect(formatUsedForConnection).to.equal(expectedFormat);
      }

      // TODO once https://github.com/ably/ably-js/issues/1424 is fixed, this should also test the case where the useBinaryProtocol option is not specified
      describe('with useBinaryProtocol client option', () => {
        describe('without MsgPack', () => {
          describe('BaseRest', () => {
            it('uses JSON', async () => {
              const client = new BaseRest(ablyClientOptions({ useBinaryProtocol: true, plugins: { FetchRequest } }));
              await testRestUsesContentType(client, 'application/json');
            });
          });

          describe('BaseRealtime', () => {
            it('uses JSON', async () => {
              const client = new BaseRealtime(
                ablyClientOptions({
                  useBinaryProtocol: true,
                  autoConnect: false,
                  plugins: {
                    WebSocketTransport,
                    FetchRequest,
                  },
                }),
              );
              await testRealtimeUsesFormat(client, 'json');
            });
          });
        });

        describe('with MsgPack', () => {
          describe('BaseRest', () => {
            it('uses MessagePack', async () => {
              const client = new BaseRest(
                ablyClientOptions({
                  useBinaryProtocol: true,
                  plugins: {
                    FetchRequest,
                    MsgPack,
                  },
                }),
              );
              await testRestUsesContentType(client, 'application/x-msgpack');
            });
          });

          describe('BaseRealtime', () => {
            it('uses MessagePack', async () => {
              const client = new BaseRealtime(
                ablyClientOptions({
                  useBinaryProtocol: true,
                  autoConnect: false,
                  plugins: {
                    WebSocketTransport,
                    FetchRequest,
                    MsgPack,
                  },
                }),
              );
              await testRealtimeUsesFormat(client, 'msgpack');
            });
          });
        });
      });
    });

    describe('RealtimePresence', () => {
      describe('BaseRealtime without RealtimePresence', () => {
        it('throws an error when attempting to access the `presence` property', () => {
          const client = new BaseRealtime(ablyClientOptions({ plugins: { WebSocketTransport, FetchRequest } }));
          const channel = client.channels.get('channel');

          expect(() => channel.presence).to.throw('RealtimePresence plugin not provided');
        });

        it('doesn’t break when it receives a PRESENCE ProtocolMessage', async () => {
          const rxClient = new BaseRealtime(ablyClientOptions({ plugins: { WebSocketTransport, FetchRequest } }));
          const rxChannel = rxClient.channels.get('channel');

          await rxChannel.attach();

          const receivedMessagePromise = new Promise((resolve) => rxChannel.subscribe(resolve));

          const txClient = new BaseRealtime(
            ablyClientOptions({
              clientId: randomString(),
              plugins: {
                WebSocketTransport,
                FetchRequest,
                RealtimePresence,
              },
            }),
          );
          const txChannel = txClient.channels.get('channel');

          await txChannel.publish('message', 'body');
          await txChannel.presence.enter();

          // The idea being here that in order for receivedMessagePromise to resolve, rxClient must have first processed the PRESENCE ProtocolMessage that resulted from txChannel.presence.enter()

          await receivedMessagePromise;
        });
      });

      describe('BaseRealtime with RealtimePresence', () => {
        it('offers realtime presence functionality', async () => {
          const rxChannel = new BaseRealtime(
            ablyClientOptions({
              plugins: {
                WebSocketTransport,
                FetchRequest,
                RealtimePresence,
              },
            }),
          ).channels.get('channel');
          const txClientId = randomString();
          const txChannel = new BaseRealtime(
            ablyClientOptions({
              clientId: txClientId,
              plugins: {
                WebSocketTransport,
                FetchRequest,
                RealtimePresence,
              },
            }),
          ).channels.get('channel');

          let resolveRxPresenceMessagePromise;
          const rxPresenceMessagePromise = new Promise((resolve, reject) => {
            resolveRxPresenceMessagePromise = resolve;
          });
          await rxChannel.presence.subscribe('enter', resolveRxPresenceMessagePromise);
          await txChannel.presence.enter();

          const rxPresenceMessage = await rxPresenceMessagePromise;
          expect(rxPresenceMessage.clientId).to.equal(txClientId);
        });
      });
    });

    describe('PresenceMessage standalone functions', () => {
      describe('decodePresenceMessage', () => {
        it('decodes a presence message’s data', async () => {
          const buffer = BufferUtils.utf8Encode('foo');
          const encodedMessage = { data: BufferUtils.base64Encode(buffer), encoding: 'base64' };

          const decodedMessage = await decodePresenceMessage(encodedMessage);

          expect(BufferUtils.areBuffersEqual(decodedMessage.data, buffer)).to.be.true;
          expect(decodedMessage.encoding).to.be.null;
        });
      });

      describe('decodeMessages', () => {
        it('decodes presence messages’ data', async () => {
          const buffers = ['foo', 'bar'].map((data) => BufferUtils.utf8Encode(data));
          const encodedMessages = buffers.map((buffer) => ({
            data: BufferUtils.base64Encode(buffer),
            encoding: 'base64',
          }));

          const decodedMessages = await decodePresenceMessages(encodedMessages);

          for (let i = 0; i < decodedMessages.length; i++) {
            const decodedMessage = decodedMessages[i];

            expect(BufferUtils.areBuffersEqual(decodedMessage.data, buffers[i])).to.be.true;
            expect(decodedMessage.encoding).to.be.null;
          }
        });
      });

      describe('constructPresenceMessage', () => {
        it('creates a PresenceMessage instance', async () => {
          const extras = { foo: 'bar' };
          const presenceMessage = constructPresenceMessage({ extras });

          expect(presenceMessage.constructor.name).to.contain('PresenceMessage');
          expect(presenceMessage.extras).to.equal(extras);
        });
      });
    });

    describe('Transports', () => {
      describe('BaseRealtime', () => {
        describe('without a transport plugin', () => {
          it('throws an error due to absence of a transport plugin', () => {
            expect(() => new BaseRealtime(ablyClientOptions({ plugins: { FetchRequest } }))).to.throw(
              'no requested transports available',
            );
          });
        });

        for (const scenario of [
          { pluginsKey: 'WebSocketTransport', transportPlugin: WebSocketTransport, transportName: 'web_socket' },
          { pluginsKey: 'XHRPolling', transportPlugin: XHRPolling, transportName: 'xhr_polling' },
          { pluginsKey: 'XHRStreaming', transportPlugin: XHRStreaming, transportName: 'xhr_streaming' },
        ]) {
          describe(`with the ${scenario.pluginsKey} plugin`, () => {
            it(`is able to use the ${scenario.transportName} transport`, async () => {
              const realtime = new BaseRealtime(
                ablyClientOptions({
                  autoConnect: false,
                  transports: [scenario.transportName],
                  plugins: {
                    FetchRequest,
                    [scenario.pluginsKey]: scenario.transportPlugin,
                  },
                }),
              );

              let firstTransportCandidate;
              const connectionManager = realtime.connection.connectionManager;
              const originalTryATransport = connectionManager.tryATransport;
              realtime.connection.connectionManager.tryATransport = (transportParams, candidate, callback) => {
                if (!firstTransportCandidate) {
                  firstTransportCandidate = candidate;
                }
                originalTryATransport.bind(connectionManager)(transportParams, candidate, callback);
              };

              realtime.connect();

              await realtime.connection.once('connected');
              expect(firstTransportCandidate).to.equal(scenario.transportName);
            });
          });
        }
      });
    });

    describe('HTTP request implementations', () => {
      describe('with multiple HTTP request implementations', () => {
        it('prefers XHR', async () => {
          let usedXHR = false;

          const XHRRequestSpy = class XHRRequestSpy extends XHRRequest {
            static createRequest(...args) {
              usedXHR = true;
              return super.createRequest(...args);
            }
          };

          const rest = new BaseRest(ablyClientOptions({ plugins: { FetchRequest, XHRRequest: XHRRequestSpy } }));
          await rest.time();

          expect(usedXHR).to.be.true;
        });
      });
    });

    describe('MessageInteractions', () => {
      describe('BaseRealtime', () => {
        describe('without MessageInteractions', () => {
          it('is able to subscribe to and unsubscribe from channel events, as long as a MessageFilter isn’t passed', async () => {
            const realtime = new BaseRealtime(ablyClientOptions({ plugins: { WebSocketTransport, FetchRequest } }));
            const channel = realtime.channels.get('channel');
            await channel.attach();

            const subscribeReceivedMessagePromise = new Promise((resolve) => channel.subscribe(resolve));

            await channel.publish('message', 'body');

            const subscribeReceivedMessage = await subscribeReceivedMessagePromise;
            expect(subscribeReceivedMessage.data).to.equal('body');
          });

          it('throws an error when attempting to subscribe to channel events using a MessageFilter', async () => {
            const realtime = new BaseRealtime(ablyClientOptions({ plugins: { WebSocketTransport, FetchRequest } }));
            const channel = realtime.channels.get('channel');

            let thrownError = null;
            try {
              await channel.subscribe({ clientId: 'someClientId' }, () => {});
            } catch (error) {
              thrownError = error;
            }

            expect(thrownError).not.to.be.null;
            expect(thrownError.message).to.equal('MessageInteractions plugin not provided');
          });
        });

        describe('with MessageInteractions', () => {
          it('can take a MessageFilter argument when subscribing to and unsubscribing from channel events', async () => {
            const realtime = new BaseRealtime(
              ablyClientOptions({
                plugins: {
                  WebSocketTransport,
                  FetchRequest,
                  MessageInteractions,
                },
              }),
            );
            const channel = realtime.channels.get('channel');

            await channel.attach();

            // Test `subscribe` with a filter: send two messages with different clientIds, and check that unfiltered subscription receives both messages but clientId-filtered subscription only receives the matching one.
            const messageFilter = { clientId: 'someClientId' }; // note that `unsubscribe` compares filter by reference, I found that a bit surprising

            const filteredSubscriptionReceivedMessages = [];
            channel.subscribe(messageFilter, (message) => {
              filteredSubscriptionReceivedMessages.push(message);
            });

            const unfilteredSubscriptionReceivedFirstTwoMessagesPromise = new Promise((resolve) => {
              const receivedMessages = [];
              channel.subscribe(function listener(message) {
                receivedMessages.push(message);
                if (receivedMessages.length === 2) {
                  channel.unsubscribe(listener);
                  resolve();
                }
              });
            });

            await channel.publish(await decodeMessage({ clientId: 'someClientId' }));
            await channel.publish(await decodeMessage({ clientId: 'someOtherClientId' }));
            await unfilteredSubscriptionReceivedFirstTwoMessagesPromise;

            expect(filteredSubscriptionReceivedMessages.length).to.equal(1);
            expect(filteredSubscriptionReceivedMessages[0].clientId).to.equal('someClientId');

            // Test `unsubscribe` with a filter: call `unsubscribe` with the clientId filter, publish a message matching the filter, check that only the unfiltered listener recieves it
            channel.unsubscribe(messageFilter);

            const unfilteredSubscriptionReceivedNextMessagePromise = new Promise((resolve) => {
              channel.subscribe(function listener() {
                channel.unsubscribe(listener);
                resolve();
              });
            });

            await channel.publish(await decodeMessage({ clientId: 'someClientId' }));
            await unfilteredSubscriptionReceivedNextMessagePromise;

            expect(filteredSubscriptionReceivedMessages.length).to./* (still) */ equal(1);
          });
        });
      });
    });
  });
}

// This function is called by browser_setup.js once `require` is available
window.registerAblyModularTests = async () => {
  return new Promise((resolve) => {
    require(['shared_helper'], (helper) => {
      registerAblyModularTests(helper);
      resolve();
    });
  });
};
