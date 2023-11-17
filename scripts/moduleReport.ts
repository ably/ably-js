import * as esbuild from 'esbuild';
import * as path from 'path';
import { explore } from 'source-map-explorer';

// List of all modules accepted in ModulesMap
const moduleNames = [
  'Rest',
  'Crypto',
  'MsgPack',
  'RealtimePresence',
  'XHRPolling',
  'XHRStreaming',
  'WebSocketTransport',
  'XHRRequest',
  'FetchRequest',
  'MessageInteractions',
];

// List of all free-standing functions exported by the library along with the
// ModulesMap entries that we expect them to transitively import
const functions = [
  { name: 'generateRandomKey', transitiveImports: ['Crypto'] },
  { name: 'getDefaultCryptoParams', transitiveImports: ['Crypto'] },
  { name: 'decodeMessage', transitiveImports: [] },
  { name: 'decodeEncryptedMessage', transitiveImports: ['Crypto'] },
  { name: 'decodeMessages', transitiveImports: [] },
  { name: 'decodeEncryptedMessages', transitiveImports: ['Crypto'] },
  { name: 'decodePresenceMessage', transitiveImports: [] },
  { name: 'decodePresenceMessages', transitiveImports: [] },
  { name: 'constructPresenceMessage', transitiveImports: [] },
];

function formatBytes(bytes: number) {
  const kibibytes = bytes / 1024;
  const formatted = kibibytes.toFixed(2);
  return `${formatted} KiB`;
}

interface BundleInfo {
  byteSize: number;
  code: Uint8Array;
  sourceMap: Uint8Array;
}

// Uses esbuild to create a bundle containing the named exports from 'ably/modules'
function getBundleInfo(modules: string[]): BundleInfo {
  const outfile = modules.join('');
  const result = esbuild.buildSync({
    stdin: {
      contents: `export { ${modules.join(', ')} } from './build/modules'`,
      resolveDir: '.',
    },
    metafile: true,
    minify: true,
    bundle: true,
    outfile,
    write: false,
    sourcemap: 'external',
  });

  const pathHasBase = (component: string) => {
    return (outputFile: esbuild.OutputFile) => {
      return path.parse(outputFile.path).base === component;
    };
  };

  const codeOutputFile = result.outputFiles.find(pathHasBase(outfile))!;
  const sourceMapOutputFile = result.outputFiles.find(pathHasBase(`${outfile}.map`))!;

  return {
    byteSize: result.metafile.outputs[outfile].bytes,
    code: codeOutputFile.contents,
    sourceMap: sourceMapOutputFile.contents,
  };
}

// Gets the bundled size in bytes of an array of named exports from 'ably/modules'
function getImportSize(modules: string[]) {
  const bundleInfo = getBundleInfo(modules);
  return bundleInfo.byteSize;
}

async function runSourceMapExplorer(bundleInfo: BundleInfo) {
  return explore({
    code: Buffer.from(bundleInfo.code),
    map: Buffer.from(bundleInfo.sourceMap),
  });
}

function printAndCheckModuleSizes() {
  const errors: Error[] = [];

  ['BaseRest', 'BaseRealtime'].forEach((baseClient) => {
    const baseClientSize = getImportSize([baseClient]);

    // First display the size of the base client
    console.log(`${baseClient}: ${formatBytes(baseClientSize)}`);

    // Then display the size of each export together with the base client
    [...moduleNames, ...Object.values(functions).map((functionData) => functionData.name)].forEach((exportName) => {
      const size = getImportSize([baseClient, exportName]);
      console.log(`${baseClient} + ${exportName}: ${formatBytes(size)}`);

      if (!(baseClientSize < size) && !(baseClient === 'BaseRest' && exportName === 'Rest')) {
        // Emit an error if adding the module does not increase the bundle size
        // (this means that the module is not being tree-shaken correctly).
        errors.push(new Error(`Adding ${exportName} to ${baseClient} does not increase the bundle size.`));
      }
    });
  });

  return errors;
}

function printAndCheckFunctionSizes() {
  const errors: Error[] = [];

  for (const functionData of functions) {
    const { name: functionName, transitiveImports } = functionData;

    // First display the size of the function
    const standaloneSize = getImportSize([functionName]);
    console.log(`${functionName}: ${formatBytes(standaloneSize)}`);

    // Then display the size of the function together with the modules we expect
    // it to transitively import
    if (transitiveImports.length > 0) {
      const withTransitiveImportsSize = getImportSize([functionName, ...transitiveImports]);
      console.log(`${functionName} + ${transitiveImports.join(' + ')}: ${formatBytes(withTransitiveImportsSize)}`);

      if (withTransitiveImportsSize > standaloneSize) {
        // Emit an error if the bundle size is increased by adding the modules
        // that we expect this function to have transitively imported anyway.
        // This seemed like a useful sense check, but it might need tweaking in
        // the future if we make future optimisations that mean that the
        // standalone functions don’t necessarily import the whole module.
        errors.push(
          new Error(
            `Adding ${transitiveImports.join(' + ')} to ${functionName} unexpectedly increases the bundle size.`
          )
        );
      }
    }
  }

  return errors;
}

