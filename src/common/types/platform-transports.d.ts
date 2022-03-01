declare module 'platform-transports' {
  type Transport = import('../lib/transport/transport').default;
  type ConnectionManager = import('../lib/transport/connectionmanager').default;
  const PlatformTransports: Array<(connectionManager: typeof ConnectionManager) => Transport>;
  export default PlatformTransports;
}
