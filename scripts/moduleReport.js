const esbuild = require('esbuild');

// List of all modules accepted in ModulesMap
const moduleNames = ['Rest', 'Crypto', 'MsgPack'];

// List of all free-standing functions exported by the library along with the
// ModulesMap entries that we expect them to transitively import
const functions = [
  { name: 'generateRandomKey', transitiveImports: ['Crypto'] },
  { name: 'getDefaultCryptoParams', transitiveImports: ['Crypto'] },
  { name: 'decodeMessage', transitiveImports: [] },
  { name: 'decodeEncryptedMessage', transitiveImports: ['Crypto'] },
  { name: 'decodeMessages', transitiveImports: [] },
  { name: 'decodeEncryptedMessages', transitiveImports: ['Crypto'] },
];

function formatBytes(bytes) {
  const kibibytes = bytes / 1024;
  const formatted = kibibytes.toFixed(2);
  return `${formatted} KiB`;
}

// Gets the bundled size in bytes of an array of named exports from 'ably/modules'
function getImportSize(modules) {
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
  });

  return result.metafile.outputs[outfile].bytes;
}

const errors = [];

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
        new Error(`Adding ${transitiveImports.join(' + ')} to ${functionName} unexpectedly increases the bundle size.`)
      );
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.log(error.message);
  }
  process.exit(1);
}
