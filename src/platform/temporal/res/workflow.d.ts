// Type declarations for the `ably/temporal/workflow` entry point under the classic `node`/`node10`
// module resolution, which resolves this subpath by filesystem path and does not read the package
// `exports` field. Modern resolvers (`node16`, `bundler`) reach the real declarations through
// `exports`, which also provides the runtime implementation in every resolver, since Node itself
// honours `exports`.
//
// `npm run build:temporal` copies this file to `temporal/workflow.d.ts`.
export * from './cjs/workflow.js';
