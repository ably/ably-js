export default interface TokenRequest {
  capability: string;
  clientId?: string;
  keyName: string;
  mac: string;
  nonce: string;
  timestamp: number;
  ttl?: number;
}
