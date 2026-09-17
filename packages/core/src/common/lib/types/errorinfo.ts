// ErrorInfo and PartialErrorInfo live in the core's runtime (src/errorinfo.ts), so that there is one
// copy of each shared with the SDKs layered on Pub/Sub. Re-exported here so the implementation keeps
// one import path.
export { default, PartialErrorInfo } from '../../../errorinfo';
export type {
  IPartialErrorInfo,
  IConvertibleToErrorInfo,
  IConvertibleToPartialErrorInfo,
  ErrorInfoValues,
  PartialErrorInfoValues,
} from '../../../errorinfo';
