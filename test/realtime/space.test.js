define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, { expect }) {
  describe('realtime/space', ()=>{

    before(function (done) {
      helper.setupApp(function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    });

    describe('get', ()=>{

      it.only('should create a space if it does not exist', (done)=>{
        let realtime, err;
        try {
          realtime = helper.AblyRealtime();
          expect(realtime.spaces.spaces["test_space"]).to.equal(undefined);
          let space = realtime.spaces.get("test_space", {});
          expect(realtime.spaces.spaces["test_space"]).to.equal(space);

        }catch(e){
          err = e;
        }finally{
          helper.closeAndFinish(done, realtime, err);
        }

      });

      it('should return an existing space', (done)=>{
        let realtime, err;
        try {
          realtime = helper.AblyRealtime();
          let space1 = realtime.spaces.get("test_space", {});
          let space2 = realtime.spaces.get("test_space", {});
          expect(space1).to.equal(space2);
        }catch(e){
          err = e;
        }finally{
          helper.closeAndFinish(done, realtime, err);
        }
      });

      it('should throw an error when getting a space with no name', (done)=>{
        let realtime, err;
        try {
          realtime = helper.AblyRealtime();
          expect(realtime.spaces.get("", {})).to.not.be.ok;

        }catch(e){
          err = e;
        }finally{
          helper.closeAndFinish(done, realtime, err);
        }
      });

      it('should validate the channel name', ()=>{

      });
    });

    describe('enter', ()=>{
      it('should successfully enter the space with the provided data', ()=>{

      });

      it('should fail if invalid data is passed', ()=>{

      });

      it('should fail you try and enter a space that you are already in', ()=>{

      });
    });

    describe('leave', ()=>{
      it('should successfully leave the space', ()=>{

      });

      it('should fail if you leave a space that you have not entered', ()=>{

      });
    })
  })
});
