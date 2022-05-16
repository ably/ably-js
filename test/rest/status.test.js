'use strict';

define(['shared_helper', 'chai'], function (helper, chai) {
  var rest;
  var utils = helper.Utils;
  var expect = chai.expect;

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

    it('status0', function (done) {
      var channel = rest.channels.get('status0');
      channel.status(function (err, channelDetails) {
        try {
          expect(channelDetails.channelId).to.equal('status0');
          expect(channelDetails.status.isActive).to.be.a('boolean');
          var metrics = channelDetails.status.occupancy.metrics;
          expect(metrics.connections).to.be.a('number');
          expect(metrics.presenceConnections).to.be.a('number');
          expect(metrics.presenceMembers).to.be.a('number');
          expect(metrics.presenceSubscribers).to.be.a('number');
          expect(metrics.publishers).to.be.a('number');
          expect(metrics.subscribers).to.be.a('number');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    if (typeof Promise !== 'undefined') {
      it('statusPromise', function (done) {
        var rest = helper.AblyRest({ promises: true });
        var channel = rest.channels.get('statusPromise');
        channel
          .status()
          .then(function (channelDetails) {
            try {
              expect(channelDetails.channelId).to.equal('statusPromise');
              expect(channelDetails.status.isActive).to.be.a('boolean');
              var metrics = channelDetails.status.occupancy.metrics;
              expect(metrics.connections).to.be.a('number');
              expect(metrics.presenceConnections).to.be.a('number');
              expect(metrics.presenceMembers).to.be.a('number');
              expect(metrics.presenceSubscribers).to.be.a('number');
              expect(metrics.publishers).to.be.a('number');
              expect(metrics.subscribers).to.be.a('number');
              done();
            } catch (err) {
              done(err);
            }
          })
          ['catch'](function (err) {
            done(err);
          });
      });
    }
  });
});
