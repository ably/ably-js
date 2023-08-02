import { BaseRest, BaseRealtime } from '../../build/modules/index.js';

describe('browser/modules', function () {
  this.timeout(10 * 1000);
  const expect = chai.expect;
  let ablyClientOptions;

  before((done) => {
    ablyClientOptions = window.ablyHelpers.ablyClientOptions;
    window.ablyHelpers.setupApp(done);
  });

  describe('without any modules', () => {
    for (const clientClass of [BaseRest, BaseRealtime]) {
      it(clientClass.name, async () => {
        const client = new clientClass(ablyClientOptions());
        const time = await client.time();
        expect(time).to.be.a('number');
      });
    }
  });
});