// Performs a sense check that there are no unexpected files making a large contribution to the BaseRealtime bundle size.
async function checkBaseRealtimeFiles() {
  const baseRealtimeBundleInfo = getBundleInfo(['BaseRealtime']);
  const exploreResult = await runSourceMapExplorer(baseRealtimeBundleInfo);

  const files = exploreResult.bundles[0].files;
  delete files['[sourceMappingURL]'];
  delete files['[unmapped]'];
  delete files['[EOLs]'];

  const thresholdBytes = 100;
  const filesAboveThreshold = Object.entries(files).filter((file) => file[1].size >= thresholdBytes);

  // These are the files that are allowed to contribute >= `threshold` bytes to the BaseRealtime bundle.
  //
  // The threshold is chosen pretty arbitrarily. There are some files (e.g. presencemessage.ts) whose bulk should not be included in the BaseRealtime bundle, but which make a small contribution to the bundle (probably because we make use of one exported constant or something; I haven’t looked into it).
  const allowedFiles = new Set([
    'src/common/constants/HttpStatusCodes.ts',
    'src/common/constants/TransportName.ts',
    'src/common/constants/XHRStates.ts',
    'src/common/lib/client/auth.ts',
    'src/common/lib/client/baseclient.ts',
    'src/common/lib/client/baserealtime.ts',
    'src/common/lib/client/channelstatechange.ts',
    'src/common/lib/client/connection.ts',
    'src/common/lib/client/connectionstatechange.ts',
    'src/common/lib/client/realtimechannel.ts',
    'src/common/lib/transport/connectionerrors.ts',
    'src/common/lib/transport/connectionmanager.ts',
    'src/common/lib/transport/messagequeue.ts',
    'src/common/lib/transport/protocol.ts',
    'src/common/lib/transport/transport.ts',
    'src/common/lib/types/errorinfo.ts',
    'src/common/lib/types/message.ts',
    'src/common/lib/types/protocolmessage.ts',
    'src/common/lib/types/pushchannelsubscription.ts', // TODO why? https://github.com/ably/ably-js/issues/1506
    'src/common/lib/util/defaults.ts',
    'src/common/lib/util/eventemitter.ts',
    'src/common/lib/util/logger.ts',
    'src/common/lib/util/multicaster.ts',
    'src/common/lib/util/utils.ts',
    'src/platform/web/config.ts',
    'src/platform/web/lib/http/http.ts',
    'src/platform/web/lib/util/bufferutils.ts',
    'src/platform/web/lib/util/defaults.ts',
    'src/platform/web/lib/util/hmac-sha256.ts',
    'src/platform/web/lib/util/webstorage.ts',
    'src/platform/web/modules.ts',
  ]);

  const errors: Error[] = [];

  // Check that no files other than those allowed above make a large contribution to the bundle size
  for (const file of filesAboveThreshold) {
    if (!allowedFiles.has(file[0])) {
      errors.push(
        new Error(
          `Unexpected file ${file[0]}, contributes ${file[1].size}B to BaseRealtime, more than allowed ${thresholdBytes}B`
        )
      );
    }
  }

  // Check that there are no stale entries in the allowed list
  for (const allowedFile of Array.from(allowedFiles)) {
    const file = files[allowedFile];

    if (file) {
      if (file.size < thresholdBytes) {
        errors.push(
          new Error(
            `File ${allowedFile} contributes ${file.size}B, which is less than the expected minimum of ${thresholdBytes}B. Remove it from the \`allowedFiles\` list.`
          )
        );
      }
    } else {
      errors.push(new Error(`File ${allowedFile} is referenced in \`allowedFiles\` but does not contribute to bundle`));
    }
  }

  return errors;
}

(async function run() {
  const errors: Error[] = [];

  errors.push(...printAndCheckModuleSizes());
  errors.push(...printAndCheckFunctionSizes());
  errors.push(...(await checkBaseRealtimeFiles()));

  if (errors.length > 0) {
    for (const error of errors) {
      console.log(error.message);
    }
    process.exit(1);
  }
})();
