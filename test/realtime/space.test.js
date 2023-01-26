define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, { expect }) {
  describe('realtime/space', () => {
    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    describe('get', () => {
      it('should create a space if it does not exist', (done) => {
        let realtime, err;
        try {
          realtime = helper.AblyRealtime();
          expect(realtime.spaces.spaces['test_space']).to.equal(undefined);
          let space = realtime.spaces.get('test_space', {});
          expect(realtime.spaces.spaces['test_space']).to.equal(space);
        } catch (e) {
          err = e;
        } finally {
          helper.closeAndFinish(done, realtime, err);
        }
      });

      it('should return an existing space', (done) => {
        let realtime, err;
        try {
          realtime = helper.AblyRealtime();
          let space1 = realtime.spaces.get('test_space', {});
          let space2 = realtime.spaces.get('test_space', {});
          expect(space1).to.equal(space2);
        } catch (e) {
          err = e;
        } finally {
          helper.closeAndFinish(done, realtime, err);
        }
      });

      it('should throw an error when getting a space with no name', (done) => {
        let realtime, err;
        try {
          realtime = helper.AblyRealtime();
          expect(() => realtime.spaces.get('', {})).to.throw();
        } catch (e) {
          err = e;
        } finally {
          helper.closeAndFinish(done, realtime, err);
        }
      });

      it('should validate the space name', (done) => {
        let realtime, err;
        try {
          realtime = helper.AblyRealtime();
          expect(() => realtime.spaces.get(false, {})).to.throw();
          expect(() => realtime.spaces.get({}, {})).to.throw();
          expect(() => realtime.spaces.get(null, {})).to.throw();
        } catch (e) {
          err = e;
        } finally {
          helper.closeAndFinish(done, realtime, err);
        }
      });
    });

    describe('enter', () => {
      it('should successfully enter the space with the provided data', (done) => {
        let realtime, err;
        try {
          realtime = helper.AblyRealtime();
          let space = realtime.spaces.get('test_space', {});

          realtime.channels.get('_ably_space_test_space').presence.subscribe('enter', (d) => {
            expect(d.data.name).to.equal('Example');
          });

          space.enter({ name: 'Example' }, (err) => {
            expect(err).to.equal(undefined);
          });
        } catch (e) {
          err = e;
        } finally {
          helper.closeAndFinish(done, realtime, err);
        }
      });

      it('should fail if invalid data is passed', (done) => {
        let realtime, err;
        try {
          realtime = helper.AblyRealtime();
          let space = realtime.spaces.get('test_space', {});

          let callback = (err) => {
            expect(err.code).to.equal(40000);
          };

          space.enter(6, callback);
          space.enter(null, callback);
          space.enter(false, callback);
          space.enter(true, callback);
        } catch (e) {
          err = e;
        } finally {
          helper.closeAndFinish(done, realtime, err);
        }
      });

      it('should fail if try and enter a space that you are already in', (done) => {
        let realtime;
        try {
          realtime = helper.AblyRealtime({ clientId: 'test' });
          let space = realtime.spaces.get('test_space', {});

          let callback = (err) => {
            expect(err && err.message).to.equal('Client has already entered the space');
            helper.closeAndFinish(done, realtime, undefined);
          };

          space.enter({}, () => setTimeout(() => space.enter({}, callback), 0));
        } catch (e) {
          helper.closeAndFinish(done, realtime, e);
        }
      });
    });

    describe('leave', () => {
      it('should successfully leave the space', (done) => {
        let realtime;
        try {
          realtime = helper.AblyRealtime({ clientId: 'test' });
          let space = realtime.spaces.get('test_space', {});

          let callback = (err) => {
            expect(err && err.message).to.equal(undefined);
            helper.closeAndFinish(done, realtime, undefined);
          };

          space.enter({}, () => setTimeout(() => space.leave(callback), 0));
        } catch (e) {
          helper.closeAndFinish(done, realtime, e);
        }
      });

      it('should fail if you leave a space that you have not entered', (done) => {
        let realtime;
        try {
          realtime = helper.AblyRealtime({ clientId: 'test' });
          let space = realtime.spaces.get('test_space', {});

          let callback = (err) => {
            expect(err && err.message).to.equal('Member not present in space, leave operation redundant');
            helper.closeAndFinish(done, realtime, undefined);
          };

          space.leave(callback);
        } catch (e) {
          helper.closeAndFinish(done, realtime, e);
        }
      });
    });
  });
});
