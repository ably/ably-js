/**
 * partial-json - Parse incomplete JSON strings
 *
 * Vendored from https://github.com/promplate/partial-json-parser-js
 * MIT License - Copyright (c) 2024 promplate
 *
 * This is a recursive descent parser that takes incomplete JSON and returns
 * the best-effort parsed result. Useful for rendering streaming JSON as it
 * arrives (e.g., AI/LLM token streaming).
 */

// Allow flags to control what incomplete structures are acceptable
export const Allow = {
  STR: 0x1,
  NUM: 0x2,
  ARR: 0x4,
  OBJ: 0x8,
  NULL: 0x10,
  BOOL: 0x20,
  NAN: 0x40,
  INFINITY: 0x80,
  _INFINITY: 0x100,
  ALL:
    0x1 | 0x2 | 0x4 | 0x8 | 0x10 | 0x20 | 0x40 | 0x80 | 0x100,
} as const;

type AllowFlags = number;

class PartialJSON {
  private pos: number = 0;
  private str: string = '';

  parse(str: string, allowPartial: AllowFlags = Allow.ALL): unknown {
    if (typeof str !== 'string') {
      throw new TypeError(`expecting str, got ${typeof str}`);
    }
    if (!str.trim()) {
      throw new Error(`Unexpected end of input`);
    }
    this.str = str;
    this.pos = 0;
    return this.parseValue(allowPartial);
  }

  private parseValue(allowPartial: AllowFlags): unknown {
    this.skipWhitespace();
    if (this.pos >= this.str.length) {
      throw new Error('Unexpected end of input');
    }

    const ch = this.str[this.pos];

    if (ch === '"') return this.parseString(allowPartial);
    if (ch === '{') return this.parseObject(allowPartial);
    if (ch === '[') return this.parseArray(allowPartial);
    if (ch === '-' || (ch >= '0' && ch <= '9')) return this.parseNumber(allowPartial);
    if (ch === 't' || ch === 'f') return this.parseBoolean(allowPartial);
    if (ch === 'n') return this.parseNull(allowPartial);
    if (ch === 'N') return this.parseNaN(allowPartial);
    if (ch === 'I') return this.parseInfinity(allowPartial);

    throw new Error(`Unexpected character '${ch}' at position ${this.pos}`);
  }

  private skipWhitespace(): void {
    while (this.pos < this.str.length && ' \t\n\r'.includes(this.str[this.pos])) {
      this.pos++;
    }
  }

  private parseString(allowPartial: AllowFlags): string {
    // Skip opening quote
    this.pos++;
    let result = '';

    while (this.pos < this.str.length) {
      const ch = this.str[this.pos];

      if (ch === '\\') {
        if (this.pos + 1 >= this.str.length) {
          // Incomplete escape at end
          if (allowPartial & Allow.STR) return result;
          throw new Error('Unexpected end of input in string escape');
        }
        const next = this.str[this.pos + 1];
        this.pos += 2;
        switch (next) {
          case '"': result += '"'; break;
          case '\\': result += '\\'; break;
          case '/': result += '/'; break;
          case 'b': result += '\b'; break;
          case 'f': result += '\f'; break;
          case 'n': result += '\n'; break;
          case 'r': result += '\r'; break;
          case 't': result += '\t'; break;
          case 'u': {
            // Unicode escape: \uXXXX
            if (this.pos + 4 > this.str.length) {
              // Incomplete unicode escape
              if (allowPartial & Allow.STR) return result;
              throw new Error('Unexpected end of input in unicode escape');
            }
            const hex = this.str.substring(this.pos, this.pos + 4);
            const code = parseInt(hex, 16);
            if (isNaN(code)) {
              throw new Error(`Invalid unicode escape: \\u${hex}`);
            }
            result += String.fromCharCode(code);
            this.pos += 4;
            break;
          }
          default:
            result += next;
        }
        continue;
      }

      if (ch === '"') {
        this.pos++; // Skip closing quote
        return result;
      }

      result += ch;
      this.pos++;
    }

    // Reached end without closing quote
    if (allowPartial & Allow.STR) return result;
    throw new Error('Unexpected end of input in string');
  }

