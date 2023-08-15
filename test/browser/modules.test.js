import {
  BaseRest,
  BaseRealtime,
  Rest,
  generateRandomKey,
  getDefaultCryptoParams,
  decodeMessage,
  decodeMessages,
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
    describe('decodeMessage', () => {
      it('decodes a message’s data', async () => {
        const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');

        const item = testData.items[1];
        const decoded = await decodeMessage(item.encoded);

        expect(decoded.data).to.be.an('ArrayBuffer');
      });

      it('decrypts a message', async () => {
        const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');

        const key = BufferUtils.base64Decode(testData.key);
        const iv = BufferUtils.base64Decode(testData.iv);

        for (const item of testData.items) {
          const [decodedFromEncoded, decodedFromEncrypted] = await Promise.all([
            decodeMessage(item.encoded),
            decodeMessage(item.encrypted, { cipher: { key, iv } }),
          ]);

          testMessageEquality(decodedFromEncoded, decodedFromEncrypted);
        }
      });
    });

    describe('decodeMessages', () => {
      it('decodes messages’ data', async () => {
        const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');

        const items = [testData.items[1], testData.items[3]];
        const decoded = await decodeMessages(items.map((item) => item.encoded));

        expect(decoded[0].data).to.be.an('ArrayBuffer');
        expect(decoded[1].data).to.be.an('array');
      });

      it('decrypts messages', async () => {
        const testData = await loadTestData(testResourcesPath + 'crypto-data-128.json');

        const key = BufferUtils.base64Decode(testData.key);
        const iv = BufferUtils.base64Decode(testData.iv);

        const [decodedFromEncoded, decodedFromEncrypted] = await Promise.all([
          decodeMessages(testData.items.map((item) => item.encoded)),
          decodeMessages(
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
});
