import { BaseClient, Rest } from '../../build/modules/index.js';

describe('browser/modules', function () {
  this.timeout(10 * 1000);
  let key;

  before(function (done) {
    window.ablyHelpers.setupApp(function () {
      key = window.AblyTestApp.keys[0].keyStr;
      done();
    });
  });

  it('baseclient_with_rest', async function () {
    const client = new BaseClient({ key }, { Rest });
    const time = await client.time();
    if (typeof time !== 'number') {
      throw new Error('client.time returned wrong type');
    }
  });

  it('baseclient_without_rest', function (done) {
    const client = new BaseClient({ key }, {});
    try {
      client.time();
    } catch (err) {
      done();
      return;
    }
    done(new Error('Expected client.time to throw'));
  });
});
