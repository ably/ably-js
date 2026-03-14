const SH_L_32 = (1 << 16) * (1 << 16),
  SH_R_32 = 1 / SH_L_32;

const enc = /*#__PURE__*/ new TextEncoder();
const dec = /*#__PURE__*/ new TextDecoder();

function utf8Len(s: string): number {
  return enc.encode(s).length;
}

function utf8W(v: DataView, o: number, s: string) {
  const b = enc.encode(s);
  for (let i = 0; i < b.length; i++) v.setUint8(o + i, b[i]);
}

function utf8R(v: DataView, o: number, n: number) {
  return dec.decode(v.buffer.slice(o, o + n));
}

function getInt64(v: DataView, o: number) {
  return v.getInt32(o) * SH_L_32 + v.getUint32(o + 4);
}

function getUint64(v: DataView, o: number) {
  return v.getUint32(o) * SH_L_32 + v.getUint32(o + 4);
}

function setInt64(v: DataView, o: number, val: number) {
  if (val < 0x8000000000000000) {
    v.setInt32(o, Math.floor(val * SH_R_32));
    v.setInt32(o + 4, val & -1);
  } else {
    v.setUint32(o, 0x7fffffff);
    v.setUint32(o + 4, 0x7fffffff);
  }
}

function setUint64(v: DataView, o: number, val: number) {
  if (val < 0x10000000000000000) {
    v.setUint32(o, Math.floor(val * SH_R_32));
    v.setInt32(o + 4, val & -1);
  } else {
    v.setUint32(o, 0xffffffff);
    v.setUint32(o + 4, 0xffffffff);
  }
}

function encodeableKeys(value: { [key: string]: unknown }, sparse?: boolean) {
  return Object.keys(value).filter(function (e) {
    const val = value[e],
      type = typeof val;
    return (!sparse || (val !== undefined && val !== null)) && ('function' !== type || !!(val as Date).toJSON);
  });
}

