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
} from '../../build/modules/index.js';

describe('browser/modules', function () {
  this.timeout(10 * 1000);
  const expect = chai.expect;
  const BufferUtils = BaseRest.Platform.BufferUtils;
  let ablyClientOptions;
  let testResourcesPath;
  let loadTestData;
  let testMessageEquality;
  let randomString;

  before((done) => {
    ablyClientOptions = window.ablyHelpers.ablyClientOptions;
    testResourcesPath = window.ablyHelpers.testResourcesPath;
    testMessageEquality = window.ablyHelpers.testMessageEquality;
    randomString = window.ablyHelpers.randomString;

    loadTestData = async (dataPath) => {
      return new Promise((resolve, reject) => {
        window.ablyHelpers.loadTestData(dataPath, (err, testData) => (err ? reject(err) : resolve(testData)));
      });
    };

    window.ablyHelpers.setupApp(done);
  });

  describe('without any modules', () => {
    describe('BaseRest', () => {
      it('can be constructed', () => {
        expect(() => new BaseRest(ablyClientOptions(), {})).not.to.throw();
      });
    });

    describe('BaseRealtime', () => {
      it('throws an error due to absence of a transport module', () => {
        expect(() => new BaseRealtime(ablyClientOptions(), {})).to.throw('no requested transports available');
      });
    });
  });

  describe('Rest', () => {
    describe('BaseRest without explicit Rest', () => {
      it('offers REST functionality', async () => {
        const client = new BaseRest(ablyClientOptions(), {});
        const time = await client.time();
        expect(time).to.be.a('number');
      });
    });

    describe('BaseRealtime with Rest', () => {
      it('offers REST functionality', async () => {
        const client = new BaseRealtime(ablyClientOptions(), { WebSocketTransport, Rest });
        const time = await client.time();
        expect(time).to.be.a('number');
      });
    });

    describe('BaseRealtime without Rest', () => {
      it('throws an error when attempting to use REST functionality', async () => {
        const client = new BaseRealtime(ablyClientOptions(), { WebSocketTransport });
        expect(() => client.time()).to.throw('Rest module not provided');
      });
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
        expect(thrownError.message).to.equal('Crypto module not provided');
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
            { cipher: { key, iv } }
          );
        } catch (error) {
          thrownError = error;
        }

        expect(thrownError).not.to.be.null;
        expect(thrownError.message).to.equal('Crypto module not provided');
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
            { cipher: { key, iv } }
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
          ablyClientOptions(),
          clientClassConfig.additionalModules ?? {}
        );
        const key = await generateRandomKey();
        expect(() => client.channels.get('channel', { cipher: { key } })).to.throw('Crypto module not provided');
      }

      for (const clientClassConfig of [
        { clientClass: BaseRest },
        { clientClass: BaseRealtime, additionalModules: { WebSocketTransport } },
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

        const rxClient = new BaseRealtime(clientOptions, { WebSocketTransport });
        const rxChannel = rxClient.channels.get('channel');
        await rxChannel.attach();

        const rxMessagePromise = new Promise((resolve, _) => rxChannel.subscribe((message) => resolve(message)));

        const encryptionChannelOptions = { cipher: { key } };

        const txMessage = { name: 'message', data: 'data' };
        const txClient = new clientClassConfig.clientClass(clientOptions, {
          ...(clientClassConfig.additionalModules ?? {}),
          Crypto,
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
        { clientClass: BaseRealtime, additionalModules: { WebSocketTransport } },
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
        rest.http.do = (method, client, path, headers, body, params, callback) => {
          if (!(method == 'post' && path == `/channels/${channelName}/messages`)) {
            return;
          }
          resolve(headers['content-type']);
          callback(null);
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
            const client = new BaseRest(ablyClientOptions({ useBinaryProtocol: true }), {});
            await testRestUsesContentType(client, 'application/json');
          });
        });

        describe('BaseRealtime', () => {
          it('uses JSON', async () => {
            const client = new BaseRealtime(ablyClientOptions({ useBinaryProtocol: true, autoConnect: false }), {
              WebSocketTransport,
            });
            await testRealtimeUsesFormat(client, 'json');
          });
        });
      });

      describe('with MsgPack', () => {
        describe('BaseRest', () => {
          it('uses MessagePack', async () => {
            const client = new BaseRest(ablyClientOptions({ useBinaryProtocol: true }), {
              MsgPack,
            });
            await testRestUsesContentType(client, 'application/x-msgpack');
          });
        });

        describe('BaseRealtime', () => {
          it('uses MessagePack', async () => {
            const client = new BaseRealtime(ablyClientOptions({ useBinaryProtocol: true, autoConnect: false }), {
              WebSocketTransport,
              MsgPack,
            });
            await testRealtimeUsesFormat(client, 'msgpack');
          });
        });
      });
    });
  });

  describe('RealtimePresence', () => {
    describe('BaseRealtime without RealtimePresence', () => {
      it('throws an error when attempting to access the `presence` property', () => {
        const client = new BaseRealtime(ablyClientOptions(), { WebSocketTransport });
        const channel = client.channels.get('channel');

        expect(() => channel.presence).to.throw('RealtimePresence module not provided');
      });
    });

    describe('BaseRealtime with RealtimePresence', () => {
      it('offers realtime presence functionality', async () => {
        const rxChannel = new BaseRealtime(ablyClientOptions(), { WebSocketTransport, RealtimePresence }).channels.get(
          'channel'
        );
        const txClientId = randomString();
        const txChannel = new BaseRealtime(ablyClientOptions({ clientId: txClientId }), {
          WebSocketTransport,
          RealtimePresence,
        }).channels.get('channel');

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
      for (const scenario of [
        { moduleMapKey: 'WebSocketTransport', transportModule: WebSocketTransport, transportName: 'web_socket' },
        { moduleMapKey: 'XHRPolling', transportModule: XHRPolling, transportName: 'xhr_polling' },
        { moduleMapKey: 'XHRStreaming', transportModule: XHRStreaming, transportName: 'xhr_streaming' },
      ]) {
        describe(`with the ${scenario.moduleMapKey} module`, () => {
          it(`is able to use the ${scenario.transportName} transport`, async () => {
            const realtime = new BaseRealtime(
              ablyClientOptions({ autoConnect: false, transports: [scenario.transportName] }),
              {
                [scenario.moduleMapKey]: scenario.transportModule,
              }
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
});
