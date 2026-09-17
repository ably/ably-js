// ErrorInfo and PartialErrorInfo live in the core's runtime (packages/core/src/errorinfo.ts), so that
// there is one copy of each shared with the SDKs layered on Pub/Sub. Re-exported here so the
// implementation keeps one import path.
export { ErrorInfo as default, PartialErrorInfo } from '@ably/pubsub-core';
export type {
  IPartialErrorInfo,
  IConvertibleToErrorInfo,
  IConvertibleToPartialErrorInfo,
  ErrorInfoValues,
  PartialErrorInfoValues,
} from '@ably/pubsub-core';
