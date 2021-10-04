import Platform from 'platform';

export enum Format {
  msgpack = 'msgpack',
  json = 'json',
}

export function decodeBody<T>(body: unknown, format?: Format | null): T {
	return (format == 'msgpack') ? Platform.msgpack.decode(body as Buffer) : JSON.parse(String(body));
}

export function encodeBody(body: unknown, format: Format) {
  return (format == 'msgpack') ? Platform.msgpack.encode(body, true) : JSON.stringify(body);
};
