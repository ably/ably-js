// The declarations TypeScript sees for `@ably/pubsub-core-impl/platform`, in place of the
// implementation's own sources, which compile only under the implementation's tsconfig.
//
// Deliberately opaque: the platform entry points export the client classes, which no public
// declaration describes, so ../core-clients.ts and ../core-exports.ts cast this to the shape they
// read from it, confining the cast to those two modules.
declare const platform: unknown;

export default platform;
