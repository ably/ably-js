'use strict';

define(['shared_helper', 'chai'], function (helper, chai) {
  var rest;
  var utils = helper.Utils;
  var expect = chai.expect;
  var restTestOnJsonMsgpack = helper.restTestOnJsonMsgpack;

  describe('rest/status', function () {
    this.timeout(30 * 1000);

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
          return;
        }
        rest = helper.AblyRest();
        done();
      });
    });

    /**
     * @spec RSL8
     * @spec RSL8a
     * @spec CHD2a
     * @spec CHD2b
     * @spec CHS2a
     * @spec CHS2b
     * @spec CHO2a
     * @spec CHM2a
     * @spec CHM2b
     * @spec CHM2c
     * @spec CHM2d
     * @spec CHM2e
     * @spec CHM2f
     */
    restTestOnJsonMsgpack('status0', async function (rest) {
      var channel = rest.channels.get('status0');
      var channelDetails = await channel.status();
      expect(channelDetails.channelId).to.equal('status0');
      expect(channelDetails.status.isActive).to.be.a('boolean');
      var metrics = channelDetails.status.occupancy.metrics;
      expect(metrics.connections).to.be.a('number');
      expect(metrics.presenceConnections).to.be.a('number');
      expect(metrics.presenceMembers).to.be.a('number');
      expect(metrics.presenceSubscribers).to.be.a('number');
      expect(metrics.publishers).to.be.a('number');
      expect(metrics.subscribers).to.be.a('number');
    });
  });
});