// Combined sizeof + encode: when view is null, returns size only; when view is provided, writes and returns bytes written
function sizeOrEncode(value: unknown, view: DataView | null, offset: number, sparse?: boolean): number {
  const type = typeof value;

  // Strings
  if (type === 'string') {
    const length = utf8Len(value as string);
    if (length < 0x20) {
      if (view) { view.setUint8(offset, length | 0xa0); utf8W(view, offset + 1, value as string); }
      return 1 + length;
    }
    if (length < 0x100) {
      if (view) { view.setUint8(offset, 0xd9); view.setUint8(offset + 1, length); utf8W(view, offset + 2, value as string); }
      return 2 + length;
    }
    if (length < 0x10000) {
      if (view) { view.setUint8(offset, 0xda); view.setUint16(offset + 1, length); utf8W(view, offset + 3, value as string); }
      return 3 + length;
    }
    if (length < 0x100000000) {
      if (view) { view.setUint8(offset, 0xdb); view.setUint32(offset + 1, length); utf8W(view, offset + 5, value as string); }
      return 5 + length;
    }
  }

  if (ArrayBuffer.isView && ArrayBuffer.isView(value)) {
    value = value.buffer;
  }

  // Binary
  if (value instanceof ArrayBuffer) {
    const length = value.byteLength;
    if (length < 0x100) {
      if (view) { view.setUint8(offset, 0xc4); view.setUint8(offset + 1, length); new Uint8Array(view.buffer).set(new Uint8Array(value), offset + 2); }
      return 2 + length;
    }
    if (length < 0x10000) {
      if (view) { view.setUint8(offset, 0xc5); view.setUint16(offset + 1, length); new Uint8Array(view.buffer).set(new Uint8Array(value), offset + 3); }
      return 3 + length;
    }
    if (length < 0x100000000) {
      if (view) { view.setUint8(offset, 0xc6); view.setUint32(offset + 1, length); new Uint8Array(view.buffer).set(new Uint8Array(value), offset + 5); }
      return 5 + length;
    }
  }

  if (type === 'number') {
    const num = value as number;
    // Floating point
    if (Math.floor(num) !== num) {
      if (view) { view.setUint8(offset, 0xcb); view.setFloat64(offset + 1, num); }
      return 9;
    }
    // Positive integers
    if (num >= 0) {
      if (num < 0x80) {
        if (view) view.setUint8(offset, num);
        return 1;
      }
      if (num < 0x100) {
        if (view) { view.setUint8(offset, 0xcc); view.setUint8(offset + 1, num); }
        return 2;
      }
      if (num < 0x10000) {
        if (view) { view.setUint8(offset, 0xcd); view.setUint16(offset + 1, num); }
        return 3;
      }
      if (num < 0x100000000) {
        if (view) { view.setUint8(offset, 0xce); view.setUint32(offset + 1, num); }
        return 5;
      }
      if (num < 0x10000000000000000) {
        if (view) { view.setUint8(offset, 0xcf); setUint64(view, offset + 1, num); }
        return 9;
      }
      throw new Error('Number too big 0x' + num.toString(16));
    }
    // Negative integers
    if (num >= -0x20) {
      if (view) view.setInt8(offset, num);
      return 1;
    }
    if (num >= -0x80) {
      if (view) { view.setUint8(offset, 0xd0); view.setInt8(offset + 1, num); }
      return 2;
    }
    if (num >= -0x8000) {
      if (view) { view.setUint8(offset, 0xd1); view.setInt16(offset + 1, num); }
      return 3;
    }
    if (num >= -0x80000000) {
      if (view) { view.setUint8(offset, 0xd2); view.setInt32(offset + 1, num); }
      return 5;
    }
    if (num >= -0x8000000000000000) {
      if (view) { view.setUint8(offset, 0xd3); setInt64(view, offset + 1, num); }
      return 9;
    }
    throw new Error('Number too small -0x' + (-num).toString(16).substr(1));
  }

  // undefined - use d4 (NON-STANDARD)
  if (type === 'undefined') {
    if (sparse) return 0;
    if (view) { view.setUint8(offset, 0xd4); view.setUint8(offset + 1, 0x00); view.setUint8(offset + 2, 0x00); }
    return 3;
  }

  // null
  if (value === null) {
    if (sparse) return 0;
    if (view) view.setUint8(offset, 0xc0);
    return 1;
  }

  // Boolean
  if (type === 'boolean') {
    if (view) view.setUint8(offset, value ? 0xc3 : 0xc2);
    return 1;
  }

  if ('function' === typeof (value as Date).toJSON) return sizeOrEncode((value as Date).toJSON(), view, offset, sparse);

  // Container Types
  if (type === 'object') {
    let length: number,
      size = 0;
    let keys: string[] | undefined;
    const isArray = Array.isArray(value);

    if (isArray) {
      length = (value as unknown[]).length;
    } else {
      keys = encodeableKeys(value as { [key: string]: unknown }, sparse);
      length = keys.length;
    }

    if (length < 0x10) {
      if (view) view.setUint8(offset, length | (isArray ? 0x90 : 0x80));
      size = 1;
    } else if (length < 0x10000) {
      if (view) { view.setUint8(offset, isArray ? 0xdc : 0xde); view.setUint16(offset + 1, length); }
      size = 3;
    } else if (length < 0x100000000) {
      if (view) { view.setUint8(offset, isArray ? 0xdd : 0xdf); view.setUint32(offset + 1, length); }
      size = 5;
    }

    if (isArray) {
      for (let i = 0; i < length; i++) {
        size += sizeOrEncode((value as unknown[])[i], view, offset + size, sparse);
      }
    } else if (keys) {
      for (let i = 0; i < length; i++) {
        const key = keys[i];
        size += sizeOrEncode(key, view, offset + size);
        size += sizeOrEncode((value as { [key: string]: unknown })[key], view, offset + size, sparse);
      }
    }

    return size;
  }
  if (type === 'function') return 0;

  throw new Error('Unknown type ' + type);
}

function encode(value: unknown, sparse?: boolean) {
  const size = sizeOrEncode(value, null, 0, sparse);
  if (size === 0) return undefined;
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  sizeOrEncode(value, view, 0, sparse);
  return buffer;
}

// https://gist.github.com/frsyuki/5432559 - v5 spec
//
// I've used one extension point from `fixext 1` to store `undefined`. On the wire this
// should translate to exactly 0xd40000
//
// +--------+--------+--------+
// |  0xd4  |  0x00  |  0x00  |
// +--------+--------+--------+
//    ^ fixext |        ^ value part unused (fixed to be 0)
//             ^ indicates undefined value
//

