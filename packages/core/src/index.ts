// The runtime half of @ably/pubsub-core: the few classes that the Pub/Sub implementation in
// @ably/pubsub-device and @ably/pubsub-server shares with the SDKs layered on top of it (Chat,
// Spaces, LiveObjects). There is exactly one copy of each at runtime, here, so an error raised by
// any of those packages passes `instanceof ErrorInfo` against the class imported from any other.
export { default as ErrorInfo, PartialErrorInfo } from './errorinfo';
export type {
  IPartialErrorInfo,
  IConvertibleToErrorInfo,
  IConvertibleToPartialErrorInfo,
  ErrorInfoValues,
  PartialErrorInfoValues,
} from './errorinfo';
export { EventEmitter } from './eventemitter';
export type { EventEmitterOptions } from './eventemitter';
export type { ErrorCode } from './errorcodes';
