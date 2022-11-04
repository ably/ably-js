'use strict';

define(['ably', 'shared_helper', 'chai'], function (Ably, helper, chai) {
  var rest;
  var expect = chai.expect;

  describe('rest/http/fetch', function(){
    this.timeout(60 * 1000);
    before(function (done) {
      Ably.Rest.Platform.Config.xhrSupported = false;
      Ably.Rest.Platform.Config.jsonpSupported = false;
      helper.setupApp(function () {
        rest = helper.AblyRest({
          agents: {
            'custom-agent': '0.1.2',
          },
        });
        done();
      });
    });

    after((done)=>{
      Ably.Rest.Platform.Config.xhrSupported = window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest();
      Ably.Rest.Platform.Config.jsonpSupported = typeof document !== 'undefined';
      done();
    });

    it('Should use fetch when XHR and JSONP are not supported', function(done){
      let oldFetch = window.fetch;
      window.fetch = ()=>{
        done();
        window.fetch = oldFetch;
      };
      const channel = rest.channels.get('http_test_channel');
      channel.publish('test', 'Testing fetch support');
    });

    it('Should succeed in using fetch to publish a message', function(done){
      const channel = rest.channels.get('http_test_channel');
      channel.publish('test', 'Testing fetch support', (err)=>{
        expect(err).to.not.exist;
        done();
      });
    });

    it('Should pass errors correctly', function(done){
      const channel = rest.channels.get('');
      channel.publish('test', 'Invalid message', (err)=>{
        expect(err).to.exist;
        done();
      });
    });
  });
});
