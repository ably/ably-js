declare module 'platform-transports' {
  type Transport = import('../lib/transport/transport').default;
  type ConnectionManager = any;
  const PlatformTransports: Array<(connectionManager: ConnectionManager) => Transport>;
  export default PlatformTransports;
}
