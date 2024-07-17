import { spawn } from 'child_process';
import { InterceptionModeDTO } from './ControlRPC';

export class MitmproxyLauncher {
  private _onMitmproxyReady: (() => void) | null = null;

  async launch(mode: InterceptionModeDTO) {
    console.log('starting mitmdump, mode', mode);

    let mitmdumpBinary: string;
    let mitmdumpMode: string | null;

    // TODO this is currently written on the assumption that darwin means running locally and linux means running in GitHub action; sort out so that you can run (locally or on CI) on (macOS or Linux)
    switch (process.platform) {
      case 'darwin':
        mitmdumpBinary = 'mitmdump';
        switch (mode.mode) {
          case 'local':
            mitmdumpMode = `local:${mode.pid}`;
            break;
          case 'proxy':
            mitmdumpMode = null;
            break;
        }
        break;
      case 'linux':
        // Currently we expect that you set up the iptables rules externally
        mitmdumpBinary = '/opt/pipx_bin/mitmdump';
        switch (mode.mode) {
          case 'local':
            mitmdumpMode = 'transparent';
            break;
          case 'proxy':
            mitmdumpMode = null;
            break;
        }
        break;
      default:
        throw new Error(`Don’t know how to set up mitmdump interception for platform ${process.platform}`);
    }

    // sounds like we don’t need to explicitly stop this when we stop the current process: https://nodejs.org/api/child_process.html#optionsdetached
    const mitmdump = spawn(mitmdumpBinary, [
      '--set',
      'stream_large_bodies=1',
      ...(mitmdumpMode === null ? [] : ['--mode', mitmdumpMode]),
      '-s',
      'test/mitmproxy_addon_2.py',
      '--set',
      // "full request URL with response status code and HTTP headers" (the default truncates the URL)
      'flow_detail=2',
    ]);

    const formatMitmdumpOutput = (source: string, data: Buffer) => {
      const text = data.toString('utf-8');
      const lines = text.split('\n');
      return lines.map((line) => `mitmdump ${source}: ${line}`).join('\n');
    };

    mitmdump.stdout.on('data', (data) => {
      console.log(formatMitmdumpOutput('stdout', data));
    });

    mitmdump.stderr.on('data', (data) => {
      console.log(formatMitmdumpOutput('stderr', data));
    });

    console.log(`Waiting for mitmdump to start`);

    let resolveResult: () => void;
    const result = new Promise<{}>((resolve) => {
      resolveResult = () => resolve({});
    });

    this._onMitmproxyReady = () => {
      this._onMitmproxyReady = null;
      console.log(`mitmdump has started`);
      resolveResult();
    };

    return result;
  }

  onMitmproxyReady() {
    this._onMitmproxyReady?.();
  }
}