function decode(buffer: ArrayBuffer) {
  let o = 0;
  const v = new DataView(buffer);

  function map(length: number) {
    const value: { [key: string]: unknown } = {};
    for (let i = 0; i < length; i++) {
      const key = parse();
      value[key as string] = parse();
    }
    return value;
  }

  function bin(length: number) {
    const value = new ArrayBuffer(length);
    new Uint8Array(value).set(new Uint8Array(v.buffer, o, length), 0);
    o += length;
    return value;
  }

  function str(length: number) {
    const value = utf8R(v, o, length);
    o += length;
    return value;
  }

  function array(length: number) {
    const value = new Array(length);
    for (let i = 0; i < length; i++) {
      value[i] = parse();
    }
    return value;
  }

  function ext(length: number) {
    o += length;
    return { type: v.getInt8(o), data: bin(length) };
  }

  function parse(): unknown {
    const type = v.getUint8(o);
    let value, length;

    // Positive FixInt
    if ((type & 0x80) === 0x00) { o++; return type; }
    // FixMap
    if ((type & 0xf0) === 0x80) { length = type & 0x0f; o++; return map(length); }
    // FixArray
    if ((type & 0xf0) === 0x90) { length = type & 0x0f; o++; return array(length); }
    // FixStr
    if ((type & 0xe0) === 0xa0) { length = type & 0x1f; o++; return str(length); }
    // Negative FixInt
    if ((type & 0xe0) === 0xe0) { value = v.getInt8(o); o++; return value; }

    switch (type) {
      case 0xc0: o++; return null;
      case 0xc1: o++; return undefined;
      case 0xc2: o++; return false;
      case 0xc3: o++; return true;
      // bin 8/16/32
      case 0xc4: length = v.getUint8(o + 1); o += 2; return bin(length);
      case 0xc5: length = v.getUint16(o + 1); o += 3; return bin(length);
      case 0xc6: length = v.getUint32(o + 1); o += 5; return bin(length);
      // ext 8/16/32
      case 0xc7: length = v.getUint8(o + 1); o += 2; return ext(length);
      case 0xc8: length = v.getUint16(o + 1); o += 3; return ext(length);
      case 0xc9: length = v.getUint32(o + 1); o += 5; return ext(length);
      // float 32/64
      case 0xca: value = v.getFloat32(o + 1); o += 5; return value;
      case 0xcb: value = v.getFloat64(o + 1); o += 9; return value;
      // uint 8/16/32/64
      case 0xcc: value = v.getUint8(o + 1); o += 2; return value;
      case 0xcd: value = v.getUint16(o + 1); o += 3; return value;
      case 0xce: value = v.getUint32(o + 1); o += 5; return value;
      case 0xcf: value = getUint64(v, o + 1); o += 9; return value;
      // int 8/16/32/64
      case 0xd0: value = v.getInt8(o + 1); o += 2; return value;
      case 0xd1: value = v.getInt16(o + 1); o += 3; return value;
      case 0xd2: value = v.getInt32(o + 1); o += 5; return value;
      case 0xd3: value = getInt64(v, o + 1); o += 9; return value;
      // fixext 1/2/4/8/16
      case 0xd4: o++; return ext(1);
      case 0xd5: o++; return ext(2);
      case 0xd6: o++; return ext(4);
      case 0xd7: o++; return ext(8);
      case 0xd8: o++; return ext(16);
      // str 8/16/32
      case 0xd9: length = v.getUint8(o + 1); o += 2; return str(length);
      case 0xda: length = v.getUint16(o + 1); o += 3; return str(length);
      case 0xdb: length = v.getUint32(o + 1); o += 5; return str(length);
      // array 16/32
      case 0xdc: length = v.getUint16(o + 1); o += 3; return array(length);
      case 0xdd: length = v.getUint32(o + 1); o += 5; return array(length);
      // map 16/32
      case 0xde: length = v.getUint16(o + 1); o += 3; return map(length);
      case 0xdf: length = v.getUint32(o + 1); o += 5; return map(length);
    }
    throw new Error('Unknown type 0x' + type.toString(16));
  }

  const value = parse();
  if (o !== buffer.byteLength) throw new Error(buffer.byteLength - o + ' trailing bytes');
  return value;
}

export default { encode, decode };
