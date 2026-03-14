const SH_L_32 = (1 << 16) * (1 << 16),
  SH_R_32 = 1 / SH_L_32,
  U8 = Uint8Array,
  AB = ArrayBuffer;

const enc = /*#__PURE__*/ new TextEncoder();
const dec = /*#__PURE__*/ new TextDecoder();

function utf8B(s: string): Uint8Array {
  return enc.encode(s);
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

function set64(v: DataView, o: number, val: number, limit: number, hi: number, lo: number) {
  if (val < limit) {
    v.setUint32(o, Math.floor(val * SH_R_32));
    v.setInt32(o + 4, val & -1);
  } else {
    v.setUint32(o, hi);
    v.setUint32(o + 4, lo);
  }
}

function encodeableKeys(value: { [key: string]: unknown }, sparse?: boolean) {
  return Object.keys(value).filter(function (e) {
    const val = value[e],
      type = typeof val;
    return (!sparse || (val !== undefined && val !== null)) && ('function' !== type || !!(val as Date).toJSON);
  });
}

// Write tag + length header. Returns header byte count.
function wHdr(v: DataView | null, o: number, tag: number, len: number, sz: 1 | 2 | 4): number {
  if (v) {
    v.setUint8(o, tag);
    if (sz === 1) v.setUint8(o + 1, len);
    else if (sz === 2) v.setUint16(o + 1, len);
    else v.setUint32(o + 1, len);
  }
  return 1 + sz;
}

// Pick header for length-prefixed types (3 tags for 8/16/32-bit length)
function pickHdr(v: DataView | null, o: number, len: number, t8: number, t16: number, t32: number): number {
  if (len < 0x100) return wHdr(v, o, t8, len, 1);
  if (len < 0x10000) return wHdr(v, o, t16, len, 2);
  if (len < 0x100000000) return wHdr(v, o, t32, len, 4);
  return 0;
}

// Write tag + typed value
function wNum(v: DataView, o: number, tag: number, setter: 'setUint8' | 'setUint16' | 'setUint32' | 'setInt8' | 'setInt16' | 'setInt32' | 'setFloat64', val: number) {
  v.setUint8(o, tag);
  v[setter](o + 1, val);
}

function sizeOrEncode(value: unknown, view: DataView | null, offset: number, sparse?: boolean): number {
  const type = typeof value;

  if (type === 'string') {
    const b = utf8B(value as string), length = b.length;
    if (length < 0x20) {
      if (view) { view.setUint8(offset, length | 0xa0); new U8(view.buffer).set(b, offset + 1); }
      return 1 + length;
    }
    const hdr = pickHdr(view, offset, length, 0xd9, 0xda, 0xdb);
    if (!hdr) return 0;
    if (view) new U8(view.buffer).set(b, offset + hdr);
    return hdr + length;
  }

  if (AB.isView && AB.isView(value)) {
    value = (value as ArrayBufferView).buffer;
  }

  if (value instanceof AB) {
    const length = value.byteLength;
    const hdr = pickHdr(view, offset, length, 0xc4, 0xc5, 0xc6);
    if (!hdr) return 0;
    if (view) new U8(view.buffer).set(new U8(value), offset + hdr);
    return hdr + length;
  }

  if (type === 'number') {
    const num = value as number;
    if (Math.floor(num) !== num) {
      if (view) wNum(view, offset, 0xcb, 'setFloat64', num);
      return 9;
    }
    if (num >= 0) {
      if (num < 0x80) { if (view) view.setUint8(offset, num); return 1; }
      if (num < 0x100) { if (view) wNum(view, offset, 0xcc, 'setUint8', num); return 2; }
      if (num < 0x10000) { if (view) wNum(view, offset, 0xcd, 'setUint16', num); return 3; }
      if (num < 0x100000000) { if (view) wNum(view, offset, 0xce, 'setUint32', num); return 5; }
      if (num < 0x10000000000000000) {
        if (view) { view.setUint8(offset, 0xcf); set64(view, offset + 1, num, 0x10000000000000000, 0xffffffff, 0xffffffff); }
        return 9;
      }
      throw new Error('Number too big 0x' + num.toString(16));
    }
    if (num >= -0x20) { if (view) view.setInt8(offset, num); return 1; }
    if (num >= -0x80) { if (view) wNum(view, offset, 0xd0, 'setInt8', num); return 2; }
    if (num >= -0x8000) { if (view) wNum(view, offset, 0xd1, 'setInt16', num); return 3; }
    if (num >= -0x80000000) { if (view) wNum(view, offset, 0xd2, 'setInt32', num); return 5; }
    if (num >= -0x8000000000000000) {
      if (view) { view.setUint8(offset, 0xd3); set64(view, offset + 1, num, 0x8000000000000000, 0x7fffffff, 0x7fffffff); }
      return 9;
    }
    throw new Error('Number too small -0x' + (-num).toString(16).substr(1));
  }

  if (type === 'undefined') {
    if (sparse) return 0;
    if (view) { view.setUint8(offset, 0xd4); view.setUint8(offset + 1, 0x00); view.setUint8(offset + 2, 0x00); }
    return 3;
  }

  if (value === null) {
    if (sparse) return 0;
    if (view) view.setUint8(offset, 0xc0);
    return 1;
  }

  if (type === 'boolean') {
    if (view) view.setUint8(offset, value ? 0xc3 : 0xc2);
    return 1;
  }

  if ('function' === typeof (value as Date).toJSON) return sizeOrEncode((value as Date).toJSON(), view, offset, sparse);

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
      size = wHdr(view, offset, isArray ? 0xdc : 0xde, length, 2);
    } else if (length < 0x100000000) {
      size = wHdr(view, offset, isArray ? 0xdd : 0xdf, length, 4);
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
  const buffer = new AB(size);
  const view = new DataView(buffer);
  sizeOrEncode(value, view, 0, sparse);
  return buffer;
}

const fixextSz = [1, 2, 4, 8, 16];

function decode(buffer: ArrayBuffer) {
  let o = 0;
  const v = new DataView(buffer);

  type Getter = 'getUint8' | 'getUint16' | 'getUint32' | 'getInt8' | 'getInt16' | 'getInt32';
  function rd(getter: Getter, adv: number): number {
    const val = v[getter](o + 1);
    o += adv;
    return val;
  }

  function map(length: number) {
    const value: { [key: string]: unknown } = {};
    for (let i = 0; i < length; i++) {
      const key = parse();
      value[key as string] = parse();
    }
    return value;
  }

  function bin(length: number) {
    const value = new AB(length);
    new U8(value).set(new U8(v.buffer, o, length), 0);
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
    const t = v.getUint8(o);
    let val;

    if (!(t & 0x80)) { o++; return t; }
    if ((t & 0xf0) === 0x80) { o++; return map(t & 0x0f); }
    if ((t & 0xf0) === 0x90) { o++; return array(t & 0x0f); }
    if ((t & 0xe0) === 0xa0) { o++; return str(t & 0x1f); }
    if ((t & 0xe0) === 0xe0) { val = v.getInt8(o); o++; return val; }

    if (t >= 0xd4 && t <= 0xd8) { o++; return ext(fixextSz[t - 0xd4]); }

    switch (t) {
      case 0xc0: o++; return null;
      case 0xc1: o++; return undefined;
      case 0xc2: o++; return false;
      case 0xc3: o++; return true;
      case 0xc4: return bin(rd('getUint8', 2));
      case 0xc5: return bin(rd('getUint16', 3));
      case 0xc6: return bin(rd('getUint32', 5));
      case 0xc7: return ext(rd('getUint8', 2));
      case 0xc8: return ext(rd('getUint16', 3));
      case 0xc9: return ext(rd('getUint32', 5));
      case 0xca: val = v.getFloat32(o + 1); o += 5; return val;
      case 0xcb: val = v.getFloat64(o + 1); o += 9; return val;
      case 0xcc: return rd('getUint8', 2);
      case 0xcd: return rd('getUint16', 3);
      case 0xce: return rd('getUint32', 5);
      case 0xcf: val = getUint64(v, o + 1); o += 9; return val;
      case 0xd0: return rd('getInt8', 2);
      case 0xd1: return rd('getInt16', 3);
      case 0xd2: return rd('getInt32', 5);
      case 0xd3: val = getInt64(v, o + 1); o += 9; return val;
      case 0xd9: return str(rd('getUint8', 2));
      case 0xda: return str(rd('getUint16', 3));
      case 0xdb: return str(rd('getUint32', 5));
      case 0xdc: return array(rd('getUint16', 3));
      case 0xdd: return array(rd('getUint32', 5));
      case 0xde: return map(rd('getUint16', 3));
      case 0xdf: return map(rd('getUint32', 5));
    }
    throw new Error('Unknown type 0x' + t.toString(16));
  }

  const value = parse();
  if (o !== buffer.byteLength) throw new Error(buffer.byteLength - o + ' trailing bytes');
  return value;
}

export default { encode, decode };
