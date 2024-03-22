'use strict';

define(['shared_helper', 'chai'], function (helper, chai) {
  var rest;
  var utils = helper.Utils;
  var expect = chai.expect;
  var restTestOnJsonMsgpack = helper.restTestOnJsonMsgpack;

  // RSL8
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
