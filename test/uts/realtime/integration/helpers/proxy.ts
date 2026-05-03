/**
 * TypeScript helper for the Go test proxy.
 *
 * Wraps the proxy's REST control API to create sessions, add rules,
 * trigger imperative actions, retrieve event logs, and clean up.
 */

const PROXY_CONTROL_HOST = process.env.PROXY_CONTROL_HOST || 'http://localhost:9100';

const SANDBOX_REALTIME_HOST = 'sandbox-realtime.ably.io';
const SANDBOX_REST_HOST = 'sandbox-rest.ably.io';

let nextPort = 19000 + Math.floor(Math.random() * 1000);

function allocatePort(): number {
  return nextPort++;
}

interface ProxyRule {
  match: {
    type: string;
    count?: number;
    action?: string;
    channel?: string;
    method?: string;
    pathContains?: string;
    queryContains?: Record<string, string>;
    delayMs?: number;
  };
  action: {
    type: string;
    closeCode?: number;
    delayMs?: number;
    message?: Record<string, any>;
    status?: number;
    body?: Record<string, any>;
    headers?: Record<string, string>;
  };
  times?: number;
  comment?: string;
}

interface ProxyEvent {
  timestamp: string;
  type: string;
  direction?: string;
  url?: string;
  queryParams?: Record<string, string>;
  message?: any;
  method?: string;
  path?: string;
  status?: number;
  initiator?: string;
  closeCode?: number;
  ruleMatched?: string | null;
  headers?: Record<string, string>;
}

interface ImperativeAction {
  type: string;
  message?: Record<string, any>;
  closeCode?: number;
}

class ProxySession {
  readonly sessionId: string;
  readonly proxyHost: string;
  readonly proxyPort: number;
  private controlUrl: string;

  constructor(sessionId: string, proxyHost: string, proxyPort: number, controlUrl: string) {
    this.sessionId = sessionId;
    this.proxyHost = proxyHost;
    this.proxyPort = proxyPort;
    this.controlUrl = controlUrl;
  }

  async addRules(rules: ProxyRule[], position: 'append' | 'prepend' = 'append'): Promise<void> {
    const resp = await fetch(`${this.controlUrl}/sessions/${this.sessionId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules, position }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`addRules failed (${resp.status}): ${body}`);
    }
  }

  async triggerAction(action: ImperativeAction): Promise<void> {
    const resp = await fetch(`${this.controlUrl}/sessions/${this.sessionId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`triggerAction failed (${resp.status}): ${body}`);
    }
  }

  async getLog(): Promise<ProxyEvent[]> {
    const resp = await fetch(`${this.controlUrl}/sessions/${this.sessionId}/log`);
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`getLog failed (${resp.status}): ${body}`);
    }
    const data = await resp.json();
    return data.events || [];
  }

  async close(): Promise<void> {
    try {
      await fetch(`${this.controlUrl}/sessions/${this.sessionId}`, { method: 'DELETE' });
    } catch {
      // Ignore errors during cleanup
    }
  }
}

interface CreateProxySessionOpts {
  endpoint?: 'sandbox';
  port?: number;
  rules?: ProxyRule[];
  timeoutMs?: number;
}

async function createProxySession(opts: CreateProxySessionOpts = {}): Promise<ProxySession> {
  const port = opts.port || allocatePort();
  const controlUrl = PROXY_CONTROL_HOST;

  const target = {
    realtimeHost: SANDBOX_REALTIME_HOST,
    restHost: SANDBOX_REST_HOST,
  };

  const body: Record<string, any> = {
    target,
    port,
    rules: opts.rules || [],
  };
  if (opts.timeoutMs) {
    body.timeoutMs = opts.timeoutMs;
  }

  const resp = await fetch(`${controlUrl}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`createProxySession failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  return new ProxySession(data.sessionId, 'localhost', port, controlUrl);
}

async function waitForProxy(timeoutMs = 10000): Promise<void> {
  const controlUrl = PROXY_CONTROL_HOST;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(`${controlUrl}/health`);
      if (resp.ok) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Proxy not reachable at ${controlUrl} after ${timeoutMs}ms`);
}

export { ProxySession, ProxyRule, ProxyEvent, ImperativeAction, createProxySession, waitForProxy, allocatePort };
