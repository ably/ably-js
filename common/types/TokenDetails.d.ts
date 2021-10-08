export default interface TokenDetails {
  capability?: string;
  clientId?: string;
  expires?: number;
  issued?: number;
  token: string;
}
