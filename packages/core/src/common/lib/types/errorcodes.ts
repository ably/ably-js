// The registered error codes are generated into the core's runtime (src/errorcodes.ts), which is
// shared with the SDKs layered on Pub/Sub. Re-exported here so the implementation keeps one import path.
export type { ErrorCode } from '../../../errorcodes';
