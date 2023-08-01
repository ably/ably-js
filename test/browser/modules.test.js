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
} from '../../build/modules/index.js';

describe('browser/modules', function () {
  this.timeout(10 * 1000);
  const expect = chai.expect;
  const BufferUtils = BaseRest.Platform.BufferUtils;
  let ablyClientOptions;
  let testResourcesPath;
  let loadTestData;
  let testMessageEquality;

  before((done) => {
    ablyClientOptions = window.ablyHelpers.ablyClientOptions;
    testResourcesPath = window.ablyHelpers.testResourcesPath;
    testMessageEquality = window.ablyHelpers.testMessageEquality;

    loadTestData = async (dataPath) => {
      return new Promise((resolve, reject) => {
        window.ablyHelpers.loadTestData(dataPath, (err, testData) => (err ? reject(err) : resolve(testData)));
      });
    };

    window.ablyHelpers.setupApp(done);
  });

  describe('without any modules', () => {
    for (const clientClass of [BaseRest, BaseRealtime]) {
      describe(clientClass.name, () => {
        it('can be constructed', async () => {
          expect(() => new clientClass(ablyClientOptions(), {})).not.to.throw;
        });
      });
    }
  });

  describe('Rest', () => {
    describe('BaseRest without explicit Rest', () => {
      it('offers REST functionality', async () => {
        const client = new BaseRest(ablyClientOptions(), { Rest });
        const time = await client.time();
        expect(time).to.be.a('number');
      });
    });

    describe('BaseRealtime with Rest', () => {
      it('offers REST functionality', async () => {
        const client = new BaseRealtime(ablyClientOptions(), { Rest });
        const time = await client.time();
        expect(time).to.be.a('number');
      });
    });

    describe('BaseRealtime without Rest', () => {
      it('throws an error when attempting to use REST functionality', async () => {
        const client = new BaseRealtime(ablyClientOptions(), {});
        expect(() => client.time()).to.throw();
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

        expect(() => decodeMessage(testData.items[0].encrypted, { cipher: { key, iv } })).to.throw;
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

        expect(() =>
          decodeMessages(
            items.map((item) => item.encrypted),
            { cipher: { key, iv } }
          )
        ).to.throw;
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
      for (const clientClass of [BaseRest, BaseRealtime]) {
        describe(clientClass.name, () => {
          it('throws an error when given channel options with a cipher', async () => {
            const client = new clientClass(ablyClientOptions(), {});
            const key = await generateRandomKey();
            expect(() => client.channels.get('channel', { cipher: { key } })).to.throw;
          });
        });
      }
    });

    describe('with Crypto', () => {
      for (const clientClass of [BaseRest, BaseRealtime]) {
        describe(clientClass.name, () => {
          it('is able to publish encrypted messages', async () => {
            const clientOptions = ablyClientOptions();

            const key = await generateRandomKey();

            // Publish the message on a channel configured to use encryption, and receive it on one not configured to use encryption

            const rxClient = new BaseRealtime(clientOptions, {});
            const rxChannel = rxClient.channels.get('channel');
            await rxChannel.attach();

            const rxMessagePromise = new Promise((resolve, _) => rxChannel.subscribe((message) => resolve(message)));

            const encryptionChannelOptions = { cipher: { key } };

            const txMessage = { name: 'message', data: 'data' };
            const txClient = new clientClass(clientOptions, { Crypto });
            const txChannel = txClient.channels.get('channel', encryptionChannelOptions);
            await txChannel.publish(txMessage);

            const rxMessage = await rxMessagePromise;

            // Verify that the message was published with encryption
            expect(rxMessage.encoding).to.equal('utf-8/cipher+aes-256-cbc');

            // Verify that the message was correctly encrypted
            const rxMessageDecrypted = await decodeEncryptedMessage(rxMessage, encryptionChannelOptions);
            testMessageEquality(rxMessageDecrypted, txMessage);
          });
        });
      }
    });
  });
});
