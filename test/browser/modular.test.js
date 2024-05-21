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

    async function monitorConnectionThenCloseAndFinish(action, realtime, states) {
      try {
        await helper.monitorConnectionAsync(action, realtime, states);
      } finally {
        await helper.closeAndFinishAsync(realtime);
      }
    }

    before((done) => {
      helper.setupApp(done);
    });

    describe('Rest', () => {
      const restScenarios = [
        {
          description: 'use push admin functionality',
          action: (client) => client.push.admin.publish({ clientId: 'foo' }, { data: { bar: 'baz' } }),
        },
      ];

      describe('BaseRest without explicit Rest', () => {
        for (const scenario of restScenarios) {
          it(`allows you to ${scenario.description}`, async () => {
            const client = new BaseRest(
              ablyClientOptions({ ...scenario.getAdditionalClientOptions?.(), plugins: { FetchRequest }, tls: false }),
            );

            let thrownError = null;
            try {
              await scenario.action(client);
            } catch (error) {
              console.log('thrownError:', error, 'stack', error.stack);
              thrownError = error;
            }

            expect(thrownError).to.be.null;
          });
        }
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
