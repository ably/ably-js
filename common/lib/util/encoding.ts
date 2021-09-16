import Platform from 'platform';

export enum Format {
  msgpack = 'msgpack',
  json = 'json',
}

export function decodeBody (body: unknown, format: Format) {
  return (format == 'msgpack') ? Platform.msgpack.decode(body) : JSON.parse(String(body));
};

export function encodeBody(body: unknown, format: Format) {
  return (format == 'msgpack') ? Platform.msgpack.encode(body, true) : JSON.stringify(body);
};
