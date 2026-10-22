/**
 * Renders an arbitrary value for inclusion in an error message.
 *
 * The SDK's platform layer renders these with `util.inspect` on Node.js, but the core's runtime
 * has no platform layer to ask, so it uses JSON everywhere. A value JSON cannot represent, such as
 * one with a cycle, falls back to `String()`, so that building an error message never throws.
 */
export function inspect(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
}

export function isNil(arg: unknown): arg is null | undefined {
  return arg == null;
}
