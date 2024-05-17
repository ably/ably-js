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
  WebSocketTransport,
  FetchRequest,
  XHRRequest,
  MessageInteractions,
} from '../../build/modular/index.mjs';

function registerAblyModularTests(helper) {
  describe.only('browser/modular', function () {
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

    describe('attempting to initialize with no client options', () => {
      for (const clientClass of [BaseRest, BaseRealtime]) {
        describe(clientClass.name, () => {
          it('throws an error', () => {
            expect(() => new clientClass()).to.throw('must be initialized with a client options object');
          });
        });
      }
    });

    describe('attempting to initialize with just an API key', () => {
      for (const clientClass of [BaseRest, BaseRealtime]) {
        describe(clientClass.name, () => {
          it('throws an error', () => {
            expect(() => new clientClass('foo:bar')).to.throw(
              'cannot be initialized with just an Ably API key; you must provide a client options object with a `plugins` property',
            );
          });
        });
      }
    });

    describe('attempting to initialize with just a token', () => {
      for (const clientClass of [BaseRest, BaseRealtime]) {
        describe(clientClass.name, () => {
          it('throws an error', () => {
            expect(() => new clientClass('foo')).to.throw(
              'cannot be initialized with just an Ably Token; you must provide a client options object with a `plugins` property',
            );
          });
        });
      }
    });

    describe('without any plugins', () => {
      for (const clientClass of [BaseRest, BaseRealtime]) {
        describe(clientClass.name, () => {
          it('throws an error due to the absence of an HTTP plugin', () => {
            expect(() => new clientClass(ablyClientOptions())).to.throw(
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
          function pad(timeSegment, three) {
            return `${timeSegment}`.padStart(three ? 3 : 2, '0');
          }

          function getHandler(logger) {
            return function (msg) {
              const time = new Date();
              logger(
                pad(time.getHours()) +
                  ':' +
                  pad(time.getMinutes()) +
                  ':' +
                  pad(time.getSeconds()) +
                  '.' +
                  pad(time.getMilliseconds(), 1) +
                  ' ' +
                  msg,
              );
            };
          }

          const rxChannel = new BaseRealtime(
            ablyClientOptions({
              logHandler: getHandler((msg) => console.log('rxChannel: ', msg)),
              logLevel: 4,
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
              logHandler: getHandler((msg) => console.log('txChannel: ', msg)),
              logLevel: 4,
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
          console.log('LAWRENCE: begin waiting for presence subscribe');
          await rxChannel.presence.subscribe('enter', resolveRxPresenceMessagePromise);
          console.log('LAWRENCE: end waiting for presence subscribe');
          console.log('LAWRENCE: begin waiting for presence enter');
          console.log('LAWRENCE: txChannel.presence.enter is', txChannel.presence.enter);
          await txChannel.presence.enter();
          console.log('LAWRENCE: end waiting for presence enter');

          console.log('LAWRENCE: begin waiting for rxPresenceMessagePromise');
          const rxPresenceMessage = await rxPresenceMessagePromise;
          console.log('LAWRENCE: end waiting for rxPresenceMessagePromise');
          expect(rxPresenceMessage.clientId).to.equal(txClientId);
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
