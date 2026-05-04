/**
 * TypeScript helper for the Go test proxy.
 *
 * Wraps the proxy's REST control API to create sessions, add rules,
 * trigger imperative actions, retrieve event logs, and clean up.
 *
 * The proxy binary is downloaded from GitHub releases on first use
 * via ensureProxy(). It is killed when the Node.js process exits.
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { pipeline } from 'stream/promises';

const PROXY_VERSION = 'v0.1.0';
const PROXY_REPO = 'ably/uts-proxy';

const CONTROL_PORT = process.env.PROXY_CONTROL_PORT || '9100';
const PROXY_CONTROL_HOST = process.env.PROXY_CONTROL_HOST || `http://localhost:${CONTROL_PORT}`;
const CACHE_DIR = path.resolve(__dirname, '../../../../../node_modules/.cache/uts-proxy', PROXY_VERSION);
const PROXY_BIN = path.join(CACHE_DIR, 'uts-proxy');

let _proxyProcess: ChildProcess | null = null;
let _proxyEnsured = false;

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

const CHECKSUMS: Record<string, string> = {
  'uts-proxy_darwin_amd64.tar.gz': 'eb8abf5eec7f7137cf9e7cb6ab6f45fd162303c242b4567ab9e354c4b9a4a4ff',
  'uts-proxy_darwin_arm64.tar.gz': '845da80af7d5b1daacbdf30b34aff6ca1b2bb88c708065bdc5d9a636baf32a1f',
  'uts-proxy_linux_amd64.tar.gz': '79f444c23362cc277d163deb243dc16063c74665ff63b8bd3e56789b9d9610c7',
  'uts-proxy_linux_arm64.tar.gz': '7357e4605f19451d83bb419ee959537d6e95ca74b766721eae006d4171371030',
};

function assetName(): string {
  const platform = process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  return `uts-proxy_${platform}_${arch}.tar.gz`;
}

async function downloadProxy(): Promise<void> {
  if (fs.existsSync(PROXY_BIN)) return;

  const asset = assetName();
  const expectedHash = CHECKSUMS[asset];
  if (!expectedHash) {
    throw new Error(`No checksum for ${asset} — unsupported platform/arch`);
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const url = `https://github.com/${PROXY_REPO}/releases/download/${PROXY_VERSION}/${asset}`;
  console.log(`Downloading uts-proxy ${PROXY_VERSION} (${asset})...`);

  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok || !resp.body) {
    throw new Error(`Failed to download ${url}: ${resp.status} ${resp.statusText}`);
  }

  const tarball = path.join(CACHE_DIR, asset);
  const fileStream = fs.createWriteStream(tarball);
  // @ts-ignore — Node fetch body is a web ReadableStream; pipeline handles it in Node 18+
  await pipeline(resp.body, fileStream);

  const hash = crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex');
  if (hash !== expectedHash) {
    fs.unlinkSync(tarball);
    throw new Error(`Checksum mismatch for ${asset}: expected ${expectedHash}, got ${hash}`);
  }

  execSync(`tar xzf ${JSON.stringify(asset)}`, { cwd: CACHE_DIR });
  fs.chmodSync(PROXY_BIN, 0o755);
  fs.unlinkSync(tarball);
}

function spawnProxy(): ChildProcess {
  const child = spawn(PROXY_BIN, ['--port', CONTROL_PORT], {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: false,
  });

  child.on('error', (err) => {
    console.error(`Proxy process error: ${err.message}`);
  });

  process.on('exit', () => {
    if (child.exitCode === null) {
      child.kill();
    }
  });

  return child;
}

async function ensureProxy(timeoutMs = 15000): Promise<void> {
  if (_proxyEnsured) return;

  // Check if proxy is already running (e.g. started externally)
  try {
    const resp = await fetch(`${PROXY_CONTROL_HOST}/health`);
    if (resp.ok) {
      _proxyEnsured = true;
      return;
    }
  } catch {
    // Not running — we'll start it
  }

  await downloadProxy();
  _proxyProcess = spawnProxy();

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(`${PROXY_CONTROL_HOST}/health`);
      if (resp.ok) {
        _proxyEnsured = true;
        return;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  _proxyProcess.kill();
  _proxyProcess = null;
  throw new Error(`Proxy failed to start within ${timeoutMs}ms`);
}

async function waitForProxy(timeoutMs = 15000): Promise<void> {
  await ensureProxy(timeoutMs);
}

function stopProxy(): void {
  if (_proxyProcess && _proxyProcess.exitCode === null) {
    _proxyProcess.kill();
    _proxyProcess = null;
  }
  _proxyEnsured = false;
}

export { ProxySession, ProxyRule, ProxyEvent, ImperativeAction, createProxySession, waitForProxy, ensureProxy, stopProxy, allocatePort };
