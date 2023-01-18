define(['ably', 'shared_helper', 'async', 'chai'], function (Ably, helper, async, chai) {
  describe('realtime/space', ()=>{

    describe('get', ()=>{
      it('should create a space if it does not exist', ()=>{

      });

      it('should return an existing space', ()=>{

      });

      it('should throw an error when getting a space with no name', ()=>{

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