  private parseNumber(allowPartial: AllowFlags): number {
    const start = this.pos;

    if (this.str[this.pos] === '-') {
      this.pos++;
      if (this.pos >= this.str.length) {
        if (allowPartial & Allow.NUM) return 0;
        throw new Error('Unexpected end of input in number');
      }
      // Check for -Infinity
      if (this.str[this.pos] === 'I') {
        return this.parseInfinity(allowPartial, true);
      }
    }

    // Integer part
    while (this.pos < this.str.length && this.str[this.pos] >= '0' && this.str[this.pos] <= '9') {
      this.pos++;
    }

    // Decimal part
    if (this.pos < this.str.length && this.str[this.pos] === '.') {
      this.pos++;
      while (this.pos < this.str.length && this.str[this.pos] >= '0' && this.str[this.pos] <= '9') {
        this.pos++;
      }
    }

    // Exponent part
    if (this.pos < this.str.length && (this.str[this.pos] === 'e' || this.str[this.pos] === 'E')) {
      this.pos++;
      if (this.pos < this.str.length && (this.str[this.pos] === '+' || this.str[this.pos] === '-')) {
        this.pos++;
      }
      while (this.pos < this.str.length && this.str[this.pos] >= '0' && this.str[this.pos] <= '9') {
        this.pos++;
      }
    }

    const numStr = this.str.substring(start, this.pos);
    const num = Number(numStr);

    if (isNaN(num)) {
      if (allowPartial & Allow.NUM) return 0;
      throw new Error(`Invalid number: ${numStr}`);
    }

    return num;
  }

  private parseBoolean(allowPartial: AllowFlags): boolean {
    if (this.str.startsWith('true', this.pos)) {
      this.pos += 4;
      return true;
    }
    if (this.str.startsWith('false', this.pos)) {
      this.pos += 5;
      return false;
    }

    // Partial match
    if (allowPartial & Allow.BOOL) {
      if ('true'.startsWith(this.str.substring(this.pos))) {
        this.pos = this.str.length;
        return true;
      }
      if ('false'.startsWith(this.str.substring(this.pos))) {
        this.pos = this.str.length;
        return false;
      }
    }

    throw new Error(`Unexpected token at position ${this.pos}`);
  }

  private parseNull(allowPartial: AllowFlags): null {
    if (this.str.startsWith('null', this.pos)) {
      this.pos += 4;
      return null;
    }

    if (allowPartial & Allow.NULL) {
      if ('null'.startsWith(this.str.substring(this.pos))) {
        this.pos = this.str.length;
        return null;
      }
    }

    throw new Error(`Unexpected token at position ${this.pos}`);
  }

  private parseNaN(allowPartial: AllowFlags): number {
    if (this.str.startsWith('NaN', this.pos)) {
      this.pos += 3;
      return NaN;
    }

    if (allowPartial & Allow.NAN) {
      if ('NaN'.startsWith(this.str.substring(this.pos))) {
        this.pos = this.str.length;
        return NaN;
      }
    }

    throw new Error(`Unexpected token at position ${this.pos}`);
  }

  private parseInfinity(allowPartial: AllowFlags, negative: boolean = false): number {
    if (this.str.startsWith('Infinity', this.pos)) {
      this.pos += 8;
      return negative ? -Infinity : Infinity;
    }

    const flag = negative ? Allow._INFINITY : Allow.INFINITY;
    if (allowPartial & flag) {
      if ('Infinity'.startsWith(this.str.substring(this.pos))) {
        this.pos = this.str.length;
        return negative ? -Infinity : Infinity;
      }
    }

    throw new Error(`Unexpected token at position ${this.pos}`);
  }

