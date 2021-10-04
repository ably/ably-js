import Platform from "platform";

export default function inspectError(err: unknown) {
  if (err instanceof Error || (err as object)?.constructor?.name === 'ErrorInfo') return Platform.inspect(err);
  return (err as object).toString();
}
