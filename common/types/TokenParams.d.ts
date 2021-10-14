type CapabilityOp = "publish" | "subscribe" | "presence" | "history" | "stats" | "channel-metadata" | "push-subscribe" | "push-admin";

export default interface TokenParams {
  capability: { [key: string]: CapabilityOp[]; } | string;
  clientId?: string | null;
  nonce?: string;
  timestamp?: number;
  ttl: number;
}
