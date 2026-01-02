'use strict';

define(['chai', 'ably'], function (chai, Ably) {
  const { expect } = chai;
  const msgpack = Ably.Realtime._MsgPack;

  describe('msgpack.encode()', function () {
    it('should handle emoji in strings', function () {
      const emoji = '😅🎉🚀';
      const encoded = msgpack.encode(emoji);
      expect(encoded).deep.to.equal(new Uint8Array([172, 240, 159, 152, 133, 240, 159, 142, 137, 240, 159, 154, 128]));
    });

    it('should handle special characters in strings', function () {
      const special = 'Hello\n\t\r"World"';
      const encoded = msgpack.encode(special);
      expect(encoded).deep.to.equal(
        new Uint8Array([175, 72, 101, 108, 108, 111, 10, 9, 13, 34, 87, 111, 114, 108, 100, 34]),
      );
    });

    it('should handle sparse encoding mode', function () {
      // In sparse mode, undefined and null are omitted from objects
      const obj = { a: 1, b: undefined, c: null, d: 2 };
      const encoded = msgpack.encode(obj, true);
      const decoded = msgpack.decode(encoded);
      // When sparse, undefined/null values are not encoded
      expect(decoded).to.not.have.property('b');
      expect(decoded).to.not.have.property('c');
      expect(decoded).to.have.property('a', 1);
      expect(decoded).to.have.property('d', 2);
    });
  });
});