  private parseArray(allowPartial: AllowFlags): unknown[] {
    // Skip opening bracket
    this.pos++;
    const arr: unknown[] = [];

    this.skipWhitespace();

    if (this.pos >= this.str.length) {
      if (allowPartial & Allow.ARR) return arr;
      throw new Error('Unexpected end of input in array');
    }

    if (this.str[this.pos] === ']') {
      this.pos++;
      return arr;
    }

    while (this.pos < this.str.length) {
      this.skipWhitespace();
      if (this.pos >= this.str.length) {
        if (allowPartial & Allow.ARR) return arr;
        throw new Error('Unexpected end of input in array');
      }

      try {
        const value = this.parseValue(allowPartial);
        arr.push(value);
      } catch {
        if (allowPartial & Allow.ARR) return arr;
        throw new Error('Unexpected end of input in array');
      }

      this.skipWhitespace();
      if (this.pos >= this.str.length) {
        if (allowPartial & Allow.ARR) return arr;
        throw new Error('Unexpected end of input in array');
      }

      if (this.str[this.pos] === ',') {
        this.pos++;
        continue;
      }

      if (this.str[this.pos] === ']') {
        this.pos++;
        return arr;
      }

      if (allowPartial & Allow.ARR) return arr;
      throw new Error(`Expected ',' or ']' at position ${this.pos}`);
    }

    if (allowPartial & Allow.ARR) return arr;
    throw new Error('Unexpected end of input in array');
  }

  private parseObject(allowPartial: AllowFlags): Record<string, unknown> {
    // Skip opening brace
    this.pos++;
    const obj: Record<string, unknown> = {};

    this.skipWhitespace();

    if (this.pos >= this.str.length) {
      if (allowPartial & Allow.OBJ) return obj;
      throw new Error('Unexpected end of input in object');
    }

    if (this.str[this.pos] === '}') {
      this.pos++;
      return obj;
    }

    while (this.pos < this.str.length) {
      this.skipWhitespace();
      if (this.pos >= this.str.length) {
        if (allowPartial & Allow.OBJ) return obj;
        throw new Error('Unexpected end of input in object');
      }

      if (this.str[this.pos] !== '"') {
        if (allowPartial & Allow.OBJ) return obj;
        throw new Error(`Expected '"' at position ${this.pos}`);
      }

      let key: string;
      try {
        key = this.parseString(allowPartial);
      } catch {
        if (allowPartial & Allow.OBJ) return obj;
        throw new Error('Unexpected end of input in object key');
      }

      this.skipWhitespace();
      if (this.pos >= this.str.length) {
        // Key parsed but no colon yet — partial object
        if (allowPartial & Allow.OBJ) return obj;
        throw new Error('Unexpected end of input in object');
      }

      if (this.str[this.pos] !== ':') {
        if (allowPartial & Allow.OBJ) return obj;
        throw new Error(`Expected ':' at position ${this.pos}`);
      }
      this.pos++; // Skip colon

      this.skipWhitespace();
      if (this.pos >= this.str.length) {
        // Key and colon parsed but no value — partial object
        if (allowPartial & Allow.OBJ) return obj;
        throw new Error('Unexpected end of input in object value');
      }

      let value: unknown;
      try {
        value = this.parseValue(allowPartial);
      } catch {
        if (allowPartial & Allow.OBJ) return obj;
        throw new Error('Unexpected end of input in object value');
      }

      obj[key] = value;

      this.skipWhitespace();
      if (this.pos >= this.str.length) {
        if (allowPartial & Allow.OBJ) return obj;
        throw new Error('Unexpected end of input in object');
      }

      if (this.str[this.pos] === ',') {
        this.pos++;
        continue;
      }

      if (this.str[this.pos] === '}') {
        this.pos++;
        return obj;
      }

      if (allowPartial & Allow.OBJ) return obj;
      throw new Error(`Expected ',' or '}' at position ${this.pos}`);
    }

    if (allowPartial & Allow.OBJ) return obj;
    throw new Error('Unexpected end of input in object');
  }
}

const parser = new PartialJSON();

/**
 * Parse a possibly-incomplete JSON string, returning the best-effort result.
 *
 * @param str - The (possibly incomplete) JSON string to parse
 * @param allowPartial - Bitflags controlling which partial structures are accepted (default: Allow.ALL)
 * @returns The parsed value
 */
export function parsePartialJSON(str: string, allowPartial: AllowFlags = Allow.ALL): unknown {
  return parser.parse(str, allowPartial);
}
